import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { FileText, Layers, TrendingUp, ChevronLeft } from "lucide-react"
import Link from "next/link"

export default async function ResultadoPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || !session.user.id) {
        redirect("/login")
    }

    const exame = await prisma.exame.findUnique({
        where: { id: params.id },
        include: { documento: true }
    })

    if (!exame) {
        notFound()
    }

    // Security check
    if (exame.usuarioId !== session.user.id) {
        redirect("/historico")
    }

    const correctCount = exame.pontuacao
    const totalQuestions = exame.totalQuestoes
    const wrongCount = totalQuestions - correctCount // Simplification for history
    const percentage = Math.round((correctCount / totalQuestions) * 100) || 0

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
            {/* Header / Back Link */}
            <div className="w-full max-w-4xl mx-auto px-6 pt-12 pb-4">
                <Link href="/historico" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Voltar para o Histórico
                </Link>
            </div>

            <main className="flex-1 w-full max-w-4xl mx-auto px-6 pb-12">
                <h1 className="text-2xl font-medium mb-2">Detalhes do Simulado</h1>
                <p className="text-zinc-400 mb-8 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {exame.documento?.titulo || "Documento Geral"}
                </p>

                {/* Top Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Score Card */}
                    <div className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col justify-center">
                        <span className="text-sm text-zinc-400 font-medium mb-2">Pontuação</span>
                        <div className="text-4xl font-medium">
                            {correctCount}<span className="text-zinc-500 text-3xl">/{totalQuestions}</span>
                        </div>
                    </div>

                    {/* Percentage Card */}
                    <div className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col justify-center">
                        <span className="text-sm text-zinc-400 font-medium mb-2">de acerto</span>
                        <div className="text-4xl font-medium">
                            {percentage}%
                        </div>
                    </div>

                    {/* Breakdown Card */}
                    <div className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col justify-center text-sm font-medium">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-zinc-400">Corretas</span>
                            <span className="text-success">{correctCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-zinc-400">Erradas/Ignoradas</span>
                            <span className="text-danger">{wrongCount}</span>
                        </div>
                    </div>
                </div>

                {/* Continue Learning Section */}
                <h2 className="text-xl font-medium mt-12 mb-6">Revisão Sugerida</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Flashcards */}
                    <Link href="/biblioteca" className="bg-card border border-border/50 rounded-2xl p-6 flex items-start gap-5 hover:border-zinc-700 transition-colors cursor-pointer group">
                        <div className="shrink-0 w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-105 transition-transform">
                            <Layers className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold mb-1">Voltar aos Estudos</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed drop-shadow-sm">
                                Acesse sua biblioteca para revisar os materiais de estudo.
                            </p>
                        </div>
                    </Link>

                    {/* Study Guide */}
                    <Link href="/simulado" className="bg-card border border-border/50 rounded-2xl p-6 flex items-start gap-5 hover:border-zinc-700 transition-colors cursor-pointer group">
                        <div className="shrink-0 w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-105 transition-transform">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold mb-1">Novo Simulado</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed drop-shadow-sm">
                                Tente novamente focando nos tópicos que você errou.
                            </p>
                        </div>
                    </Link>

                </div>
            </main>
        </div>
    )
}
