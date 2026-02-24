import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, name, password } = body;

        if (!email || !name || !password) {
            return NextResponse.json(
                { error: "Todos os campos são obrigatórios." },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Este e-mail já está em uso." },
                { status: 400 }
            );
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the user
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                senha: hashedPassword,
            },
        });

        // Hide password before returning
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
