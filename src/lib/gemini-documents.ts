import { GoogleAIFileManager } from "@google/generative-ai/server";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import type { DocumentoRecord, AIFilePart } from "@/types";

/**
 * Módulo compartilhado para resolver documentos do banco em file parts
 * compatíveis com o Vercel AI SDK (para Gemini).
 *
 * Usado por:
 * - /api/generate-exam
 * - /api/generate-summary
 */

/** Baixa o buffer de um documento do Supabase dado sua URL/caminho armazenado */
export async function downloadFromSupabase(doc: DocumentoRecord): Promise<Buffer | null> {
    if (!doc.url) return null;
    try {
        let storagePath = doc.url;
        if (doc.url.startsWith("http")) {
            const match = doc.url.match(/\/documentos\/(.+)$/);
            storagePath = match ? match[1] : "";
            if (!storagePath) return null;
        }
        const { data, error } = await supabaseAdmin.storage.from("documentos").download(storagePath);
        if (data && !error) return Buffer.from(await data.arrayBuffer());
        console.error(`Supabase download error for doc ${doc.id}:`, error);
        return null;
    } catch (e) {
        console.error(`Failed to download doc ${doc.id} from Supabase:`, e);
        return null;
    }
}

/** Re-envia um buffer ao Gemini File Manager e persiste a nova URI no banco */
export async function reuploadToGemini(
    doc: DocumentoRecord,
    buffer: Buffer,
    mimeType: string,
    fileManager: GoogleAIFileManager
): Promise<string | null> {
    const tmpPath = path.join(os.tmpdir(), `${randomUUID()}_${doc.titulo || "file"}.pdf`);
    try {
        await writeFile(tmpPath, buffer);
        const result = await fileManager.uploadFile(tmpPath, { mimeType, displayName: doc.titulo || doc.id });
        const newUri = result.file.uri;
        // Atualiza o banco para que gerações futuras usem a URI atualizada diretamente
        await prisma.documento.update({ where: { id: doc.id }, data: { geminiUri: newUri } });
        console.log(`Re-uploaded doc ${doc.id} to Gemini: ${newUri}`);
        return newUri;
    } catch (e) {
        console.error(`Failed to re-upload doc ${doc.id} to Gemini:`, e);
        return null;
    } finally {
        await unlink(tmpPath).catch(() => { });
    }
}

/**
 * Resolve uma lista de documentos do banco em file parts para o AI SDK.
 * 
 * Prioridade para cada documento:
 * 1. Usa geminiUri existente (se ainda válida)
 * 2. Baixa do Supabase e re-envia ao Gemini
 * 3. Usa buffer direto como fallback
 */
export async function resolveDocumentFileParts(
    docs: DocumentoRecord[],
    fileManager: GoogleAIFileManager
): Promise<AIFilePart[]> {
    const rawFileParts = await Promise.all(docs.map(async (doc): Promise<AIFilePart | null> => {
        const mimeType = (doc.mimeType || "application/pdf") as string;

        // Prioridade 1: Valida que a geminiUri ainda está ativa antes de usá-la
        if (doc.geminiUri) {
            try {
                const fileId = doc.geminiUri.split("/files/")[1];
                if (fileId) await fileManager.getFile(fileId); // throws if expired/missing
                return { type: "file" as const, data: new URL(doc.geminiUri), mediaType: mimeType };
            } catch (e: unknown) {
                const errorStr = String(e);
                const errorObj = e as { statusCode?: number; status?: number };
                const is403 = errorObj?.statusCode === 403 || errorObj?.status === 403 || errorStr.includes("403") || errorStr.includes("PERMISSION_DENIED");
                if (is403) {
                    console.warn(`GeminiUri expired for doc ${doc.id}. Clearing and falling back to Supabase.`);
                    await prisma.documento.update({ where: { id: doc.id }, data: { geminiUri: null } }).catch(() => { });
                } else {
                    console.warn(`GeminiUri check failed for doc ${doc.id}:`, e);
                }
                // Prossegue para o Supabase
            }
        }

        // Prioridade 2: Baixa do Supabase e reenvia ao Gemini para velocidade futura
        const buffer = await downloadFromSupabase(doc);
        if (buffer) {
            const mime = doc.mimeType || "application/pdf";
            const newUri = await reuploadToGemini(doc, buffer, mime, fileManager);
            if (newUri) {
                return { type: "file" as const, data: new URL(newUri), mediaType: mime };
            }
            // Se o reenvio falhou, passa o buffer diretamente
            return { type: "file" as const, data: buffer, mediaType: mime };
        }

        console.warn(`Doc ${doc.id} has no accessible content. Skipping.`);
        return null;
    }));

    return rawFileParts.filter((part): part is AIFilePart => part !== null);
}
