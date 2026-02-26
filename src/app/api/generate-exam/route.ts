import { NextResponse } from "next/server";
import { streamObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";

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

        const googleProvider = createGoogleGenerativeAI({
            apiKey: apiKey,
        });

        const rawFileParts = await Promise.all(docs.map(async (doc: any) => {
            // Priority 1: Use geminiUri (fastest — file already at Google servers)
            if (doc.geminiUri) {
                try {
                    return {
                        type: "file" as const,
                        data: new URL(doc.geminiUri),
                        mediaType: (doc.descricao || "application/pdf") as string
                    };
                } catch {
                    console.warn(`Invalid geminiUri for doc ${doc.id}, falling back to Supabase`);
                }
            }

            // Priority 2: Download from Supabase (fallback for docs without geminiUri)
            if (doc.url) {
                try {
                    let storagePath = doc.url;

                    // Legacy: old public Supabase URLs — extract storagePath from the URL
                    if (doc.url.startsWith("http")) {
                        const match = doc.url.match(/\/documentos\/(.+)$/);
                        if (match) {
                            storagePath = match[1]; // e.g. "userId/timestamp_filename.pdf"
                        } else {
                            // Truly external URL — attempt direct fetch
                            const res = await fetch(doc.url, { signal: AbortSignal.timeout(10000) });
                            if (res.ok) {
                                const buffer = await res.arrayBuffer();
                                return { type: "file" as const, data: buffer, mediaType: "application/pdf" };
                            }
                            storagePath = null as any;
                        }
                    }

                    if (storagePath) {
                        const { data, error } = await supabaseAdmin.storage.from("documentos").download(storagePath);
                        if (data && !error) {
                            const buffer = await data.arrayBuffer();
                            return { type: "file" as const, data: buffer, mediaType: "application/pdf" };
                        } else {
                            console.error(`Supabase download error for doc ${doc.id}:`, error);
                        }
                    }
                } catch (e) {
                    console.error(`Failed to fetch doc ${doc.id} from Supabase:`, e);
                }
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
            system: `Baseando-se estritamente nos documentos anexados, gere questões de múltipla escolha para um simulado de concurso. Você é um estruturador de JSON. CADA QUESTÃO DEVE TER EXATAMENTE 5 OPÇÕES (A, B, C, D, E). ${difficultyPrompt}`,
            messages: [
                {
                    role: "user" as const,
                    content: [
                        { type: "text" as const, text: `Assunto foco: "${topic}". Quantidade desejada: ${questionCount}. Dificuldade: ${difficulty.toUpperCase()}. Baseie as perguntas no material fornecido. Lembre-se: é OBRIGATÓRIO fornecer 5 alternativas (A, B, C, D, E) para cada questão, sendo apenas 1 correta.` },
                        { type: "text" as const, text: "Material de Estudo:" },
                        ...fileParts
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
