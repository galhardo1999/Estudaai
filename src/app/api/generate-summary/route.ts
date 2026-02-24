import { NextResponse } from "next/server";
import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { fileUris, summaryType = "resumo" } = body;

        if (!fileUris || !Array.isArray(fileUris) || fileUris.length === 0) {
            return NextResponse.json({ error: "At least one file URI is required" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
        }

        const googleProvider = createGoogleGenerativeAI({ apiKey });

        const systemPrompts: Record<string, string> = {
            resumo: `Você é um professor especialista em criar resumos de estudo. Analise o material fornecido e gere um resumo estruturado em markdown com:
- Um título principal
- Seções organizadas por tema
- Listas de pontos-chave (bullet points)
- **Negrito** para conceitos importantes
- Um bloco final de "Pontos para Revisão" com os tópicos mais críticos
Seja claro, didático e direto. Escreva em Português do Brasil.`,
            flashcards: `Você é um especialista em técnicas de memorização. Analise o material fornecido e gere uma lista de flashcards (cartões de estudo) em markdown com o formato:

## Cartão 1
**Pergunta:** [Pergunta clara e objetiva]
**Resposta:** [Resposta concisa]

---

Crie entre 10 e 20 cartões cobrindo os conceitos mais importantes. Escreva em Português do Brasil.`
        };

        const result = streamText({
            model: googleProvider("gemini-2.5-flash"),
            system: systemPrompts[summaryType] || systemPrompts.resumo,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Analise o seguinte material de estudo e gere o conteúdo solicitado:"
                        },
                        ...fileUris.map((uri: string) => ({
                            type: "file" as const,
                            data: new URL(uri),
                            mediaType: "application/pdf",
                        })),
                    ],
                },
            ],
            temperature: 0.3,
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error("Generate Summary error:", error);
        return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
    }
}
