import { NextResponse } from "next/server";
import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { fileUris, questionCount = 5, topic = "Qualquer assunto abordado no texto" } = body;

        if (!fileUris || !Array.isArray(fileUris) || fileUris.length === 0) {
            return NextResponse.json({ error: "At least one file URI is required in the fileUris array" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const responseSchema: Schema = {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    id: { type: SchemaType.STRING },
                    text: { type: SchemaType.STRING },
                    options: {
                        type: SchemaType.ARRAY,
                        items: {
                            type: SchemaType.OBJECT,
                            properties: {
                                id: { type: SchemaType.STRING },
                                letter: { type: SchemaType.STRING },
                                text: { type: SchemaType.STRING },
                                isCorrect: { type: SchemaType.BOOLEAN },
                                explanation: { type: SchemaType.STRING },
                            },
                        },
                    },
                },
            },
        };

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const prompt = `Baseando-se estritamente nos documentos anexados, gere ${questionCount} questões de múltipla escolha para um simulado de concurso.
    O foco principal das questões deve ser sobre o seguinte assunto/tópico: "${topic}". Se o tópico for amplo ou não especificado, aborde o conteúdo geral dos documentos de forma equilibrada.
    Retorne as questões conforme o schema especificado.`;

        const fileParts = fileUris.map(uri => ({ fileData: { mimeType: "application/pdf", fileUri: uri } }));

        const result = await model.generateContent([
            ...fileParts,
            { text: prompt }
        ]);

        const text = result.response.text();
        // Parse JSON (Structured Outputs guarantee it's raw JSON)
        const questions = JSON.parse(text);

        return NextResponse.json({ questions });
    } catch (error) {
        console.error("Generate Exam error:", error);
        return NextResponse.json({ error: "Failed to generate exam" }, { status: 500 });
    }
}
