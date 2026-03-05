import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rateLimit";
import { saveQuestionsInputSchema, formatZodErrors } from "@/lib/validations";

export async function POST(request: Request) {
    try {
        const rateLimitResponse = await applyRateLimit(request, "save-questions");
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const parsed = saveQuestionsInputSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: formatZodErrors(parsed.error) },
                { status: 400 }
            );
        }

        const { codigo, questoes } = parsed.data;

        // Encontra o exame pelo código e garante que pertence a este usuário
        const exame = await prisma.exame.findFirst({
            where: { codigo, usuarioId: session.user.id },
            orderBy: { criadoEm: "desc" },
        });

        if (!exame) {
            // O exame pode não existir ainda (não foi salvo no final) — cria um placeholder
            // Isso trata o caso onde as questões estão prontas mas o save-exam ainda não rodou
            return NextResponse.json({ ok: false, reason: "exam_not_found" });
        }

        await prisma.exame.update({
            where: { id: exame.id },
            data: { questoes },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Save Questions error:", error);
        return NextResponse.json({ error: "Failed to save questions" }, { status: 500 });
    }
}
