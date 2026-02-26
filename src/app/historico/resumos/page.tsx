import { BookOpen, Clock, FileText, ChevronRight } from "lucide-react"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

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
    })

    return (
        <div className="flex flex-col min-h-screen bg-background p-6 md:p-12">
            <div className="max-w-5xl mx-auto w-full">
                <header className="mb-10">
                    <h1 className="text-3xl font-semibold mb-2 text-foreground">Histórico de Resumos</h1>
                    <p className="text-muted-foreground">Consulte e releia todos os resumos e flashcards gerados.</p>
                </header>

                <div className="grid gap-4">
                    {resumos.map((resumo) => {
                        const dateObj = new Date(resumo.criadoEm)
                        const formattedDate = new Intl.DateTimeFormat("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                        }).format(dateObj)

                        const isFlashcard = resumo.tipo === "flashcards"

                        return (
                            <Link
                                key={resumo.id}
                                href={`/resumos/${resumo.id}`}
                                className="group bg-card border border-border/50 hover:border-primary/50 rounded-2xl p-6 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6"
                            >
                                {/* Left Side */}
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-1 ${isFlashcard ? "bg-purple-500/10 text-purple-500" : "bg-primary/10 text-primary"}`}>
                                        <BookOpen className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium text-foreground mb-1 truncate max-w-md">{resumo.nomeArquivo}</h3>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1.5">
                                                <FileText className="w-4 h-4" />
                                                {isFlashcard ? "Flashcards" : "Resumo Detalhado"}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4" />
                                                {formattedDate}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side */}
                                <div className="flex items-center justify-end gap-4 border-t md:border-t-0 border-border/50 pt-4 md:pt-0">
                                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isFlashcard ? "bg-purple-500/10 text-purple-400" : "bg-primary/10 text-primary"}`}>
                                        {isFlashcard ? "Flashcards" : "Resumo"}
                                    </span>
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors group-hover:bg-primary group-hover:text-white shrink-0">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </div>
                            </Link>
                        )
                    })}

                    {resumos.length === 0 && (
                        <div className="text-center py-20 bg-card border border-border/50 rounded-2xl">
                            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum resumo gerado ainda</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto mb-6">Gere seu primeiro resumo ou flashcard para começar a construir seu histórico.</p>
                            <Link href="/resumo" className="inline-flex items-center justify-center bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-6 rounded-lg transition-colors">
                                Gerar Primeiro Resumo
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
