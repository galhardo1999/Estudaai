import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rateLimit";

// GET: Recupera o estado parcial de um exame ativo
export async function GET(
    request: Request,
    { params }: { params: Promise<{ codigo: string }> }
) {
    try {
        const rateLimitResponse = await applyRateLimit(request, "exam-state-get");
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { codigo } = await params;

        const exame = await prisma.exame.findFirst({
            where: {
                codigo,
                usuarioId: session.user.id,
                status: "em_andamento",
            },
            orderBy: { criadoEm: "desc" },
        });

        if (!exame) {
            return NextResponse.json({ state: null });
        }

        return NextResponse.json({
            state: {
                examId: exame.codigo,
                estadoAtual: exame.estadoAtual,
                questoes: exame.questoes,
                dificuldade: exame.dificuldade,
                status: exame.status,
            },
        });
    } catch (error) {
        console.error("Get exam state error:", error);
        return NextResponse.json({ error: "Failed to get exam state" }, { status: 500 });
    }
}

// PUT: Salva o estado parcial de um exame (auto-save)
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ codigo: string }> }
) {
    try {
        const rateLimitResponse = await applyRateLimit(request, "exam-state-put");
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { codigo } = await params;
        const body = await request.json();
        const { estadoAtual, status } = body;

        const exame = await prisma.exame.findFirst({
            where: {
                codigo,
                usuarioId: session.user.id,
            },
            orderBy: { criadoEm: "desc" },
        });

        if (!exame) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        const updateData: Record<string, unknown> = {};
        if (estadoAtual !== undefined) updateData.estadoAtual = estadoAtual;
        if (status !== undefined) updateData.status = status;

        await prisma.exame.update({
            where: { id: exame.id },
            data: updateData,
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Save exam state error:", error);
        return NextResponse.json({ error: "Failed to save exam state" }, { status: 500 });
    }
}
