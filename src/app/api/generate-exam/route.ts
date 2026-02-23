import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { fileUri, questionCount = 5, topic = "Qualquer assunto abordado no texto" } = body;

        if (!fileUri) return NextResponse.json({ error: "File URI is required" }, { status: 400 });

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Baseando-se estritamente no documento anexado, gere ${questionCount} questões de múltipla escolha para um simulado de concurso.
    O foco principal das questões deve ser sobre o seguinte assunto/tópico: "${topic}". Se o tópico for amplo ou não especificado, aborde o conteúdo geral do documento de forma equilibrada.
    Formato de saída: retorne APENAS um array JSON válido contendo objetos, onde cada objeto possui EXACTAMENTE a seguinte estrutura:
    [
      {
        "id": "uma-string-unica",
        "text": "O texto da pergunta aqui?",
        "options": [
          { "id": "opt1", "letter": "A", "text": "Alternativa 1", "isCorrect": true, "explanation": "Breve justificativa do porquê está correta (apenas se for a correta)" },
          { "id": "opt2", "letter": "B", "text": "Alternativa 2", "isCorrect": false },
          { "id": "opt3", "letter": "C", "text": "Alternativa 3", "isCorrect": false },
          { "id": "opt4", "letter": "D", "text": "Alternativa 4", "isCorrect": false }
        ]
      }
    ]
    Não inclua markdown \`\`\`json no texto e não invente dados fora do documento. 
    CERTIFIQUE-SE DE QUE O JSON ESTÁ BEM FORMATADO E VÁLIDO. TODAS AS CHAVES E VALORES DE STRING DEVEM USAR ASPAS DUPLAS.`;

        const result = await model.generateContent([
            { fileData: { mimeType: "application/pdf", fileUri } },
            { text: prompt }
        ]);

        const text = result.response.text();
        // Parse JSON
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error("Failed to parse Gemini output as JSON array.");
        }

        const questions = JSON.parse(jsonMatch[0]);

        return NextResponse.json({ questions });
    } catch (error) {
        console.error("Generate Exam error:", error);
        return NextResponse.json({ error: "Failed to generate exam" }, { status: 500 });
    }
}
