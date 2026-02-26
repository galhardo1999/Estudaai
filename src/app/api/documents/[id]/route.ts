import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import prisma from "@/lib/prisma";

// DELETE: Remove a document from storage and database
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
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

        // Handle both older public URLs and newer concise storagePaths
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

// PATCH: Move a document to a folder (or to root by passing folderId: null)
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { folderId } = body;

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
