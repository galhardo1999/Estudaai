"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Calculator } from "lucide-react"
import { useEnemExam, type EnemQuestion } from "@/contexts/EnemExamContext"
import provaData from "@/Provas/Enem/2025/enem-2025-dia2.json"

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

/* ─── Assemble Dia 2 questions ────────────────────────────────── */
function buildDia2Questions(): EnemQuestion[] {
    const secoes = provaData.secoes as Record<string, JsonQuestion[]>

    const natureza = (secoes["ciencias_natureza_91_a_135"] ?? []).map((q) => buildQuestion(q, "cn"))
    const matematica = (secoes["matematica_136_a_180"] ?? []).map((q) => buildQuestion(q, "mt"))

    return [...natureza, ...matematica]
}

/* ─── Launcher Page ─────────────────────────────────────────────── */
const TEMPO_DIA2 = 5 * 60 * 60 // 5h em segundos

export default function Enem2025Dia2Page() {
    const router = useRouter()
    const enemExam = useEnemExam()
    const [isStarting, setIsStarting] = useState(false)

    const handleStart = useCallback(() => {
        if (isStarting) return
        setIsStarting(true)

        const questions = buildDia2Questions()
        const id = `enem-2025-d2-${Date.now().toString(36)}`

        enemExam.startEnemExam(id, "2025", "dia2", questions, TEMPO_DIA2)
        router.push(`/enem/2025/dia2/${id}`)
    }, [enemExam, router, isStarting])

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans p-6 md:p-12">
            <button
                onClick={() => router.push("/enem/2025")}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group mb-8"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Voltar
            </button>
            <div className="flex flex-col items-center justify-center flex-1">
                <div className="flex items-center gap-3 mb-4">
                    <Calculator className="w-8 h-8 text-blue-400" />
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">ENEM 2025</p>
                        <h1 className="text-2xl font-bold">Dia 2</h1>
                    </div>
                </div>
                <p className="text-muted-foreground text-sm text-center max-w-xs mb-8">
                    Ciências da Natureza, Matemática · 90 questões · 5h
                </p>

                {!isStarting ? (
                    <button
                        onClick={handleStart}
                        className="bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-8 rounded-full transition-colors shadow-lg shadow-primary/20 hover:shadow-primary/30"
                    >
                        Iniciar Prova
                    </button>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground animate-pulse">Iniciando prova...</p>
                    </div>
                )}
            </div>
        </div>
    )
}
