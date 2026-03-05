import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { trackTokenUsage } from "@/lib/tokenTracking";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const body = await request.json();
        const { questions, userAnswers, correctCount, totalQuestions, dificuldade = "medio" } = body;

        if (!questions || !userAnswers) {
            return new Response(JSON.stringify({ error: "Missing exam data" }), { status: 400 });
        }

        // Constrói o resumo por questão para o prompt
        const questionSummary = (questions as any[]).map((q: any, idx: number) => {
            const chosenId = userAnswers[q.id];
            const chosenOption = q.options.find((o: any) => o.id === chosenId);
            const correctOption = q.options.find((o: any) => o.isCorrect);
            const isCorrect = chosenOption?.isCorrect ?? false;

            return `Q${idx + 1}: ${q.text}
  Resposta do usuário: ${chosenOption ? `${chosenOption.letter}) ${chosenOption.text}` : "(não respondida)"}
  Resposta correta: ${correctOption ? `${correctOption.letter}) ${correctOption.text}` : "N/A"}
  Resultado: ${isCorrect ? "✅ Correta" : chosenOption ? "❌ Errada" : "⚠️ Ignorada"}`;
        }).join("\n\n");

        const dificuldadeMap: Record<string, string> = {
            facil: "Fácil", medio: "Médio", dificil: "Difícil"
        };

        const prompt = `Você é um tutor especialista em concursos públicos e aprendizado personalizado. Analise o desempenho do aluno neste simulado e gere um relatório motivador, claro e construtivo.

**Dados do Simulado:**
- Nível: ${dificuldadeMap[dificuldade] || "Médio"}
- Nota: ${((correctCount / totalQuestions) * 10).toFixed(2)} / 10.00
- Acertos: ${correctCount}/${totalQuestions} (${Math.round((correctCount / totalQuestions) * 100)}%)

**Detalhamento por Questão:**
${questionSummary}

---

Gere agora o relatório completo seguindo EXATAMENTE esta estrutura (use markdown com emojis leves, bullet points e negrito):

## 📊 Resumo Geral
Uma frase motivacional de abertura baseada no desempenho real.

## 💪 Pontos Fortes
- Top 3 temas/habilidades onde o aluno se saiu melhor (com base nas respostas certas)
- Padrões positivos observados

## ⚠️ Pontos a Melhorar
- Top 3 temas com maior taxa de erro
- Liste as questões erradas mais relevantes (máx 8), mostrando:
  - Número da questão + assunto principal
  - O que o aluno respondeu vs. resposta correta
  - Explicação curta do erro mais comum

## 📚 Recomendações de Estudo
- 3 a 5 sugestões práticas e específicas em ordem de prioridade (alta → baixa)
- Foco sugerido para o próximo simulado

Limite: 500–600 palavras. Tom: amigável, motivador e construtivo (nunca julgador). Use linguagem clara e objetiva.`;

        const result = streamText({
            model: google("gemini-2.5-flash"),
            prompt,
            onFinish: async ({ usage }) => {
                const inputTokens = usage.inputTokens ?? 0;
                const outputTokens = usage.outputTokens ?? 0;
                const totalTokens = usage.totalTokens ?? 0;

                await trackTokenUsage({
                    usuarioId: session.user.id,
                    modelo: "gemini-2.5-flash",
                    operation: 'analyze_exam',
                    inputTokens,
                    outputTokens,
                    totalTokens,
                });
            }
        });

        return result.toTextStreamResponse();

    } catch (error) {
        console.error("Analyze exam error:", error);
        return new Response(JSON.stringify({ error: "Failed to analyze exam" }), { status: 500 });
    }
}
