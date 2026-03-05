import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        }),
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Senha", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Credenciais inválidas');
                }

                const user = await prisma.user.findUnique({
                    where: {
                        email: credentials.email
                    }
                });

                if (!user || !user?.senha) {
                    throw new Error('Usuário não encontrado ou senha não cadastrada');
                }

                const isCorrectPassword = await bcrypt.compare(
                    credentials.password,
                    user.senha
                );

                if (!isCorrectPassword) {
                    throw new Error('Senha incorreta');
                }

                return user;
            }
        })
    ],
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.sub) {
                // Anexa o id do usuário no banco à sessão
                session.user.id = token.sub;
                session.user.role = token.role as string | undefined;
            }
            return session;
        },
    },
};
