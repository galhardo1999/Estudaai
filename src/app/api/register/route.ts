import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { registerInputSchema, formatZodErrors } from "@/lib/validations";

export async function POST(req: Request) {
    try {
        const rateLimitResponse = await applyRateLimit(req, "register", RATE_LIMITS.register);
        if (rateLimitResponse) return rateLimitResponse;

        const body = await req.json();
        const parsed = registerInputSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: formatZodErrors(parsed.error) },
                { status: 400 }
            );
        }

        const { email, name, password } = parsed.data;

        // Verifica se o usuário já existe
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Este e-mail já está em uso." },
                { status: 400 }
            );
        }

        // Gera o hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Cria o usuário
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                senha: hashedPassword,
            },
        });

        // Oculta a senha antes de retornar
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { senha: _senha, ...userWithoutPassword } = newUser;

        return NextResponse.json(userWithoutPassword, { status: 201 });
    } catch (error) {
        console.error("Erro durante o registro:", error);
        return NextResponse.json(
            { error: "Ocorreu um erro interno ao registrar." },
            { status: 500 }
        );
    }
}
