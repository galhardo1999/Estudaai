import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { tipo, nomeArquivo, conteudo } = body;

        if (!tipo || !nomeArquivo || !conteudo) {
            return NextResponse.json({ error: "Missing required fields: tipo, nomeArquivo, conteudo" }, { status: 400 });
        }

        const resumo = await prisma.resumo.create({
            data: {
                tipo,
                nomeArquivo,
                conteudo,
                usuarioId: session.user.id,
            }
        });

        return NextResponse.json({ success: true, resumo });

    } catch (error) {
        console.error("Save Resumo error:", error);
        return NextResponse.json({ error: "Failed to save resumo" }, { status: 500 });
    }
}
