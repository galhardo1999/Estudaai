import { FileText, Layers, TrendingUp } from "lucide-react"

interface ResultDashboardProps {
    totalQuestions: number
    correctCount: number
    wrongCount: number
    skippedCount: number
    onReview: () => void
    onMoreQuestions: () => void
}

export function ResultDashboard({
    totalQuestions,
    correctCount,
    wrongCount,
    skippedCount,
    onReview,
    onMoreQuestions,
}: ResultDashboardProps) {
    const percentage = Math.round((correctCount / totalQuestions) * 100) || 0
    const numericScore = ((correctCount / totalQuestions) * 10).toFixed(2)

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
            <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-12">
                <h1 className="text-2xl font-medium mb-8">Você conseguiu! Teste concluído.</h1>

                {/* Top Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Score Card */}
                    <div className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col justify-center">
                        <span className="text-sm text-zinc-400 font-medium mb-2">Nota Final</span>
                        <div className="text-4xl font-medium">
                            {numericScore}
                        </div>
                    </div>

                    {/* Percentage Card */}
                    <div className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col justify-center">
                        <span className="text-sm text-zinc-400 font-medium mb-2">% de acerto</span>
                        <div className="text-4xl font-medium">
                            {percentage}%
                        </div>
                    </div>

                    {/* Breakdown Card */}
                    <div className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col justify-center text-sm font-medium">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-zinc-400">Corretas</span>
                            <span>{correctCount}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-zinc-400">Erradas</span>
                            <span>{wrongCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-zinc-400">Ignoradas</span>
                            <span>{skippedCount}</span>
                        </div>
                    </div>
                </div>

                {/* Strengths and Weaknesses Card */}
                <div className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 mb-12">
                    {/* Icon Box */}
                    <div className="shrink-0 w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <TrendingUp className="w-8 h-8" />
                    </div>

                    <div className="flex-1">
                        <h3 className="text-base font-medium mb-1">Pontos fortes e áreas de melhoria</h3>
                        <p className="text-sm text-zinc-400">
                            Receba um resumo dos seus principais pontos fortes e descubra áreas em que você pode focar seus estudos.
                        </p>
                    </div>

                    <button className="shrink-0 bg-primary hover:bg-primary-hover transition-colors text-white text-sm font-medium py-2.5 px-6 rounded-lg w-full md:w-auto">
                        Analisar meu desempenho
                    </button>
                </div>

                {/* Continue Learning Section */}
                <h2 className="text-xl font-medium mb-6">Continuar aprendendo</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Flashcards */}
                    <div className="bg-card border border-border/50 rounded-2xl p-6 flex items-start gap-5 hover:border-zinc-700 transition-colors cursor-pointer group">
                        <div className="shrink-0 w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-105 transition-transform">
                            <Layers className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold mb-1">Cartões didáticos</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed drop-shadow-sm">
                                Crie um conjunto completo de cartões didáticos com todo o conteúdo do seu teste. Isso é bom para fazer uma revisão rápida e dominar conceitos importantes.
                            </p>
                        </div>
                    </div>

                    {/* Study Guide */}
                    <div className="bg-card border border-border/50 rounded-2xl p-6 flex items-start gap-5 hover:border-zinc-700 transition-colors cursor-pointer group">
                        <div className="shrink-0 w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-105 transition-transform">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold mb-1">Guia de estudo</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed drop-shadow-sm">
                                Gere um guia abrangente com base no conteúdo que você está estudando. Isso é bom para revisões detalhadas.
                            </p>
                        </div>
                    </div>

                </div>
            </main>

            {/* Bottom Action Bar */}
            <div className="w-full flex justify-end items-center gap-6 px-6 md:px-12 py-6 max-w-4xl mx-auto">
                <button
                    onClick={onReview}
                    className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
                >
                    Revisar o teste
                </button>
                <button
                    onClick={onMoreQuestions}
                    className="bg-primary-hover hover:bg-primary text-black font-semibold tracking-wide py-2.5 px-6 rounded-full transition-all duration-200 active:scale-95"
                >
                    Mais perguntas
                </button>
            </div>
        </div>
    )
}
