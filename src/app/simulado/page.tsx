"use client"

import { useState, useEffect } from "react"
import { QuestionScreen, type Question } from "@/components/exam/QuestionScreen"
import { ResultDashboard } from "@/components/exam/ResultDashboard"
import { useDocuments } from "@/contexts/DocumentContext"
import { FileText, Trash2 } from "lucide-react"

export default function SimuladoPage() {
    const [questions, setQuestions] = useState<Question[]>([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [isFinished, setIsFinished] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [correctCount, setCorrectCount] = useState(0)
    const [wrongCount, setWrongCount] = useState(0)

    // Setup States
    const { addDocument, activeDocument, documents, setActiveDocumentId, removeDocument } = useDocuments()
    const [isSetupState, setIsSetupState] = useState(true)
    const [isGenerating, setIsGenerating] = useState(false)
    const [generationProgress, setGenerationProgress] = useState(0)
    const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0)
    const [topic, setTopic] = useState("")
    const [questionCount, setQuestionCount] = useState(30)
    const [timeLimit, setTimeLimit] = useState(60)
    const [isUploading, setIsUploading] = useState(false)

    const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsUploading(true)
            try {
                const files = Array.from(e.target.files)
                const uploadPromises = files.map(async (file) => {
                    const formData = new FormData()
                    formData.append("file", file)

                    const res = await fetch("/api/upload", {
                        method: "POST",
                        body: formData,
                    })

                    if (!res.ok) throw new Error(`Upload failed for ${file.name}`)

                    const data = await res.json()
                    addDocument({
                        id: data.document.id,
                        name: data.document.name,
                        url: data.document.url,
                        createdAt: Date.now()
                    })
                })

                await Promise.all(uploadPromises)

            } catch (error) {
                console.error("Erro no upload", error)
                alert("Falha ao carregar um ou mais arquivos.")
            } finally {
                setIsUploading(false)
            }
        }
    }

    useEffect(() => {
        if (!isGenerating) return;

        // Estimate ~1.5 seconds per question
        const estimatedSeconds = questionCount * 1.5;
        const updateIntervalMs = 1000;
        const increment = 100 / estimatedSeconds;

        const timer = setInterval(() => {
            setGenerationProgress(prev => {
                if (prev >= 95) return 95; // Hold at 95% until complete
                return prev + increment;
            });
            setEstimatedTimeRemaining(prev => Math.max(0, prev - 1));
        }, updateIntervalMs);

        return () => clearInterval(timer);
    }, [isGenerating, questionCount]);

    const handleGenerateExam = async () => {
        setIsGenerating(true)
        setGenerationProgress(0)
        setEstimatedTimeRemaining(Math.ceil(questionCount * 1.5))
        setIsSetupState(false)
        try {
            const res = await fetch("/api/generate-exam", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileUris: documents.map(d => d.url),
                    topic: topic || "Conhecimentos gerais do documento",
                    questionCount
                })
            })

            if (!res.ok) throw new Error("Failed to generate exam")

            const data = await res.json()
            if (data.questions && data.questions.length > 0) {
                setGenerationProgress(100)
                setTimeout(() => {
                    setQuestions(data.questions)
                    handleRestart()
                    setIsGenerating(false)
                }, 500)
                return; // early return to wait for animation
            }
        } catch (error) {
            console.error(error)
            alert("Erro ao gerar novo simulado. Usando mock.")
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

    const handleNext = async () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1)
        } else {
            setIsSaving(true)

            try {
                // Determine document ID for relation, prefer first active/used doc if available
                const savedDocId = documents.length > 0 ? documents[0].id : null;

                await fetch("/api/save-exam", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        pontuacao: correctCount,
                        totalQuestoes: questions.length,
                        duracao: 0, // Implementar timer no futuro
                        documentoId: null
                    })
                });
            } catch (error) {
                console.error("Failed to save exam to history:", error);
            } finally {
                setIsFinished(true)
                setIsSaving(false)
            }
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
            <div className="flex-1 flex flex-col md:flex-row items-stretch justify-start gap-6 p-6 md:p-12 min-h-screen max-w-6xl mx-auto w-full">
                {/* Left Card: Material de Estudo */}
                <div className="w-full md:w-1/3 bg-card border border-border/50 rounded-2xl p-6 flex flex-col gap-6">
                    <div>
                        <h2 className="text-xl font-semibold mb-2">Material de Estudo</h2>
                        <p className="text-zinc-400 text-sm">Gerencie os arquivos que servirão de base para seus simulados.</p>
                    </div>

                    <div>
                        <label className={`flex flex-col items-center justify-center gap-2 w-full px-4 py-6 bg-secondary/30 border border-dashed rounded-xl text-sm font-medium transition-colors ${isUploading ? 'border-primary text-primary opacity-50 cursor-not-allowed' : 'border-input hover:border-foreground/50 text-foreground cursor-pointer group'}`}>
                            {isUploading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <span>Enviando...</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-center">Clique para fazer upload ou<br />arraste os arquivos</span>
                                    <input type="file" multiple className="hidden" accept=".pdf,.txt" onChange={handleUploadDocument} disabled={isUploading} />
                                </>
                            )}
                        </label>
                    </div>

                    <div className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-[200px] pr-2">
                        {documents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-border/50 rounded-xl h-32">
                                <FileText className="w-8 h-8 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
                            </div>
                        ) : (
                            documents.map(doc => (
                                <div
                                    key={doc.id}
                                    className="p-3 rounded-xl border border-border/50 flex items-center justify-between transition-colors hover:bg-zinc-800/50"
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-2 rounded-lg shrink-0 bg-zinc-800 text-zinc-400">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-medium truncate">{doc.name}</span>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeDocument(doc.id); }}
                                        className="p-1.5 text-zinc-500 hover:text-danger hover:bg-danger/10 rounded-md shrink-0 ml-2"
                                        title="Remover documento"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Card: Preparar Simulado */}
                <div className="w-full md:w-2/3 bg-card border border-border/50 rounded-2xl p-8 flex flex-col gap-6">
                    <div>
                        <h1 className="text-2xl font-semibold mb-2">Preparar Simulado</h1>
                        <p className="text-zinc-400 text-sm">Configure os assuntos e regras do seu próximo simulado.</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground">Sobre qual assunto é o simulado?</label>
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Ex: Foque apenas em Atos Administrativos e Poderes da Administração..."
                            className="w-full bg-secondary/30 border border-input rounded-xl p-4 min-h-[120px] text-sm focus:outline-none focus:border-primary resize-none placeholder:text-muted-foreground text-foreground"
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

                    <div className="flex md:flex-row flex-col items-center justify-between mt-4 gap-4">
                        <div className="flex-1 w-full">
                            {documents.length === 0 && <p className="text-sm text-amber-500/80">⚠ Faça upload de pelo menos um documento na lateral antes de gerar.</p>}
                        </div>
                        <button
                            onClick={handleGenerateExam}
                            disabled={documents.length === 0}
                            className={`font-semibold py-3 px-8 rounded-full transition-colors w-full md:w-auto ${documents.length === 0 ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover text-white'}`}
                        >
                            Gerar Simulado
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (isGenerating) {
        const radius = 45;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (generationProgress / 100) * circumference;

        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
                <div className="relative w-32 h-32 mb-8">
                    {/* Background Circle */}
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                            cx="50" cy="50" r={radius}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="6"
                            className="text-zinc-800"
                        />
                        {/* Progress Circle */}
                        <circle
                            cx="50" cy="50" r={radius}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="6"
                            className="text-primary transition-all duration-1000 ease-out"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-foreground">
                            {Math.round(generationProgress)}%
                        </span>
                    </div>
                </div>

                <h2 className="text-xl font-medium">A IA está lendo seu material e criando questões...</h2>
                <p className="text-zinc-400 mt-2 mb-1">Focando no assunto: {topic || "Geral"}</p>
                <p className="text-zinc-500 text-sm">
                    Tempo estimado restante: ~{estimatedTimeRemaining} segundos
                </p>
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

    if (isSaving) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-xl font-medium animate-pulse">Salvando seu resultado no histórico...</h2>
            </div>
        )
    }

    return (
        <div className="relative min-h-screen">
            <QuestionScreen
                key={currentQuestionIndex}
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
