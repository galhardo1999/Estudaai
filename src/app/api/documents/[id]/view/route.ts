import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import prisma from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rateLimit";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const rateLimitResponse = await applyRateLimit(request, "documents-view");
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();
        if (!session || !session.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = await params;

        const documento = await prisma.documento.findUnique({ where: { id } });

        if (!documento) {
            return new NextResponse("Document not found", { status: 404 });
        }

        if (documento.usuarioId !== session.user.id) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Se ainda for uma URL pública antiga (começa com http), apenas redireciona para ela
        if (documento.url.startsWith("http")) {
            return NextResponse.redirect(documento.url);
        }

        // Gera uma URL assinada de 1 hora para o caminho de armazenamento privado
        const { data, error } = await supabaseAdmin.storage
            .from("documentos")
            .createSignedUrl(documento.url, 3600);

        if (error || !data) {
            console.error("Supabase signed URL error:", error);
            return new NextResponse("Failed to generate secure viewing link", { status: 500 });
        }

        return NextResponse.redirect(data.signedUrl);
    } catch (error) {
        console.error("View document error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
