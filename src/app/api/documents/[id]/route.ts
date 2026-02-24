import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import prisma from "@/lib/prisma";

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

        // Find the document and verify ownership
        const documento = await prisma.documento.findUnique({
            where: { id },
        });

        if (!documento) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        if (documento.usuarioId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Extract the storage path from the Supabase URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/documentos/{path}
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const bucketPrefix = `${supabaseUrl}/storage/v1/object/public/documentos/`;

        if (documento.url.startsWith(bucketPrefix)) {
            const storagePath = documento.url.replace(bucketPrefix, "");
            const { error: deleteStorageError } = await supabaseAdmin.storage
                .from("documentos")
                .remove([decodeURIComponent(storagePath)]);

            if (deleteStorageError) {
                console.error("Supabase delete error:", deleteStorageError);
                // Continue with DB deletion even if storage delete fails
            }
        }

        // Delete from database
        await prisma.documento.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete document error:", error);
        return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
    }
}
