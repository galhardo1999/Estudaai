import { NextResponse } from "next/server";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = file.type || "application/octet-stream";

        // 1. Salva em arquivo temporário (necessário para o Gemini File Manager)
        const tempFilePath = path.join(os.tmpdir(), file.name);
        await writeFile(tempFilePath, buffer);

        // 2. Envia para o Supabase Storage
        const timestamp = Date.now();
        // Sanitiza o nome do arquivo: remove caracteres especiais, substitui espaços por underscores
        const sanitizedName = file.name
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
            .replace(/[^a-zA-Z0-9._-]/g, "_"); // substitui caracteres especiais por underscore
        const storagePath = `${session.user.id}/${timestamp}_${sanitizedName}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from("documentos")
            .upload(storagePath, buffer, {
                contentType: mimeType,
                upsert: false,
            });

        if (uploadError) {
            console.error("Supabase upload error:", uploadError);
            return NextResponse.json({ error: "Failed to upload to storage" }, { status: 500 });
        }

        // 3. Envia para o Gemini File Manager (para processamento da IA)
        let geminiUri = "";
        const apiKey = process.env.GEMINI_API_KEY;

        if (apiKey) {
            try {
                const fileManager = new GoogleAIFileManager(apiKey);
                const uploadResult = await fileManager.uploadFile(tempFilePath, {
                    mimeType: mimeType,
                    displayName: file.name,
                });
                geminiUri = uploadResult.file.uri;
                console.log(`Uploaded file ${uploadResult.file.displayName} as: ${uploadResult.file.uri}`);
            } catch (geminiError) {
                console.error("Gemini upload error (non-fatal):", geminiError);
                // Continua mesmo se o Gemini falhar — arquivo ainda está armazenado no Supabase
            }
        } else {
            console.warn("GEMINI_API_KEY not found. Skipping Gemini upload.");
        }

        // 4. Limpa arquivo temporário
        try {
            await unlink(tempFilePath);
        } catch {
            // Ignora erros de limpeza
        }

        // 5. Salva no banco de dados via Prisma
        const documento = await prisma.documento.create({
            data: {
                titulo: file.name,
                descricao: mimeType,
                url: storagePath, // Salva o caminho interno em vez da URL pública por segurança
                geminiUri: geminiUri || null,
                tamanho: file.size,
                usuarioId: session.user.id,
            },
        });

        return NextResponse.json({
            document: {
                id: documento.id,
                name: documento.titulo,
                url: documento.url,
                geminiUri: documento.geminiUri,
                size: documento.tamanho,
                createdAt: documento.criadoEm.getTime(),
            },
        });
    } catch (error) {
        console.error("Upload Error:", error);
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
}
