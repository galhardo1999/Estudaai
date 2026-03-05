import { NextResponse } from "next/server";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = file.type || "application/pdf";

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
