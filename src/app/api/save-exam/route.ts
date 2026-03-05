import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rateLimit";
import { saveExamInputSchema, formatZodErrors } from "@/lib/validations";

export async function POST(request: Request) {
    try {
        const rateLimitResponse = await applyRateLimit(request, "save-exam");
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const parsed = saveExamInputSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: formatZodErrors(parsed.error) },
                { status: 400 }
            );
        }

        const { pontuacao, totalQuestoes, duracao, documentoId, questoes, respostas, codigo, dificuldade, documentNames } = parsed.data;

        const exame = await prisma.exame.create({
            data: {
                pontuacao,
                totalQuestoes,
                duracao,
                dificuldade,
                codigo: codigo || null,
                questoes: questoes ? questoes : undefined,
                respostas: respostas ? respostas : undefined,
                nomesDocumentos: documentNames,
                usuarioId: session.user.id,
                ...(documentoId && { documentoId })
            }
        });

        return NextResponse.json({ success: true, exame });

    } catch (error) {
        console.error("Erro ao salvar Exame:", error);
        return NextResponse.json({ error: "Falha ao salvar resultado do exame" }, { status: 500 });
    }
}
