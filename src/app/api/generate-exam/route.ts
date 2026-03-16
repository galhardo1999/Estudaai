import { NextResponse } from "next/server";
import { streamObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { trackTokenUsage } from "@/lib/tokenTracking";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { generateExamInputSchema, formatZodErrors } from "@/lib/validations";
import { resolveDocumentFileParts } from "@/lib/gemini-documents";
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

        const googleProvider = createGoogleGenerativeAI({ apiKey });
        const fileManager = new GoogleAIFileManager(apiKey);

        // Resolve documentos da biblioteca em file parts usando módulo compartilhado
        const libraryFileParts = await resolveDocumentFileParts(docs, fileManager);

        // Anexa documentos temporários (enviados diretamente ao Gemini, sem registro no banco)
        const tempFileParts: (AIFilePart | null)[] = tempDocs.map((td) => {
            try {
                return { type: "file" as const, data: new URL(td.geminiUri), mediaType: "application/pdf" };
            } catch {
                console.warn('Invalid tempDoc URI, skipping:', td.geminiUri);
                return null;
            }
        });

        const fileParts = [...libraryFileParts, ...tempFileParts.filter((part): part is AIFilePart => part !== null)];

        // Falha rápida se nenhum documento válido pôde ser carregado
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
