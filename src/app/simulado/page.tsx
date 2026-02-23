"use client"

import { useState } from "react"
import { QuestionScreen, type Question } from "@/components/exam/QuestionScreen"
import { ResultDashboard } from "@/components/exam/ResultDashboard"
import { useDocuments } from "@/contexts/DocumentContext"

export default function SimuladoPage() {
    const [questions, setQuestions] = useState<Question[]>([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [isFinished, setIsFinished] = useState(false)
    const [correctCount, setCorrectCount] = useState(0)
    const [wrongCount, setWrongCount] = useState(0)

    // Setup States
    const { addDocument, activeDocument } = useDocuments()
    const [isSetupState, setIsSetupState] = useState(true)
    const [isGenerating, setIsGenerating] = useState(false)
    const [topic, setTopic] = useState("")
    const [questionCount, setQuestionCount] = useState(30)
    const [timeLimit, setTimeLimit] = useState(60)
    const [isUploading, setIsUploading] = useState(false)

    const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsUploading(true)
            try {
                const formData = new FormData()
                formData.append("file", e.target.files[0])

                const res = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                })

                if (!res.ok) throw new Error("Upload failed")

                const data = await res.json()
                addDocument({ id: data.document.id, name: data.document.name, url: data.document.url })

            } catch (error) {
                console.error("Erro no upload", error)
                alert("Falha ao carregar o arquivo.")
            } finally {
                setIsUploading(false)
            }
        }
    }

    const handleGenerateExam = async () => {
        setIsGenerating(true)
        setIsSetupState(false)
        try {
            const res = await fetch("/api/generate-exam", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileUri: activeDocument?.url || "mock-selected-document-uri",
                    topic: topic || "Conhecimentos gerais do documento",
                    questionCount
                })
            })

            if (!res.ok) throw new Error("Failed to generate exam")

            const data = await res.json()
            if (data.questions && data.questions.length > 0) {
                setQuestions(data.questions)
                handleRestart()
            }
        } catch (error) {
            console.error(error)
            alert("Erro ao gerar novo simulado. Usando mock.")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleAnswer = (isCorrect: boolean) => {
        if (isCorrect) {
            setCorrectCount(prev => prev + 1)
        } else {
            setWrongCount(prev => prev + 1)
        }
    }

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1)
        } else {
            setIsFinished(true)
        }
    }

    const handleRestart = () => {
        setCurrentQuestionIndex(0)
        setIsFinished(false)
        setCorrectCount(0)
        setWrongCount(0)
        setIsSetupState(false)
    }

    const handleBackToSetup = () => {
        setIsSetupState(true)
        setTopic("")
    }

    // Ignoradas = total - (corretas + erradas)
    const skippedCount = questions.length - (correctCount + wrongCount)

    if (isSetupState) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 min-h-screen">
                <div className="w-full max-w-2xl bg-card border border-border/50 rounded-2xl p-8 flex flex-col gap-6">
                    <div>
                        <h1 className="text-2xl font-semibold mb-2">Preparar Simulado</h1>
                        <p className="text-zinc-400 text-sm">Configure o material base e os assuntos que você deseja focar neste simulado.</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground">Material de Estudo (PDF/TXT)</label>
                        <label className={`flex items-center justify-center gap-2 w-full px-4 py-8 bg-secondary/30 border border-dashed rounded-xl text-sm font-medium transition-colors ${isUploading ? 'border-primary text-primary opacity-50 cursor-not-allowed' : 'border-input hover:border-foreground/50 text-foreground cursor-pointer group'}`}>
                            {isUploading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <span>Enviando para o Gemini...</span>
                                </>
                            ) : (
                                <>
                                    <span>Clique para fazer upload ou arraste o arquivo</span>
                                    <input type="file" className="hidden" accept=".pdf,.txt" onChange={handleUploadDocument} disabled={isUploading} />
                                </>
                            )}
                        </label>
                        {activeDocument && <span className="text-xs text-success ml-1">✓ Arquivo selecionado: {activeDocument.name}</span>}
                        {!activeDocument && <span className="text-xs text-amber-500/80 ml-1">⚠ Selecione um documento na lateral ou faça upload de um novo</span>}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground">Sobre qual assunto é o simulado?</label>
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Ex: Foque apenas em Atos Administrativos e Poderes da Administração..."
                            className="w-full bg-secondary/30 border border-input rounded-xl p-4 min-h-[100px] text-sm focus:outline-none focus:border-primary resize-none placeholder:text-muted-foreground text-foreground"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground">Quantas questões?</label>
                        <div className="flex flex-wrap gap-3">
                            {[30, 40, 45, 60, 90, 120].map((count) => (
                                <button
                                    key={count}
                                    onClick={() => setQuestionCount(count)}
                                    className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${questionCount === count
                                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                        : "bg-secondary/30 border-input hover:border-foreground/50 text-foreground"
                                        }`}
                                >
                                    {count}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground">Quanto tempo limite?</label>
                        <div className="flex flex-wrap gap-3">
                            {[15, 30, 45, 60, 90, 120].map((time) => (
                                <button
                                    key={time}
                                    onClick={() => setTimeLimit(time)}
                                    className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${timeLimit === time
                                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                        : "bg-secondary/30 border-input hover:border-foreground/50 text-foreground"
                                        }`}
                                >
                                    {time} min
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleGenerateExam}
                            className="bg-primary hover:bg-primary-hover text-white font-semibold py-3 px-8 rounded-full transition-colors w-full md:w-auto"
                        >
                            Gerar Simulado
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (isGenerating) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-xl font-medium animate-pulse">A IA está lendo seu material e criando questões...</h2>
                <p className="text-zinc-400 mt-2">Focando no assunto: {topic || "Geral"}</p>
            </div>
        )
    }

    if (isFinished) {
        return (
            <ResultDashboard
                totalQuestions={questions.length}
                correctCount={correctCount}
                wrongCount={wrongCount}
                skippedCount={skippedCount}
                onReview={handleRestart}
                onMoreQuestions={handleBackToSetup}
            />
        )
    }

    return (
        <div className="relative min-h-screen">
            <QuestionScreen
                questionIndex={currentQuestionIndex}
                totalQuestions={questions.length}
                question={questions[currentQuestionIndex]}
                onNext={handleNext}
                onAnswer={handleAnswer}
                correctCount={correctCount}
                errorsCount={wrongCount}
            />
        </div>
    )
}
