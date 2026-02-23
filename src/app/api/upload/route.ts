import { NextResponse } from "next/server";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { writeFile } from "fs/promises";
import path from "path";
import os from "os";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Save locally to a temp file
        const tempFilePath = path.join(os.tmpdir(), file.name);
        await writeFile(tempFilePath, buffer);

        let fileUri = "mock-uri-from-gemini";
        let mimeType = file.type || "application/pdf"
        const apiKey = process.env.GEMINI_API_KEY;

        if (apiKey) {
            const fileManager = new GoogleAIFileManager(apiKey);
            const uploadResult = await fileManager.uploadFile(tempFilePath, {
                mimeType: mimeType,
                displayName: file.name,
            });
            fileUri = uploadResult.file.uri;
            console.log(`Uploaded file ${uploadResult.file.displayName} as: ${uploadResult.file.uri}`);
        } else {
            console.warn("GEMINI_API_KEY not found. Using mocked file URI.");
        }

        // Simulate DB insertion (can be hooked to Prisma later when DATABASE_URL is ready)
        const newDoc = {
            id: `doc-${Date.now()}`,
            name: file.name,
            url: fileUri,
        };

        return NextResponse.json({ document: newDoc });
    } catch (error) {
        console.error("Upload Error:", error);
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
}
