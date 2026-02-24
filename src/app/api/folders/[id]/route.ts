import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// DELETE: Remove a folder and optionally its subfolders
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

        const pasta = await prisma.pasta.findUnique({ where: { id } });

        if (!pasta) {
            return NextResponse.json({ error: "Folder not found" }, { status: 404 });
        }

        if (pasta.usuarioId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Prisma will cascade delete subfolders (onDelete: Cascade in schema)
        // Documents in this folder will have pastaId set to null (onDelete: SetNull)
        await prisma.pasta.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete folder error:", error);
        return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
    }
}
