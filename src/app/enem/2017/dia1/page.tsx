"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Globe, BookOpen } from "lucide-react"
import { useEnemExam, type EnemQuestion } from "@/contexts/EnemExamContext"
import provaData from "@/Provas/Enem/2017/enem-2017-dia1.json"

/* ─── Types ────────────────────────────────────────────────────── */
interface JsonQuestion {
    numero: number
    enunciado: string
    alternativas: Record<string, string>
    gabarito: string
}

/* ─── Transform JSON → Question format ────────────────────────── */
function buildQuestion(q: JsonQuestion, sectionPrefix: string): EnemQuestion {
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
function buildDia1Questions(idioma: "ingles" | "espanhol"): EnemQuestion[] {
    const secoes = provaData.secoes as Record<string, JsonQuestion[]>

    const idiomQuestions =
        idioma === "ingles"
            ? (secoes["opcao_ingles_01_a_05"] ?? []).map((q) => buildQuestion(q, "ing"))
            : (secoes["opcao_espanhol_01_a_05"] ?? []).map((q) => buildQuestion(q, "esp"))

    const linguagens = (secoes["linguagens_06_a_45"] ?? []).map((q) => buildQuestion(q, "lc"))
    const humanas = (secoes["ciencias_humanas_46_a_90"] ?? []).map((q) => buildQuestion(q, "ch"))

    return [...idiomQuestions, ...linguagens, ...humanas]
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

/* ─── Launcher Page ─────────────────────────────────────────────── */
const TEMPO_DIA1 = 5 * 60 * 60 + 30 * 60 // 5h30 em segundos

export default function Enem2017Dia1Page() {
    const router = useRouter()
    const enemExam = useEnemExam()
    const [showLangModal, setShowLangModal] = useState(true)
    const [isStarting, setIsStarting] = useState(false)

    const handleLangSelect = useCallback((idioma: "ingles" | "espanhol") => {
        if (isStarting) return // Previne duplo-clique
        setIsStarting(true)
        setShowLangModal(false)

        const questions = buildDia1Questions(idioma)
        const id = `enem-2017-d1-${Date.now().toString(36)}`

        enemExam.startEnemExam(id, "2017", "dia1", questions, TEMPO_DIA1)
        router.push(`/enem/2017/dia1/${id}`)
    }, [enemExam, router, isStarting])

    return (
        <>
            {/* Background page */}
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

                    {/* Loading spinner enquanto redireciona */}
                    {isStarting && (
                        <div className="mt-8 flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-muted-foreground animate-pulse">Iniciando prova...</p>
                        </div>
                    )}
                </div>
            </div>
            {showLangModal && !isStarting && <LanguageModal onSelect={handleLangSelect} />}
        </>
    )
}
