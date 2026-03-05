"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { QuestionScreen, type Question } from "@/components/exam/QuestionScreen"
import { ArrowLeft, Globe, BookOpen, Check, Trophy, RotateCcw, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import provaData from "@/Provas/Enem/2017/enem_2017.json"

/* ─── Types ────────────────────────────────────────────────────── */
interface JsonQuestion {
    numero: number
    enunciado: string
    alternativas: Record<string, string>
    gabarito: string
}

/* ─── Transform JSON → QuestionScreen format ──────────────────── */
function buildQuestion(q: JsonQuestion, sectionPrefix: string): Question {
    const letras = Object.keys(q.alternativas)
    return {
        id: `${sectionPrefix}-${q.numero}`,
        text: q.enunciado,
        options: letras.map((letra) => ({
            id: `${sectionPrefix}-${q.numero}-${letra}`,
            letter: letra,
            text: q.alternativas[letra],
            isCorrect: letra === q.gabarito,
        })),
    }
}

/* ─── Assemble Dia 1 questions ────────────────────────────────── */
function buildDia1Questions(idioma: "ingles" | "espanhol"): Question[] {
    const secoes = provaData.secoes as Record<string, JsonQuestion[]>

    const idiomQuestions =
        idioma === "ingles"
            ? (secoes["opcao_ingles_01_a_05"] ?? []).map((q) => buildQuestion(q, "ing"))
            : (secoes["opcao_espanhol_01_a_05"] ?? []).map((q) => buildQuestion(q, "esp"))

    const linguagens = (secoes["linguagens_06_a_45"] ?? []).map((q) => buildQuestion(q, "lc"))
    const humanas = (secoes["ciencias_humanas_46_a_90"] ?? []).map((q) => buildQuestion(q, "ch"))

    return [...idiomQuestions, ...linguagens, ...humanas]
}

/* ─── Timer hook ────────────────────────────────────────────────── */
function useCountdown(initialSeconds: number, running: boolean) {
    const [seconds, setSeconds] = useState(initialSeconds)
    const ref = useRef(initialSeconds)
    ref.current = seconds

    useEffect(() => {
        if (!running) return
        const id = setInterval(() => {
            setSeconds((s) => Math.max(0, s - 1))
        }, 1000)
        return () => clearInterval(id)
    }, [running])

    return seconds
}

/* ─── Language Modal ────────────────────────────────────────────── */
function LanguageModal({ onSelect }: { onSelect: (idioma: "ingles" | "espanhol") => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md bg-card border border-border/50 rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold">Escolha o idioma</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                    As questões 1 a 5 são de língua estrangeira. Selecione o idioma que você estudou:
                </p>

                <div className="grid grid-cols-2 gap-4">
                    {(["ingles", "espanhol"] as const).map((lang) => (
                        <button
                            key={lang}
                            onClick={() => onSelect(lang)}
                            className="group flex flex-col items-center justify-center gap-3 p-6 bg-secondary/30 border border-border/50 rounded-xl hover:bg-primary/10 hover:border-primary/40 transition-all duration-200 hover:-translate-y-0.5"
                        >
                            <span className="text-2xl">{lang === "ingles" ? "🇬🇧" : "🇪🇸"}</span>
                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors capitalize">
                                {lang === "ingles" ? "Inglês" : "Espanhol"}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

/* ─── Result Screen ─────────────────────────────────────────────── */
function ResultScreen({
    questions,
    userAnswers,
    timeUsed,
    onRestart,
    onHome,
}: {
    questions: Question[]
    userAnswers: Record<string, string>
    timeUsed: number
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

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-6 py-16 font-sans">
            <div className="w-full max-w-lg">
                {/* Trophy */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                        <Trophy className="w-9 h-9 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold mb-1">Simulado concluído!</h1>
                    <p className="text-muted-foreground text-sm">ENEM 2017 — Dia 1</p>
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
const TEMPO_DIA1 = 5 * 60 * 60 + 30 * 60 // 5h30 em segundos

export default function Enem2017Dia1Page() {
    const router = useRouter()

    // Fases: "lang" → escolha de idioma | "exam" → fazendo prova | "result" → resultado
    const [phase, setPhase] = useState<"lang" | "exam" | "result">("lang")
    const [questions, setQuestions] = useState<Question[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})
    const [timeUsed, setTimeUsed] = useState(0)

    const timeRemaining = useCountdown(TEMPO_DIA1, phase === "exam")

    // Calcula tempo usado quando finaliza
    useEffect(() => {
        if (phase === "result") {
            setTimeUsed(TEMPO_DIA1 - timeRemaining)
        }
    }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

    // Tempo esgotado
    useEffect(() => {
        if (phase === "exam" && timeRemaining <= 0) {
            setPhase("result")
        }
    }, [timeRemaining, phase])

    const handleLangSelect = useCallback((idioma: "ingles" | "espanhol") => {
        const qs = buildDia1Questions(idioma)
        setQuestions(qs)
        setPhase("exam")
    }, [])

    const handleAnswer = useCallback((isCorrect: boolean, questionId: string, optionId: string) => {
        setUserAnswers((prev) => ({ ...prev, [questionId]: optionId }))
    }, [])

    const handleNext = useCallback(() => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex((i) => i + 1)
        } else {
            setPhase("result")
        }
    }, [currentIndex, questions.length])

    const handleBack = useCallback(() => {
        if (currentIndex > 0) setCurrentIndex((i) => i - 1)
    }, [currentIndex])

    const handleRestart = useCallback(() => {
        setPhase("lang")
        setQuestions([])
        setCurrentIndex(0)
        setUserAnswers({})
        setTimeUsed(0)
    }, [])

    /* ─ Language selection ─ */
    if (phase === "lang") {
        return (
            <>
                {/* Background faint page */}
                <div className="flex flex-col min-h-screen bg-background text-foreground font-sans p-6 md:p-12">
                    <button
                        onClick={() => router.push("/enem/2017")}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group mb-8"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        Voltar
                    </button>
                    <div className="flex flex-col items-center justify-center flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <BookOpen className="w-8 h-8 text-primary" />
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-widest">ENEM 2017</p>
                                <h1 className="text-2xl font-bold">Dia 1</h1>
                            </div>
                        </div>
                        <p className="text-muted-foreground text-sm text-center max-w-xs">
                            Linguagens, Ciências Humanas · 90 questões · 5h30
                        </p>
                    </div>
                </div>
                <LanguageModal onSelect={handleLangSelect} />
            </>
        )
    }

    /* ─ Result screen ─ */
    if (phase === "result") {
        return (
            <ResultScreen
                questions={questions}
                userAnswers={userAnswers}
                timeUsed={timeUsed}
                onRestart={handleRestart}
                onHome={() => router.push("/enem")}
            />
        )
    }

    /* ─ Exam ─ */
    const currentQuestion = questions[currentIndex]
    if (!currentQuestion) return null

    const isLast = currentIndex === questions.length - 1

    return (
        <QuestionScreen
            key={currentIndex}
            questionIndex={currentIndex}
            totalQuestions={questions.length}
            question={currentQuestion}
            onAnswer={handleAnswer}
            onNext={handleNext}
            onBack={currentIndex > 0 ? handleBack : undefined}
            timeRemaining={timeRemaining}
            initialSelectedOptionId={userAnswers[currentQuestion.id] ?? null}
            nextButtonText={isLast ? "Finalizar" : "Avançar"}
        />
    )
}
