import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { codigo, questoes } = await request.json();

        if (!codigo || !questoes) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        // Find the exam by codigo and ensure it belongs to this user
        const exame = await prisma.exame.findFirst({
            where: { codigo, usuarioId: session.user.id },
            orderBy: { criadoEm: "desc" },
        });

        if (!exame) {
            // Exam may not exist yet (not yet saved at end) — create a placeholder
            // This handles the case where questions are done but save-exam hasn't run
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
