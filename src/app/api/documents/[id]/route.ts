import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import prisma from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rateLimit";
import { moveDocumentInputSchema, formatZodErrors } from "@/lib/validations";

// DELETE: Remove um documento do armazenamento e do banco de dados
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const rateLimitResponse = await applyRateLimit(request, "documents-delete");
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const documento = await prisma.documento.findUnique({ where: { id } });

        if (!documento) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        if (documento.usuarioId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Lida com URLs públicas antigas e storagePaths mais recentes e concisos
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const bucketPrefix = `${supabaseUrl}/storage/v1/object/public/documentos/`;
        let storagePath = documento.url;

        if (documento.url.startsWith(bucketPrefix)) {
            storagePath = documento.url.replace(bucketPrefix, "");
        }

        const { error: deleteStorageError } = await supabaseAdmin.storage
            .from("documentos")
            .remove([decodeURIComponent(storagePath)]);

        if (deleteStorageError) {
            console.error("Supabase delete error:", deleteStorageError);
        }

        await prisma.documento.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete document error:", error);
        return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
    }
}

// PATCH: Move um documento para uma pasta (ou para a raiz passando folderId: null)
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const rateLimitResponse = await applyRateLimit(request, "documents-patch");
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const parsed = moveDocumentInputSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
        }

        const { folderId } = parsed.data;

        const documento = await prisma.documento.findUnique({ where: { id } });

        if (!documento) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        if (documento.usuarioId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (folderId) {
            const folder = await prisma.pasta.findUnique({ where: { id: folderId } });
            if (!folder || folder.usuarioId !== session.user.id) {
                return NextResponse.json({ error: "Forbidden or Folder not found" }, { status: 403 });
            }
        }

        await prisma.documento.update({
            where: { id },
            data: { pastaId: folderId || null },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Move document error:", error);
        return NextResponse.json({ error: "Failed to move document" }, { status: 500 });
    }
}
