import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
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
        console.error("Fetch documents error:", error);
        return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
    }
}
