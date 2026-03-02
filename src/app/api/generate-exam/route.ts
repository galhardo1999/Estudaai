import { NextResponse } from "next/server";
import { streamObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { z } from "zod";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { trackTokenUsage } from "@/lib/tokenTracking";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            documentIds = [],
            tempDocs = [], // { geminiUri: string, name: string }[] — uploaded directly to Gemini, not in DB
            questionCount = 5,
            topic = "Qualquer assunto abordado no texto",
            difficulty = "medio"
        } = body;

        const difficultyInstructions: Record<string, string> = {
            facil: "Nível FÁCIL: Gere questões diretas e conceituais. Foque em definições, conceitos básicos e informações explícitas no texto. As alternativas incorretas devem ser claramente distintas da correta. Evite pegadinhas.",
            medio: "Nível MÉDIO: Gere questões que exijam interpretação e compreensão do conteúdo. Inclua questões que relacionem conceitos diferentes do texto. As alternativas incorretas podem ser parecidas com a correta mas com diferenças sutis.",
            dificil: "Nível DIFÍCIL: Gere questões complexas que exijam análise profunda e pensamento crítico. Inclua questões com pegadinhas, exceções à regra, e situações que exigem aplicar o conhecimento em contextos novos. As alternativas devem ser muito próximas entre si para testar compreensão detalhada.",
        };

        const difficultyPrompt = difficultyInstructions[difficulty] || difficultyInstructions.medio;

        if (documentIds.length === 0 && tempDocs.length === 0) {
            return NextResponse.json({ error: "At least one document is required" }, { status: 400 });
        }

        // Only query DB if there are library document IDs
        let docs: any[] = [];
        if (documentIds.length > 0) {
            docs = await prisma.documento.findMany({
                where: {
                    id: { in: documentIds },
                    usuarioId: session.user.id
                }
            });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 500 });
        }

        const googleProvider = createGoogleGenerativeAI({ apiKey });
        const fileManager = new GoogleAIFileManager(apiKey);

        /** Download a doc buffer from Supabase given its stored URL/path */
        async function downloadFromSupabase(doc: any): Promise<Buffer | null> {
            if (!doc.url) return null;
            try {
                let storagePath = doc.url;
                if (doc.url.startsWith("http")) {
                    const match = doc.url.match(/\/documentos\/(.+)$/);
                    storagePath = match ? match[1] : null;
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

        /** Re-upload a buffer to Gemini File Manager and persist the new URI in the DB */
        async function reuploadToGemini(doc: any, buffer: Buffer, mimeType: string): Promise<string | null> {
            const tmpPath = path.join(os.tmpdir(), `${randomUUID()}_${doc.titulo || "file"}.pdf`);
            try {
                await writeFile(tmpPath, buffer);
                const result = await fileManager.uploadFile(tmpPath, { mimeType, displayName: doc.titulo || doc.id });
                const newUri = result.file.uri;
                // Update DB so future generations use the fresh URI directly
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

        const rawFileParts = await Promise.all(docs.map(async (doc: any) => {
            const mimeType = (doc.descricao || "application/pdf") as string;

            // Priority 1: Validate that geminiUri is still alive before using it
            if (doc.geminiUri) {
                try {
                    const fileId = doc.geminiUri.split("/files/")[1];
                    if (fileId) await fileManager.getFile(fileId); // throws if expired/missing
                    return { type: "file" as const, data: new URL(doc.geminiUri), mediaType: mimeType };
                } catch (e: any) {
                    const is403 = e?.statusCode === 403 || e?.status === 403 || String(e).includes("403") || String(e).includes("PERMISSION_DENIED");
                    if (is403) {
                        console.warn(`GeminiUri expired for doc ${doc.id}. Clearing and falling back to Supabase.`);
                        // Clear stale URI from DB
                        await prisma.documento.update({ where: { id: doc.id }, data: { geminiUri: null } }).catch(() => { });
                    } else {
                        console.warn(`GeminiUri check failed for doc ${doc.id}:`, e);
                    }
                    // Fall through to Supabase
                }
            }

            // Priority 2: Download from Supabase then re-upload to Gemini for future speed
            const buffer = await downloadFromSupabase(doc);
            if (buffer) {
                const mime = doc.descricao || "application/pdf";
                // Try to re-upload so next time it's fast again
                const newUri = await reuploadToGemini(doc, buffer, mime);
                if (newUri) {
                    return { type: "file" as const, data: new URL(newUri), mediaType: mime };
                }
                // If re-upload failed, pass the buffer directly
                return { type: "file" as const, data: buffer, mediaType: mime };
            }

            console.warn(`Doc ${doc.id} has no accessible content. Skipping.`);
            return null;
        }));

        // Append temp docs (uploaded directly to Gemini, no DB record)
        const tempFileParts = tempDocs.map((td: unknown) => {
            if (!td || typeof td !== 'object' || !('geminiUri' in td) || typeof (td as any).geminiUri !== 'string') {
                console.warn('Invalid tempDoc entry, skipping:', td);
                return null;
            }
            try {
                return { type: "file" as const, data: new URL((td as { geminiUri: string }).geminiUri), mediaType: "application/pdf" };
            } catch {
                return null;
            }
        });

        const fileParts = [...rawFileParts, ...tempFileParts].filter(part => part !== null);

        // Improvement 3: Fail fast if no valid documents could be loaded
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
                // Fixed Vercel AI SDK token properties 
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
