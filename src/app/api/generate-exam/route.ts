import { NextResponse } from "next/server";
import { streamObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { trackTokenUsage } from "@/lib/tokenTracking";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { generateExamInputSchema, formatZodErrors } from "@/lib/validations";
import type { DocumentoRecord, AIFilePart } from "@/types";

export async function POST(request: Request) {
    try {
        const rateLimitResponse = await applyRateLimit(request, "generate-exam", RATE_LIMITS.ai);
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const parsed = generateExamInputSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: formatZodErrors(parsed.error) },
                { status: 400 }
            );
        }

        const { documentIds, tempDocs, questionCount, topic, difficulty } = parsed.data;

        const difficultyInstructions: Record<string, string> = {
            facil: "Nível FÁCIL: Gere questões diretas e conceituais. Foque em definições, conceitos básicos e informações explícitas no texto. As alternativas incorretas devem ser claramente distintas da correta. Evite pegadinhas.",
            medio: "Nível MÉDIO: Gere questões que exijam interpretação e compreensão do conteúdo. Inclua questões que relacionem conceitos diferentes do texto. As alternativas incorretas podem ser parecidas com a correta mas com diferenças sutis.",
            dificil: "Nível DIFÍCIL: Gere questões complexas que exijam análise profunda e pensamento crítico. Inclua questões com pegadinhas, exceções à regra, e situações que exigem aplicar o conhecimento em contextos novos. As alternativas devem ser muito próximas entre si para testar compreensão detalhada.",
        };

        const difficultyPrompt = difficultyInstructions[difficulty] || difficultyInstructions.medio;

        if (documentIds.length === 0 && tempDocs.length === 0) {
            return NextResponse.json({ error: "At least one document is required" }, { status: 400 });
        }

        // Consulta o banco apenas se houver IDs de documentos da biblioteca
        let docs: DocumentoRecord[] = [];
        if (documentIds.length > 0) {
            docs = await prisma.documento.findMany({
                where: {
                    id: { in: documentIds },
                    usuarioId: session.user.id
                }
            });
        }

        let apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 500 });
        }

        // Remove literal quotes and trim whitespace that might be left by bun/dotenv parser
        apiKey = apiKey.replace(/^["']|["']$/g, '').trim();

        console.log(`[DEBUG] GEMINI_API_KEY length: ${apiKey.length}, starts with: ${apiKey.substring(0, 4)}`);

        const googleProvider = createGoogleGenerativeAI({ apiKey });
        const fileManager = new GoogleAIFileManager(apiKey);

        /** Baixa o buffer de um documento do Supabase dado sua URL/caminho armazenado */
        async function downloadFromSupabase(doc: DocumentoRecord): Promise<Buffer | null> {
            if (!doc.url) return null;
            try {
                let storagePath = doc.url;
                if (doc.url.startsWith("http")) {
                    const match = doc.url.match(/\/documentos\/(.+)$/);
                    storagePath = match ? match[1] : "";
                    if (!storagePath) return null;
                }
                const { data, error } = await supabaseAdmin.storage.from("documentos").download(storagePath);
                if (data && !error) return Buffer.from(await data.arrayBuffer());
                console.error(`Supabase download error for doc ${doc.id}:`, error);
                return null;
            } catch (e) {
                console.error(`Failed to download doc ${doc.id} from Supabase:`, e);
                return null;
            }
        }

        /** Re-envia um buffer ao Gemini File Manager e persiste a nova URI no banco */
        async function reuploadToGemini(doc: DocumentoRecord, buffer: Buffer, mimeType: string): Promise<string | null> {
            const tmpPath = path.join(os.tmpdir(), `${randomUUID()}_${doc.titulo || "file"}.pdf`);
            try {
                await writeFile(tmpPath, buffer);
                const result = await fileManager.uploadFile(tmpPath, { mimeType, displayName: doc.titulo || doc.id });
                const newUri = result.file.uri;
                // Atualiza o banco para que gerações futuras usem a URI atualizada diretamente
                await prisma.documento.update({ where: { id: doc.id }, data: { geminiUri: newUri } });
                console.log(`Re-uploaded doc ${doc.id} to Gemini: ${newUri}`);
                return newUri;
            } catch (e) {
                console.error(`Failed to re-upload doc ${doc.id} to Gemini:`, e);
                return null;
            } finally {
                await unlink(tmpPath).catch(() => { });
            }
        }

        const rawFileParts = await Promise.all(docs.map(async (doc): Promise<AIFilePart | null> => {
            const mimeType = (doc.mimeType || "application/pdf") as string;

            // Prioridade 1: Valida que a geminiUri ainda está ativa antes de usá-la
            if (doc.geminiUri) {
                try {
                    const fileId = doc.geminiUri.split("/files/")[1];
                    if (fileId) await fileManager.getFile(fileId); // throws if expired/missing
                    return { type: "file" as const, data: new URL(doc.geminiUri), mediaType: mimeType };
                } catch (e: unknown) {
                    const errorStr = String(e);
                    const errorObj = e as { statusCode?: number; status?: number };
                    const is403 = errorObj?.statusCode === 403 || errorObj?.status === 403 || errorStr.includes("403") || errorStr.includes("PERMISSION_DENIED");
                    if (is403) {
                        console.warn(`GeminiUri expired for doc ${doc.id}. Clearing and falling back to Supabase.`);
                        // Limpa a URI obsoleta do banco
                        await prisma.documento.update({ where: { id: doc.id }, data: { geminiUri: null } }).catch(() => { });
                    } else {
                        console.warn(`GeminiUri check failed for doc ${doc.id}:`, e);
                    }
                    // Prossegue para o Supabase
                }
            }

            // Prioridade 2: Baixa do Supabase e reenvia ao Gemini para velocidade futura
            const buffer = await downloadFromSupabase(doc);
            if (buffer) {
                const mime = doc.mimeType || "application/pdf";
                // Tenta reenviar para que da próxima vez seja rápido novamente
                const newUri = await reuploadToGemini(doc, buffer, mime);
                if (newUri) {
                    return { type: "file" as const, data: new URL(newUri), mediaType: mime };
                }
                // Se o reenvio falhou, passa o buffer diretamente
                return { type: "file" as const, data: buffer, mediaType: mime };
            }

            console.warn(`Doc ${doc.id} has no accessible content. Skipping.`);
            return null;
        }));

        // Anexa documentos temporários (enviados diretamente ao Gemini, sem registro no banco)
        const tempFileParts: (AIFilePart | null)[] = tempDocs.map((td) => {
            try {
                return { type: "file" as const, data: new URL(td.geminiUri), mediaType: "application/pdf" };
            } catch {
                console.warn('Invalid tempDoc URI, skipping:', td.geminiUri);
                return null;
            }
        });

        const fileParts = [...rawFileParts, ...tempFileParts].filter((part): part is AIFilePart => part !== null);

        // Melhoria 3: Falha rápida se nenhum documento válido pôde ser carregado
        if (fileParts.length === 0) {
            return NextResponse.json({ error: "Nenhum documento acessível encontrado. Verifique se os arquivos foram carregados corretamente." }, { status: 400 });
        }


        const result = streamObject({
            model: googleProvider("gemini-2.5-flash"),
            schema: z.object({
                questions: z.array(
                    z.object({
                        id: z.string(),
                        text: z.string(),
                        options: z.array(
                            z.object({
                                id: z.string(),
                                letter: z.string(),
                                text: z.string(),
                                isCorrect: z.boolean(),
                                explanation: z.string().optional(),
                            })
                        ),
                    })
                ),
            }),
            system: `Baseando-se estritamente nos documentos anexados, gere questões de múltipla escolha para um simulado de concurso. Você é um estruturador de JSON. CADA QUESTÃO DEVE TER EXATAMENTE 5 OPÇÕES (A, B, C, D, E). ${difficultyPrompt} REGRAS OBRIGATÓRIAS PARA AS ALTERNATIVAS: (1) DISTRIBUIÇÃO DA CORRETA — distribua aleatória e uniformemente a alternativa correta entre A, B, C, D e E ao longo de todo o simulado; NUNCA concentre as corretas em B, C ou D; (2) TAMANHO DAS ALTERNATIVAS — todas as 5 alternativas de uma mesma questão devem ter comprimento muito similar (diferença máxima de ~20% em palavras); a alternativa correta NÃO pode ser visivelmente mais longa ou detalhada que as incorretas; elabore as incorretas para equalizar o tamanho se necessário; (3) CAPITALIZAÇÃO — dentro de cada questão, padronize maiúsculas e minúsculas em todas as alternativas de forma consistente; não misture estilos de capitalização entre opções da mesma questão.`,
            messages: [
                {
                    role: "user" as const,
                    content: [
                        { type: "text" as const, text: `Assunto foco: "${topic}". Quantidade desejada: ${questionCount}. Dificuldade: ${difficulty.toUpperCase()}. Baseie as perguntas no material fornecido. Obrigações: (1) exatamente 5 alternativas (A, B, C, D, E) por questão com apenas 1 correta; (2) alternativas corretas bem distribuídas entre A, B, C, D e E — não concentre em B, C ou D; (3) todas as alternativas de cada questão devem ter tamanho de texto parecido — a correta não pode ser a mais longa; (4) capitalize todas as alternativas da mesma questão de forma idêntica e consistente.` },
                        { type: "text" as const, text: "Material de Estudo:" },
                        ...fileParts
                    ]
                }
            ],
            temperature: 0.2, // Mantém a resposta descritiva porém concisa e lógica para questões
            onFinish: async ({ usage }) => {
                // Propriedades de token do Vercel AI SDK corrigidas
                const inputTokens = usage.inputTokens ?? 0;
                const outputTokens = usage.outputTokens ?? 0;
                const totalTokens = usage.totalTokens ?? 0;

                const inputCost = (inputTokens / 1000000) * 0.30;
                const outputCost = (outputTokens / 1000000) * 2.50;
                const totalCost = inputCost + outputCost;

                console.log(`\n📊 [TOKEN USAGE & COST - Gerar Simulado]`);
                console.log(`Input Tokens: ${inputTokens} ($${inputCost.toFixed(6)})`);
                console.log(`Output Tokens: ${outputTokens} ($${outputCost.toFixed(6)})`);
                console.log(`Total Tokens: ${totalTokens}`);
                console.log(`Estimated Cost: $${totalCost.toFixed(6)} USD`);

                await trackTokenUsage({
                    usuarioId: session.user.id,
                    modelo: "gemini-2.5-flash",
                    operation: 'generate_exam',
                    inputTokens,
                    outputTokens,
                    totalTokens,
                });
            }
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error("Generate Exam error:", error);
        return NextResponse.json({ error: "Failed to generate exam" }, { status: 500 });
    }
}
