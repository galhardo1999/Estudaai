import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import prisma from "@/lib/prisma";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
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

        // If it's still an old public URL (starts with http), just redirect to it
        if (documento.url.startsWith("http")) {
            return NextResponse.redirect(documento.url);
        }

        // Generate a 1-hour signed URL for the private storage path
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
