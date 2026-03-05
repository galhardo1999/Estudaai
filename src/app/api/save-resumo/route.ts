import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rateLimit";
import { saveResumoInputSchema, formatZodErrors } from "@/lib/validations";

export async function POST(request: Request) {
    try {
        const rateLimitResponse = await applyRateLimit(request, "save-resumo");
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const parsed = saveResumoInputSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: formatZodErrors(parsed.error) },
                { status: 400 }
            );
        }

        const { tipo, nomeArquivo, conteudo } = parsed.data;

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
        console.error("Erro ao salvar Resumo:", error);
        return NextResponse.json({ error: "Falha ao salvar resumo" }, { status: 500 });
    }
}
