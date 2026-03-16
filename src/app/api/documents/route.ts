import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rateLimit";

const DEFAULT_PAGE_SIZE = 50;

export async function GET(request: Request) {
    try {
        const rateLimitResponse = await applyRateLimit(request, "documents");
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Paginação via cursor
        const url = new URL(request.url);
        const cursor = url.searchParams.get("cursor");
        const limit = Math.min(
            parseInt(url.searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10),
            100 // Limite máximo de 100 itens por página
        );

        const documents = await prisma.documento.findMany({
            where: { usuarioId: session.user.id },
            orderBy: { criadoEm: "desc" },
            take: limit + 1, // Busca 1 a mais para detectar se há próxima página
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        let nextCursor: string | null = null;
        if (documents.length > limit) {
            const lastItem = documents.pop()!;
            nextCursor = lastItem.id;
        }

        const formatted = documents.map(doc => ({
            id: doc.id,
            name: doc.titulo,
            url: doc.url,
            geminiUri: doc.geminiUri,
            folderId: doc.pastaId,
            size: doc.tamanho,
            createdAt: doc.criadoEm.getTime(),
        }));

        return NextResponse.json({
            documents: formatted,
            nextCursor,
        });
    } catch (error) {
        console.error("List documents error:", error);
        return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
    }
}
