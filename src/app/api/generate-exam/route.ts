import { NextResponse } from "next/server";
import { streamObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { fileUris, questionCount = 5, topic = "Qualquer assunto abordado no texto", difficulty = "medio" } = body;

        const difficultyInstructions: Record<string, string> = {
            facil: "Nível FÁCIL: Gere questões diretas e conceituais. Foque em definições, conceitos básicos e informações explícitas no texto. As alternativas incorretas devem ser claramente distintas da correta. Evite pegadinhas.",
            medio: "Nível MÉDIO: Gere questões que exijam interpretação e compreensão do conteúdo. Inclua questões que relacionem conceitos diferentes do texto. As alternativas incorretas podem ser parecidas com a correta mas com diferenças sutis.",
            dificil: "Nível DIFÍCIL: Gere questões complexas que exijam análise profunda e pensamento crítico. Inclua questões com pegadinhas, exceções à regra, e situações que exigem aplicar o conhecimento em contextos novos. As alternativas devem ser muito próximas entre si para testar compreensão detalhada.",
        };

        const difficultyPrompt = difficultyInstructions[difficulty] || difficultyInstructions.medio;

        if (!fileUris || !Array.isArray(fileUris) || fileUris.length === 0) {
            return NextResponse.json({ error: "At least one file URI is required in the fileUris array" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 500 });
        }

        const googleProvider = createGoogleGenerativeAI({
            apiKey: apiKey,
        });

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
            system: `Baseando-se estritamente nos documentos anexados, gere questões de múltipla escolha para um simulado de concurso. Você é um estruturador de JSON. CADA QUESTÃO DEVE TER EXATAMENTE 5 OPÇÕES (A, B, C, D, E). ${difficultyPrompt}`,
            messages: [
                {
                    role: "user" as const,
                    content: [
                        { type: "text" as const, text: `Assunto foco: "${topic}". Quantidade desejada: ${questionCount}. Dificuldade: ${difficulty.toUpperCase()}. Baseie as perguntas no material fornecido. Lembre-se: é OBRIGATÓRIO fornecer 5 alternativas (A, B, C, D, E) para cada questão, sendo apenas 1 correta.` },
                        { type: "text" as const, text: "Material de Estudo:" },
                        ...fileUris.map(uri => {
                            return {
                                type: "file" as const,
                                data: new URL(uri),
                                mediaType: "application/pdf"
                            }
                        })
                    ]
                }
            ],
            temperature: 0.2, // Mantém a resposta descritiva porém concisa e lógica para questões
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error("Generate Exam error:", error);
        return NextResponse.json({ error: "Failed to generate exam" }, { status: 500 });
    }
}
