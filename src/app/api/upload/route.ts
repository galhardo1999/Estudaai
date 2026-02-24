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

        // 1. Save to temp file (needed for Gemini File Manager)
        const tempFilePath = path.join(os.tmpdir(), file.name);
        await writeFile(tempFilePath, buffer);

        // 2. Upload to Supabase Storage
        const timestamp = Date.now();
        // Sanitize filename: remove special chars, replace spaces with underscores
        const sanitizedName = file.name
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
            .replace(/[^a-zA-Z0-9._-]/g, "_"); // replace special chars with underscore
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

        // Get the public URL from Supabase
        const { data: publicUrlData } = supabaseAdmin.storage
            .from("documentos")
            .getPublicUrl(storagePath);

        const supabaseUrl = publicUrlData.publicUrl;

        // 3. Upload to Gemini File Manager (for AI processing)
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
                // Continue even if Gemini fails — file is still stored in Supabase
            }
        } else {
            console.warn("GEMINI_API_KEY not found. Skipping Gemini upload.");
        }

        // 4. Clean up temp file
        try {
            await unlink(tempFilePath);
        } catch {
            // Ignore cleanup errors
        }

        // 5. Save to database via Prisma
        const documento = await prisma.documento.create({
            data: {
                titulo: file.name,
                descricao: mimeType,
                url: supabaseUrl,
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
