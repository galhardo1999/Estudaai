import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rateLimit";
import { createFolderInputSchema, formatZodErrors } from "@/lib/validations";

// GET: Lista todas as pastas do usuário autenticado
export async function GET() {
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const pastas = await prisma.pasta.findMany({
            where: { usuarioId: session.user.id },
            orderBy: { criadoEm: "asc" },
            include: {
                _count: { select: { documentos: true } },
            },
        });

        const folders = pastas.map((p) => ({
            id: p.id,
            name: p.nome,
            parentId: p.parentId || undefined,
            createdAt: p.criadoEm.getTime(),
        }));

        return NextResponse.json({ folders });
    } catch (error) {
        console.error("Fetch folders error:", error);
        return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
    }
}

// POST: Cria uma nova pasta
export async function POST(request: Request) {
    try {
        const rateLimitResponse = await applyRateLimit(request, "folders-post");
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const parsed = createFolderInputSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
        }

        const { name, parentId } = parsed.data;

        if (parentId) {
            const parentFolder = await prisma.pasta.findUnique({ where: { id: parentId } });
            if (!parentFolder || parentFolder.usuarioId !== session.user.id) {
                return NextResponse.json({ error: "Forbidden or Parent Folder not found" }, { status: 403 });
            }
        }

        const pasta = await prisma.pasta.create({
            data: {
                nome: name.trim(),
                usuarioId: session.user.id,
                parentId: parentId || null,
            },
        });

        return NextResponse.json({
            folder: {
                id: pasta.id,
                name: pasta.nome,
                parentId: pasta.parentId,
                createdAt: pasta.criadoEm.getTime(),
            },
        });
    } catch (error) {
        console.error("Create folder error:", error);
        return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
    }
}
