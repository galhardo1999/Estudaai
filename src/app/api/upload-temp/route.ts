import { NextResponse } from "next/server";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { auth } from "@/lib/auth";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { MAX_FILE_SIZE, isAllowedMimeType } from "@/lib/validations";

export async function POST(request: Request) {
    try {
        const rateLimitResponse = await applyRateLimit(request, "upload-temp", RATE_LIMITS.upload);
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validação de tamanho do arquivo (50MB)
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "Arquivo excede o limite de 50MB" },
                { status: 413 }
            );
        }

        // Validação de MIME type
        const mimeType = file.type || "application/pdf";
        if (!isAllowedMimeType(mimeType)) {
            return NextResponse.json(
                { error: `Tipo de arquivo não permitido: ${mimeType}` },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Salva em arquivo temporário e envia diretamente ao Gemini File Manager
        const tempFilePath = path.join(os.tmpdir(), `temp_${Date.now()}_${file.name}`);
        await writeFile(tempFilePath, buffer);

        let geminiUri = "";
        try {
            const fileManager = new GoogleAIFileManager(apiKey);
            const uploadResult = await fileManager.uploadFile(tempFilePath, {
                mimeType,
                displayName: file.name,
            });
            geminiUri = uploadResult.file.uri;
        } finally {
            await unlink(tempFilePath).catch(() => { });
        }

        // Retorna um objeto de documento temporário — NÃO salvo no banco ou na biblioteca
        return NextResponse.json({
            document: {
                id: `temp_${Date.now()}`, // ID local falso, não está no banco
                name: file.name,
                geminiUri,
                mimeType,
                isTemp: true,
            }
        });
    } catch (error) {
        console.error("Temp Upload Error:", error);
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
}
