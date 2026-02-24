"use client"

import { useState, useEffect, useRef } from "react"
import { experimental_useObject as useObject } from "@ai-sdk/react"
import { z } from "zod"
import { QuestionScreen, type Question } from "@/components/exam/QuestionScreen"
import { ResultDashboard } from "@/components/exam/ResultDashboard"
import { useDocuments } from "@/contexts/DocumentContext"
import { FileText, Trash2 } from "lucide-react"

export default function SimuladoPage() {
    const [questions] = useState<Question[]>([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [isFinished, setIsFinished] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [correctCount, setCorrectCount] = useState(0)
    const [wrongCount, setWrongCount] = useState(0)
    const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})

    const { addDocument, documents, removeDocument } = useDocuments()
    const [isSetupState, setIsSetupState] = useState(true)
    const [generationProgress, setGenerationProgress] = useState(0)
    const [topic, setTopic] = useState("")
    const [questionCount, setQuestionCount] = useState(30)
    const [timeLimit, setTimeLimit] = useState(60)
    const [timeRemaining, setTimeRemaining] = useState(60 * 60) // in seconds
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

    // AI Stream Hook
    const { object, submit, isLoading } = useObject({
        api: "/api/generate-exam",
        schema: z.object({
            questions: z.array(
                z.object({
                    id: z.string(),
                    text: z.string(),
                    options: z.array(
                        z.object({
                            id: z.string(),
                            letter: z.string(),
                            text: z.string(),
                            isCorrect: z.boolean(),
                            explanation: z.string().optional(),
                        })
                    ),
                })
            ),
        }),
        onFinish() {
            // Streaming finished, nothing to reset – the user continues naturally
        },
        onError(err: Error) {
            console.error(err)
            alert("Erro ao gerar simulado com Inteligência Artificial.")
            setIsSetupState(true)
        }
    })

    const questionsStream = object?.questions || [];
    const isGenerating = isLoading; // Rename internally for easier conditional logic
    // We consider the generation "usable" as soon as it gives us the first complete question
    const hasStartedReceiving = questionsStream.length > 0;

    // We keep this to animate the spinner if the very first chunk takes a while
    useEffect(() => {
        if (!isLoading || hasStartedReceiving) return;

        const timer = setInterval(() => {
            setGenerationProgress(prev => {
                if (prev >= 99) return 99;
                return prev + 1; // Faster visual progression
            });
        }, 100);

        return () => clearInterval(timer);
    }, [isLoading, hasStartedReceiving]);

    // Keep a ref so the timer interval always has fresh state without stale closures
    const timeoutCallbackRef = useRef<() => void>(() => { });
    useEffect(() => {
        timeoutCallbackRef.current = () => {
            saveAndFinishExam(activeQuestionsList, userAnswers, correctCount);
        };
    });

    // Countdown timer - starts as soon as the first question appears
    useEffect(() => {
        if (isSetupState || isFinished || !hasStartedReceiving) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    timeoutCallbackRef.current();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isSetupState, isFinished, hasStartedReceiving]);

    const handleGenerateExam = () => {
        setGenerationProgress(0)
        setTimeRemaining(timeLimit * 60)
        setIsSetupState(false)
        submit({
            fileUris: documents.map(d => d.url),
            topic: topic || "Conhecimentos gerais do documento",
            questionCount
        })
    }

    const handleAnswer = (isCorrect: boolean, questionId: string, optionId: string) => {
        setUserAnswers(prev => ({ ...prev, [questionId]: optionId }))
        if (isCorrect) {
            setCorrectCount(prev => prev + 1)
        } else {
            setWrongCount(prev => prev + 1)
        }
    }

    // Only include questions that are fully streamed (have options array)
    const rawList = questions.length > 0 ? questions : (questionsStream as Question[]);
    const activeQuestionsList = rawList.filter(q => q && Array.isArray(q.options) && q.options.length > 0);

    const saveAndFinishExam = async (questionsList: Question[], answers: Record<string, string>, correct: number) => {
        setIsSaving(true)
        try {
            const totalSeconds = timeLimit * 60 - timeRemaining;

            await fetch("/api/save-exam", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pontuacao: correct,
                    totalQuestoes: questionsList.length,
                    duracao: totalSeconds,
                    questoes: questionsList,
                    respostas: answers
                })
            });
        } catch (error) {
            console.error("Failed to save exam to history:", error);
        } finally {
            setIsFinished(true)
            setIsSaving(false)
        }
    }

    const handleNext = async () => {
        if (currentQuestionIndex < activeQuestionsList.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1)
        } else {
            // Se chegou no final dos chunks E ainda tá carregando, bloqueia avanço
            if (isGenerating && currentQuestionIndex === activeQuestionsList.length - 1) return;

            await saveAndFinishExam(activeQuestionsList, userAnswers, correctCount)
        }
    }

    const handleRestart = () => {
        setCurrentQuestionIndex(0)
        setIsFinished(false)
        setCorrectCount(0)
        setWrongCount(0)
        setUserAnswers({})
        setTimeRemaining(timeLimit * 60)
        setIsSetupState(false)
    }

    const handleBackToSetup = () => {
        setIsSetupState(true)
        setTopic("")
    }

    // Ignoradas = total - (corretas + erradas), default to current generated length
    const skippedCount = activeQuestionsList.length - (correctCount + wrongCount)

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
                        <label className={`flex flex-col items-center justify-center gap-2 w-full px-4 py-16 bg-secondary/30 border border-dashed rounded-xl text-sm font-medium transition-colors ${isUploading ? 'border-primary text-primary opacity-50 cursor-not-allowed' : 'border-input hover:border-foreground/50 text-foreground cursor-pointer group'}`}>
                            {isUploading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <span>Enviando...</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-center">Clique para fazer upload ou<br />arraste os arquivos</span>
                                    <input type="file" multiple className="hidden" accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png" onChange={handleUploadDocument} disabled={isUploading} />
                                </>
                            )}
                        </label>
                        <p className="text-xs text-muted-foreground text-center">Formatos aceitos: PDF, TXT, DOC, DOCX</p>
                    </div>

                    <div className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-[200px] pr-2">
                        {documents.map(doc => (
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
                        ))}
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

    // Only show full-page loader if we haven't received ANY chunks yet
    if (isGenerating && !hasStartedReceiving) {
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
            </div>
        )
    }

    if (isFinished) {
        return (
            <ResultDashboard
                totalQuestions={activeQuestionsList.length}
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



            {activeQuestionsList[currentQuestionIndex] ? (
                <QuestionScreen
                    key={currentQuestionIndex}
                    questionIndex={currentQuestionIndex}
                    totalQuestions={questionCount} // Show the planned total
                    question={activeQuestionsList[currentQuestionIndex] as Question}
                    onNext={handleNext}
                    onAnswer={handleAnswer}
                    timeRemaining={timeRemaining}
                />
            ) : (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    )
}
