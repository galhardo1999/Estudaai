"use client"

import { useState, useCallback, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Globe, BookOpen, Calculator, AlertTriangle, Loader2 } from "lucide-react"
import { useEnemExam, type EnemQuestion } from "@/contexts/EnemExamContext"
import { diasConfig, isDiaDisponivel, type DiaConfig } from "@/lib/enem-config"
import { getExamData } from "@/Provas/ENEM/getExamData"

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

/* ─── Assemble questions from JSON sections ───────────────────── */
function buildQuestions(
    secoes: Record<string, JsonQuestion[]>,
    config: DiaConfig,
    idioma?: "ingles" | "espanhol"
): EnemQuestion[] {
    const questions: EnemQuestion[] = []

    // Adiciona questões de idioma (dia 1)
    if (config.sectionConfig.requiresLanguageSelection && config.sectionConfig.languageSections && idioma) {
        const langSection = idioma === "ingles"
            ? config.sectionConfig.languageSections.ingles
            : config.sectionConfig.languageSections.espanhol
        const langQuestions = (secoes[langSection.key] ?? []).map((q) => buildQuestion(q, langSection.prefix))
        questions.push(...langQuestions)
    }

    // Adiciona questões das seções padrão
    for (const section of config.sectionConfig.sections) {
        const sectionQuestions = (secoes[section.key] ?? []).map((q) => buildQuestion(q, section.prefix))
        questions.push(...sectionQuestions)
    }

    return questions
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

/* ─── Unavailable Screen ────────────────────────────────────────── */
function UnavailableScreen({ ano, dia }: { ano: string; dia: string }) {
    const router = useRouter()
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans p-6 md:p-12">
            <button
                onClick={() => router.push(`/enem/${ano}`)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group mb-8"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Voltar
            </button>
            <div className="flex flex-col items-center justify-center flex-1 gap-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-amber-400" />
                </div>
                <h1 className="text-2xl font-bold">Prova indisponível</h1>
                <p className="text-muted-foreground text-sm text-center max-w-xs">
                    A prova do ENEM {ano} — {dia === "dia1" ? "Dia 1" : "Dia 2"} ainda não está disponível para simulação.
                </p>
                <button
                    onClick={() => router.push(`/enem/${ano}`)}
                    className="mt-4 bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 px-6 rounded-full transition-colors"
                >
                    Ver outras opções
                </button>
            </div>
        </div>
    )
}

/* ─── Launcher Page ─────────────────────────────────────────────── */
export default function EnemDiaPage({ params }: { params: Promise<{ ano: string; dia: string }> }) {
    const { ano, dia } = use(params)
    const router = useRouter()
    const enemExam = useEnemExam()
    const [isStarting, setIsStarting] = useState(false)
    const [showLangModal, setShowLangModal] = useState(false)
    const [provaData, setProvaData] = useState<Record<string, JsonQuestion[]> | null>(null)
    const [loadError, setLoadError] = useState(false)

    // Busca a configuração do dia
    const diaConfig = diasConfig.find((d) => d.slug === dia)
    const disponivel = isDiaDisponivel(ano, dia)

    // Carrega o JSON dinamicamente
    useEffect(() => {
        if (!disponivel || !diaConfig) return

        getExamData(ano, dia)
            .then((mod) => {
                setProvaData(mod.default.secoes as Record<string, JsonQuestion[]>)
                // Se dia 1, abre modal de idioma automaticamente
                if (diaConfig.sectionConfig.requiresLanguageSelection) {
                    setShowLangModal(true)
                }
            })
            .catch(() => {
                setLoadError(true)
            })
    }, [ano, dia, disponivel, diaConfig])

    // Se não está disponível, mostra tela de indisponível
    if (!disponivel || !diaConfig) {
        return <UnavailableScreen ano={ano} dia={dia} />
    }

    // Erro ao carregar o JSON
    if (loadError) {
        return <UnavailableScreen ano={ano} dia={dia} />
    }

    const startExam = (idioma?: "ingles" | "espanhol") => {
        if (isStarting || !provaData || !diaConfig) return
        setIsStarting(true)
        setShowLangModal(false)

        const questions = buildQuestions(provaData, diaConfig, idioma)
        const diaNum = dia === "dia1" ? "d1" : "d2"
        const id = `enem-${ano}-${diaNum}-${Date.now().toString(36)}`

        enemExam.startEnemExam(id, ano, dia, questions, diaConfig.tempoSegundos)
        router.push(`/enem/${ano}/${dia}/${id}`)
    }

    const handleLangSelect = useCallback((idioma: "ingles" | "espanhol") => {
        startExam(idioma)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [provaData, diaConfig, isStarting])

    const handleDirectStart = useCallback(() => {
        startExam()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [provaData, diaConfig, isStarting])

    const Icon = diaConfig.icon
    const diaLabel = dia === "dia1" ? "Dia 1" : "Dia 2"
    const areasText = diaConfig.areas.join(", ").replace(/, ([^,]*)$/, " · $1")

    // Loading JSON
    if (!provaData && !loadError) {
        return (
            <div className="flex flex-col min-h-screen bg-background text-foreground font-sans p-6 md:p-12">
                <button
                    onClick={() => router.push(`/enem/${ano}`)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group mb-8"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Voltar
                </button>
                <div className="flex flex-col items-center justify-center flex-1 gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Carregando prova...</p>
                </div>
            </div>
        )
    }

    return (
        <>
            {/* Background page */}
            <div className="flex flex-col min-h-screen bg-background text-foreground font-sans p-6 md:p-12">
                <button
                    onClick={() => router.push(`/enem/${ano}`)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group mb-8"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Voltar
                </button>
                <div className="flex flex-col items-center justify-center flex-1">
                    <div className="flex items-center gap-3 mb-4">
                        <Icon className={`w-8 h-8 ${diaConfig.cor}`} />
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest">ENEM {ano}</p>
                            <h1 className="text-2xl font-bold">{diaLabel}</h1>
                        </div>
                    </div>
                    <p className="text-muted-foreground text-sm text-center max-w-xs mb-8">
                        {areasText} · {diaConfig.questoes} questões · {diaConfig.tempo}
                    </p>

                    {/* Dia 2 (sem modal de idioma): botão de iniciar */}
                    {!diaConfig.sectionConfig.requiresLanguageSelection && !isStarting && (
                        <button
                            onClick={handleDirectStart}
                            className="bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-8 rounded-full transition-colors shadow-lg shadow-primary/20 hover:shadow-primary/30"
                        >
                            Iniciar Prova
                        </button>
                    )}

                    {/* Loading spinner enquanto redireciona */}
                    {isStarting && (
                        <div className="flex flex-col items-center gap-3">
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
