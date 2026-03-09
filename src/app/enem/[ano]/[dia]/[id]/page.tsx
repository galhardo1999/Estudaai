"use client"

import { useState, useEffect, useCallback, useRef, use } from "react"
import { useRouter } from "next/navigation"
import { QuestionScreen, type Question } from "@/components/exam/QuestionScreen"
import { Trophy, RotateCcw, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEnemExam } from "@/contexts/EnemExamContext"

/* ─── Result Screen ─────────────────────────────────────────────── */
function ResultScreen({
    questions,
    userAnswers,
    timeUsed,
    ano,
    dia,
    onRestart,
    onHome,
}: {
    questions: Question[]
    userAnswers: Record<string, string>
    timeUsed: number
    ano: string
    dia: string
    onRestart: () => void
    onHome: () => void
}) {
    const totalQ = questions.length
    const correct = questions.filter((q) => {
        const answeredId = userAnswers[q.id]
        const option = q.options.find((o) => o.id === answeredId)
        return option?.isCorrect ?? false
    }).length
    const wrong = totalQ - correct
    const score = Math.round((correct / totalQ) * 1000)
    const pct = Math.round((correct / totalQ) * 100)

    const minutes = Math.floor(timeUsed / 60)
    const seconds = timeUsed % 60

    const grades = [
        { label: "Acertos", value: correct, color: "text-success", bg: "bg-success/10 border-success/20" },
        { label: "Erros", value: wrong, color: "text-danger", bg: "bg-danger/10 border-danger/20" },
        { label: "Nota TRI (est.)", value: score, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
    ]

    const diaLabel = dia === "dia1" ? "Dia 1" : "Dia 2"

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-6 py-16 font-sans">
            <div className="w-full max-w-lg">
                {/* Trophy */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                        <Trophy className="w-9 h-9 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold mb-1">Simulado concluído!</h1>
                    <p className="text-muted-foreground text-sm">ENEM {ano} — {diaLabel}</p>
                </div>

                {/* Score ring */}
                <div className="flex justify-center mb-8">
                    <div className="relative w-36 h-36">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-border" />
                            <circle
                                cx="50" cy="50" r="42" fill="none"
                                stroke="currentColor" strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 42}`}
                                strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
                                className="text-primary transition-all duration-700"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-foreground">{pct}%</span>
                            <span className="text-xs text-muted-foreground">acertos</span>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {grades.map((g) => (
                        <div key={g.label} className={cn("rounded-xl border p-4 text-center", g.bg)}>
                            <div className={cn("text-2xl font-black mb-1", g.color)}>{g.value}</div>
                            <div className="text-xs text-muted-foreground">{g.label}</div>
                        </div>
                    ))}
                </div>

                {/* Time */}
                <div className="bg-card border border-border/50 rounded-xl p-4 flex items-center justify-between mb-8">
                    <span className="text-sm text-muted-foreground">Tempo utilizado</span>
                    <span className="text-sm font-bold text-foreground tabular-nums">
                        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                    </span>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onRestart}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-full border border-border/50 bg-secondary/30 hover:bg-secondary/50 text-foreground font-semibold transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Refazer
                    </button>
                    <button
                        onClick={onHome}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-primary hover:bg-primary/90 text-white font-semibold transition-colors"
                    >
                        <Home className="w-4 h-4" />
                        Ir para ENEM
                    </button>
                </div>
            </div>
        </div>
    )
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function EnemExamActivePage({ params }: { params: Promise<{ ano: string; dia: string; id: string }> }) {
    const { ano, dia, id } = use(params)
    const router = useRouter()
    const enemExam = useEnemExam()
    const exam = enemExam.getExam(id)

    // Registra este exame como visualizado — o timer só roda enquanto visualizado
    useEffect(() => {
        enemExam.setViewingExamId(id)
        return () => enemExam.setViewingExamId(null)
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

    // Tempo esgotado → finaliza
    const timeoutHandled = useRef(false)
    useEffect(() => {
        if (exam && exam.isActive && !exam.isFinished && exam.timeRemaining <= 0 && !timeoutHandled.current) {
            timeoutHandled.current = true
            enemExam.finishExam(id)
        }
    }, [exam?.timeRemaining, exam?.isActive, exam?.isFinished]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleAnswer = useCallback((isCorrect: boolean, questionId: string, optionId: string) => {
        enemExam.answerQuestion(id, questionId, optionId, isCorrect)
    }, [id, enemExam])

    const handleNext = useCallback(() => {
        if (!exam) return
        if (exam.currentQuestionIndex < exam.questions.length - 1) {
            enemExam.setCurrentQuestionIndex(id, prev => prev + 1)
        } else {
            enemExam.finishExam(id)
        }
    }, [exam, id, enemExam])

    const handleBack = useCallback(() => {
        if (!exam) return
        if (exam.currentQuestionIndex > 0) {
            enemExam.setCurrentQuestionIndex(id, prev => prev - 1)
        }
    }, [exam, id, enemExam])

    const handleRestart = useCallback(() => {
        enemExam.clearExam(id)
        router.push(`/enem/${ano}`)
    }, [id, ano, router, enemExam])

    const handleHome = useCallback(() => {
        enemExam.clearExam(id)
        router.push("/enem")
    }, [id, router, enemExam])

    // Se não encontrou exame, redireciona
    if (!exam) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-screen gap-4">
                <p className="text-muted-foreground">Nenhuma prova ENEM ativa encontrada.</p>
                <button
                    onClick={() => router.push(`/enem/${ano}`)}
                    className="bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-6 rounded-lg transition-colors"
                >
                    Voltar para ENEM {ano}
                </button>
            </div>
        )
    }

    const questions = exam.questions as Question[]
    const diaLabel = dia === "dia1" ? "Dia 1" : "Dia 2"

    // Resultado
    if (exam.isFinished) {
        const timeUsed = exam.timeLimit - exam.timeRemaining
        return (
            <ResultScreen
                questions={questions}
                userAnswers={exam.userAnswers}
                timeUsed={timeUsed}
                ano={ano}
                dia={dia}
                onRestart={handleRestart}
                onHome={handleHome}
            />
        )
    }

    // Prova
    const currentQuestion = questions[exam.currentQuestionIndex]
    if (!currentQuestion) return null

    const isLast = exam.currentQuestionIndex === questions.length - 1

    return (
        <QuestionScreen
            key={exam.currentQuestionIndex}
            questionIndex={exam.currentQuestionIndex}
            totalQuestions={questions.length}
            question={currentQuestion}
            onAnswer={handleAnswer}
            onNext={handleNext}
            onBack={exam.currentQuestionIndex > 0 ? handleBack : undefined}
            timeRemaining={exam.timeRemaining}
            initialSelectedOptionId={exam.userAnswers[currentQuestion.id] ?? null}
            nextButtonText={isLast ? "Finalizar" : "Avançar"}
        />
    )
}
