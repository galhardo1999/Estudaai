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
        const { pontuacao, totalQuestoes, duracao = 0, documentoId = null, questoes, respostas, codigo } = body;

        if (pontuacao === undefined || totalQuestoes === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const exame = await prisma.exame.create({
            data: {
                pontuacao,
                totalQuestoes,
                duracao,
                codigo: codigo || null,
                questoes: questoes ? questoes : undefined,
                respostas: respostas ? respostas : undefined,
                usuarioId: session.user.id,
                ...(documentoId && { documentoId })
            }
        });

        return NextResponse.json({ success: true, exame });

    } catch (error) {
        console.error("Save Exam error:", error);
        return NextResponse.json({ error: "Failed to save exam result" }, { status: 500 });
    }
}
