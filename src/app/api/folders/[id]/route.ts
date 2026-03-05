import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rateLimit";
import { renameFolderInputSchema, formatZodErrors } from "@/lib/validations";

// DELETE: Remove uma pasta e opcionalmente suas subpastas
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const rateLimitResponse = await applyRateLimit(request, "folders-delete");
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();
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

        // Prisma vai cascatear a exclusão de subpastas (onDelete: Cascade no schema)
        // Documentos nesta pasta terão pastaId definido como null (onDelete: SetNull)
        await prisma.pasta.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete folder error:", error);
        return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
    }
}

// PATCH: Renomeia uma pasta
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const rateLimitResponse = await applyRateLimit(request, "folders-patch");
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const parsed = renameFolderInputSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
        }

        const { name } = parsed.data;

        const pasta = await prisma.pasta.findUnique({ where: { id } });

        if (!pasta) {
            return NextResponse.json({ error: "Folder not found" }, { status: 404 });
        }

        if (pasta.usuarioId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const updated = await prisma.pasta.update({
            where: { id },
            data: { nome: name.trim() },
        });

        return NextResponse.json({ folder: { id: updated.id, name: updated.nome } });
    } catch (error) {
        console.error("Rename folder error:", error);
        return NextResponse.json({ error: "Failed to rename folder" }, { status: 500 });
    }
}
