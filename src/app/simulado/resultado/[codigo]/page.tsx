"use client"

import { use, useState, useRef } from "react"
import { useExam } from "@/contexts/ExamContext"
import { useRouter } from "next/navigation"
import { TrendingUp, ChevronLeft, RotateCcw, Plus, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"

// Minimal markdown renderer for the AI report
function renderMarkdown(text: string) {
    const lines = text.split("\n")
    return lines.map((line, i) => {
        // ## Heading
        if (line.startsWith("## ")) {
            return <h2 key={i} className="text-lg font-semibold mt-6 mb-2 text-foreground">{line.replace(/^## /, "")}</h2>
        }
        // ### Sub-heading
        if (line.startsWith("### ")) {
            return <h3 key={i} className="text-base font-semibold mt-4 mb-1 text-foreground">{line.replace(/^### /, "")}</h3>
        }
        // Bullet
        if (line.startsWith("- ") || line.startsWith("* ")) {
            const content = line.replace(/^[-*] /, "")
            return (
                <li key={i} className="ml-4 mb-1 text-sm text-foreground/90 leading-relaxed list-disc"
                    dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
            )
        }
        // Empty line
        if (line.trim() === "") return <div key={i} className="h-1" />
        // Paragraph
        return (
            <p key={i} className="text-sm text-foreground/85 leading-relaxed mb-1"
                dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
        )
    })
}

export default function SimuladoResultadoPage({ params }: { params: Promise<{ codigo: string }> }) {
    const { codigo } = use(params)
    const examCtx = useExam()
    const router = useRouter()
    const exam = examCtx.getExam(codigo)

    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [report, setReport] = useState<string>("")
    const [reportOpen, setReportOpen] = useState(false)
    const reportRef = useRef<HTMLDivElement>(null)

    // If no exam in context, derive minimal info from available state
    const questions = (exam?.questions ?? []) as any[]
    const correctCount = exam?.correctCount ?? 0
    const wrongCount = exam?.wrongCount ?? 0
    const totalQuestions = exam?.questionCount ?? (correctCount + wrongCount)
    const skippedCount = Math.max(0, totalQuestions - correctCount - wrongCount)
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
    const numericScore = totalQuestions > 0 ? ((correctCount / totalQuestions) * 10).toFixed(2) : "0.00"
    const dificuldade = exam?.dificuldade ?? "medio"
    const dificuldadeLabel: Record<string, { label: string; color: string }> = {
        facil: { label: "Fácil", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
        medio: { label: "Médio", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
        dificil: { label: "Difícil", color: "bg-red-500/10 text-red-400 border-red-500/30" },
    }
    const diff = dificuldadeLabel[dificuldade] ?? dificuldadeLabel.medio

    const handleAnalyze = async () => {
        if (!exam) return
        setIsAnalyzing(true)
        setReport("")
        setReportOpen(true)
        setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth" }), 100)

        try {
            const res = await fetch("/api/analyze-exam", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    questions: exam.questions,
                    userAnswers: exam.userAnswers,
                    correctCount: exam.correctCount,
                    totalQuestions: exam.questionCount,
                    dificuldade: exam.dificuldade,
                }),
            })

            if (!res.body) throw new Error("No response body")

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let accumulated = ""

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                accumulated += decoder.decode(value, { stream: true })
                setReport(accumulated)
            }
        } catch (err) {
            console.error("Analyze failed:", err)
            setReport("Erro ao gerar análise. Tente novamente.")
        } finally {
            setIsAnalyzing(false)
        }
    }

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
            {/* Back */}
            <div className="w-full max-w-4xl mx-auto px-6 pt-10 pb-2">
                <Link
                    href="/historico/simulados"
                    className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Ver histórico
                </Link>
            </div>

            <main className="flex-1 w-full max-w-4xl mx-auto px-6 pb-16">
                <h1 className="text-2xl font-medium mb-1 mt-4">Você concluiu! 🎉</h1>
                <div className="flex items-center gap-3 mb-8 flex-wrap">
                    <span className="text-sm text-muted-foreground">Simulado #{codigo}</span>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${diff.color}`}>
                        {diff.label}
                    </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col justify-center">
                        <span className="text-sm text-zinc-400 font-medium mb-2">Nota Final</span>
                        <div className="text-4xl font-medium">{numericScore}</div>
                    </div>
                    <div className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col justify-center">
                        <span className="text-sm text-zinc-400 font-medium mb-2">% de acerto</span>
                        <div className="text-4xl font-medium">{percentage}%</div>
                    </div>
                    <div className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col justify-center text-sm font-medium">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-zinc-400">Corretas</span>
                            <span className="text-success">{correctCount}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-zinc-400">Erradas</span>
                            <span className="text-danger">{wrongCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-zinc-400">Ignoradas</span>
                            <span className="text-muted-foreground">{skippedCount}</span>
                        </div>
                    </div>
                </div>

                {/* AI Analysis Card */}
                <div className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 mb-8">
                    <div className="shrink-0 w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <TrendingUp className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-base font-medium mb-1">Pontos fortes e áreas de melhoria</h3>
                        <p className="text-sm text-zinc-400">
                            Receba um relatório completo e personalizado com base nas suas respostas, incluindo pontos fortes, erros e recomendações de estudo.
                        </p>
                    </div>
                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || !exam}
                        className="shrink-0 bg-primary hover:bg-primary-hover transition-colors text-white text-sm font-medium py-2.5 px-6 rounded-lg w-full md:w-auto disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isAnalyzing ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</>
                        ) : (
                            "Analisar meu desempenho"
                        )}
                    </button>
                </div>

                {/* Report */}
                {(report || isAnalyzing) && (
                    <div ref={reportRef} className="bg-card border border-border/50 rounded-2xl overflow-hidden mb-8">
                        <button
                            onClick={() => setReportOpen(p => !p)}
                            className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors"
                        >
                            <span className="text-sm font-semibold">Relatório de Desempenho</span>
                            {reportOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        {reportOpen && (
                            <div className="px-6 pb-6 border-t border-border/50">
                                {isAnalyzing && report === "" ? (
                                    <div className="flex items-center gap-3 py-6 text-muted-foreground">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span className="text-sm">A IA está analisando suas respostas...</span>
                                    </div>
                                ) : (
                                    <div className="mt-4">
                                        {renderMarkdown(report)}
                                        {isAnalyzing && <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-1 align-middle" />}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-4 flex-wrap">
                    <button
                        onClick={() => {
                            examCtx.clearExam(codigo)
                            router.push("/simulado")
                        }}
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Revisar / Novo simulado
                    </button>
                    <button
                        onClick={() => {
                            examCtx.clearExam(codigo)
                            router.push("/simulado")
                        }}
                        className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold py-2.5 px-6 rounded-full transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Mais perguntas
                    </button>
                </div>
            </main>
        </div>
    )
}
