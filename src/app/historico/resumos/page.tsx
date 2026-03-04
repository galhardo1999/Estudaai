import { BookOpen } from "lucide-react"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { ResumosHistoricoTabs } from "./ResumosHistoricoTabs"

export default async function HistoricoResumosPage() {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || !session.user.id) {
        return (
            <div className="flex flex-col min-h-screen bg-background p-6 md:p-12 items-center justify-center">
                <div className="text-center bg-card p-8 rounded-2xl border border-border">
                    <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
                    <p className="text-muted-foreground mb-6">Faça login para visualizar seu histórico de resumos.</p>
                    <Link href="/login" className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
                        Fazer Login
                    </Link>
                </div>
            </div>
        )
    }

    const resumos = await prisma.resumo.findMany({
        where: { usuarioId: session.user.id },
        orderBy: { criadoEm: "desc" },
        select: {
            id: true,
            tipo: true,
            nomeArquivo: true,
            criadoEm: true,
        }
    })

    return (
        <div className="flex flex-col min-h-screen bg-background p-6 md:p-12">
            <div className="max-w-5xl mx-auto w-full">
                <header className="mb-10">
                    <h1 className="text-3xl font-semibold mb-2 text-foreground">Histórico de Resumos</h1>
                    <p className="text-muted-foreground">Consulte e releia todos os resumos e flashcards gerados.</p>
                </header>

                <ResumosHistoricoTabs resumos={resumos} />
            </div>
        </div>
    )
}
