import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rateLimit";

export async function GET(request: Request) {
    try {
        const rateLimitResponse = await applyRateLimit(request, "documents-get");
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const documentos = await prisma.documento.findMany({
            where: { usuarioId: session.user.id },
            orderBy: { criadoEm: "desc" },
        });

        const documents = documentos.map((doc) => ({
            id: doc.id,
            name: doc.titulo,
            url: doc.url,
            geminiUri: doc.geminiUri,
            folderId: doc.pastaId || undefined,
            size: doc.tamanho,
            createdAt: doc.criadoEm.getTime(),
        }));

        return NextResponse.json({ documents });
    } catch (error) {
        console.error("Erro ao buscar documentos:", error);
        return NextResponse.json({ error: "Falha ao buscar documentos" }, { status: 500 });
    }
}
