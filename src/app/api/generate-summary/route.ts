import { NextResponse } from "next/server";
import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { trackTokenUsage } from "@/lib/tokenTracking";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { generateSummaryInputSchema, formatZodErrors } from "@/lib/validations";
import { resolveDocumentFileParts } from "@/lib/gemini-documents";

export async function POST(request: Request) {
    try {
        const rateLimitResponse = await applyRateLimit(request, "generate-summary", RATE_LIMITS.ai);
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const parsed = generateSummaryInputSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: formatZodErrors(parsed.error) },
                { status: 400 }
            );
        }

        const { documentIds, summaryType } = parsed.data;

        const docs = await prisma.documento.findMany({
            where: {
                id: { in: documentIds },
                usuarioId: session.user.id
            }
        });

        if (docs.length === 0) {
            return NextResponse.json({ error: "No valid documents found or unauthorized" }, { status: 403 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
        }

        const googleProvider = createGoogleGenerativeAI({ apiKey });
        const fileManager = new GoogleAIFileManager(apiKey);

        // Resolve documentos usando módulo compartilhado
        const fileParts = await resolveDocumentFileParts(docs, fileManager);

        if (fileParts.length === 0) {
            return NextResponse.json({ error: "Nenhum documento acessível encontrado." }, { status: 400 });
        }

        const systemPrompts: Record<string, string> = {
            resumo: `Você é um professor especialista em criar resumos de estudo para estudantes e profissionais. Analise o material fornecido (que pode ser um artigo, relatório, livro ou qualquer documento) e gere um resumo estruturado em Markdown. Mantenha o resumo conciso (idealmente 10-20% do tamanho original), objetivo e fiel ao conteúdo original, sem adicionar interpretações pessoais ou informações externas. Foque em clareza, didática e simplicidade, usando linguagem acessível em Português do Brasil.

                    Estrutura obrigatória:
                    - **Título Principal**: Um título resumido e atrativo que capture a essência do documento.
                    - **Introdução Breve**: Um parágrafo curto (2-4 frases) contextualizando o tema principal, objetivos e escopo do documento.
                    - **Seções Organizadas por Tema**: Divida em subtítulos baseados na estrutura lógica do documento (ex: seções como "Conceitos Básicos", "Metodologia" ou "Conclusões"). Use listas de pontos-chave (bullet points) para destacar ideias principais.
                    - Use **negrito** para conceitos, termos ou definições importantes.
                    - Inclua exemplos ou evidências chave do texto, se relevantes.
                    - Se o documento for técnico, adicione tabelas simples em Markdown para dados ou comparações.
                    - **Pontos para Revisão**: Uma seção final com 5-10 tópicos críticos em bullet points. Para cada um, adicione uma pergunta de reflexão ou exercício breve (ex: "O que é X? Explique em suas palavras.") para reforçar o aprendizado.

                    Se o documento for muito curto ou simples, adapte a estrutura para evitar redundâncias. Seja direto: evite repetições e priorize o que é essencial para estudo ou revisão.
                    Seja claro, didático e direto. Escreva em Português do Brasil.`,



            flashcards: `Você é um especialista em técnicas de memorização, como active recall e spaced repetition. Analise o material fornecido (que pode ser um artigo, livro, relatório ou qualquer texto) e gere uma lista de flashcards em Markdown. Mantenha os cartões concisos, objetivos e fiéis ao conteúdo original, sem adicionar informações externas ou opiniões pessoais. Foque em cobrir os conceitos mais importantes, priorizando hierarquia lógica (do básico ao avançado) e variedade para melhor retenção: inclua formatos como pergunta/resposta simples, múltipla escolha, fill-in-the-blank ou associações.

                        Estrutura obrigatória:
                        - **Título Inicial**: Um cabeçalho como "## Flashcards para [Tema Principal do Material]" para contextualizar.
                        - **Cartões Individuais**: Crie entre 10 e 30 cartões (ajuste com base no tamanho do material: menos para textos curtos, mais para extensos). Use o formato abaixo para cada um, variando os tipos para engajamento:
                        ## Cartão [Número]
                        **Pergunta:** [Pergunta clara, objetiva e que promova recall ativo, ex: "O que é X?" ou "Preencha: A capital de Y é _____."]
                        **Resposta:** [Resposta concisa, com no máximo 300 palavras. Para múltipla escolha, liste opções e destaque a correta em **negrito**. Inclua dica de memorização opcional, ex: "Mnemônico: ZYX."]
                        ----
                        - **Seção Final de Dicas**: Adicione uma seção "## Dicas de Estudo" com 3-5 sugestões breves para usar os flashcards (ex: "Revise diariamente com spaced repetition").

                        Seja didático: evite repetições, cubra temas chave de forma equilibrada e garanta que as perguntas incentivem o pensamento crítico. Escreva em Português do Brasil, usando linguagem simples e acessível.`
        };

        let result;
        try {
            result = streamText({
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
                            ...fileParts
                        ],
                    },
                ],
                temperature: 0.3,
                onFinish: async ({ usage }) => {
                    const inputTokens = usage.inputTokens ?? 0;
                    const outputTokens = usage.outputTokens ?? 0;
                    const totalTokens = usage.totalTokens ?? 0;

                    const inputCost = (inputTokens / 1000000) * 0.30;
                    const outputCost = (outputTokens / 1000000) * 2.50;
                    const totalCost = inputCost + outputCost;

                    const typeName = summaryType === 'flashcards' ? 'Flashcards' : 'Resumo';
                    console.log(`\n📊 [TOKEN USAGE & COST - Gerar ${typeName}]`);
                    console.log(`Input Tokens: ${inputTokens} ($${inputCost.toFixed(6)})`);
                    console.log(`Output Tokens: ${outputTokens} ($${outputCost.toFixed(6)})`);
                    console.log(`Total Tokens: ${totalTokens}`);
                    console.log(`Estimated Cost: $${totalCost.toFixed(6)} USD`);

                    await trackTokenUsage({
                        usuarioId: session.user.id,
                        modelo: "gemini-2.5-flash",
                        operation: summaryType === 'flashcards' ? 'generate_flashcards' : 'generate_resumo',
                        inputTokens,
                        outputTokens,
                        totalTokens,
                    });
                }
            });

            return result.toTextStreamResponse();
        } catch (apiError: unknown) {
            console.error("Gemini API Error details:", apiError);
            const msg = (apiError instanceof Error) ? apiError.message : "Failed to call Gemini API";
            return NextResponse.json({ error: msg }, { status: 400 });
        }
    } catch (error) {
        console.error("Generate Summary error:", error);
        return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
    }
}
