"use client"

import { useState, useEffect, useRef, use } from "react"
import { QuestionScreen, type Question } from "@/components/exam/QuestionScreen"
import { BrainCircuit, AlertTriangle } from "lucide-react"
import { useExam } from "@/contexts/ExamContext"
import { useRouter } from "next/navigation"

export default function ActiveExamPage({ params }: { params: Promise<{ codigo: string }> }) {
    const { codigo } = use(params)
    const examCtx = useExam()
    const router = useRouter()
    const exam = examCtx.getExam(codigo)

    const [isSaving, setIsSaving] = useState(false)

    // Registra este exame como "sendo visualizado" — o cronômetro só roda enquanto visualizado
    useEffect(() => {
        examCtx.setViewingExamId(codigo)
        return () => examCtx.setViewingExamId(null)
    }, [codigo]) // eslint-disable-line react-hooks/exhaustive-deps

    const isThisExamGenerating = examCtx.generatingExamId === codigo && examCtx.isGenerating
    const isRetrying = examCtx.generatingExamId === codigo && examCtx.generationStatus === 'retrying'
    const hasFailed = examCtx.generationStatus === 'failed' && !examCtx.generatingExamId && !exam

    // Tratamento de tempo esgotado
    const timeoutHandled = useRef(false);
    useEffect(() => {
        if (exam && exam.isActive && !exam.isFinished && exam.timeRemaining <= 0 && exam.questions.length > 0 && !timeoutHandled.current) {
            timeoutHandled.current = true;
            saveAndFinishExam();
        }
    }, [exam?.timeRemaining, exam?.isActive, exam?.isFinished]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleAnswer = (isCorrect: boolean, questionId: string, optionId: string) => {
        examCtx.answerQuestion(codigo, questionId, optionId, isCorrect)
    }

    const activeQuestionsList = (exam?.questions || []) as Question[]

    const saveAndFinishExam = async () => {
        if (!exam) return
        setIsSaving(true)
        try {
            const totalSeconds = exam.timeLimit * 60 - exam.timeRemaining;

            await fetch("/api/save-exam", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pontuacao: exam.correctCount,
                    totalQuestoes: activeQuestionsList.length,
                    duracao: totalSeconds,
                    codigo: exam.examId,
                    dificuldade: exam.dificuldade || "medio",
                    questoes: activeQuestionsList,
                    respostas: exam.userAnswers,
                    documentNames: exam.documentNames
                })
            });
        } catch (error) {
            console.error("Falha ao salvar exame no histórico:", error);
        } finally {
            examCtx.finishExam(codigo)
            setIsSaving(false)
            router.push(`/simulado/resultado/${codigo}`)
        }
    }

    const handleNext = async () => {
        if (!exam) return
        if (exam.currentQuestionIndex < activeQuestionsList.length - 1) {
            examCtx.setCurrentQuestionIndex(codigo, prev => prev + 1)
        } else {
            if (isThisExamGenerating) return; // Aguarda até a geração terminar completamente
            await saveAndFinishExam()
        }
    }

    const handleBack = () => {
        if (!exam) return
        if (exam.currentQuestionIndex > 0) {
            examCtx.setCurrentQuestionIndex(codigo, prev => prev - 1)
        }
    }

    const handleBackToSetup = () => {
        examCtx.clearExam(codigo)
        router.push('/simulado')
    }

    const handleRestart = () => {
        examCtx.clearExam(codigo)
        router.push('/simulado')
    }

    // Geração falhou permanentemente — mostra tela de erro
    if (hasFailed) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-screen gap-6 text-center px-6">
                <div className="w-20 h-20 rounded-full bg-danger/10 flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10 text-danger" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold mb-2">Falha na Geração</h2>
                    <p className="text-muted-foreground text-sm max-w-sm">
                        Não foi possível gerar o simulado após várias tentativas. Verifique se os documentos estão acessíveis e tente novamente.
                    </p>
                </div>
                <button
                    onClick={() => router.push('/simulado')}
                    className="bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-8 rounded-full transition-colors"
                >
                    Tentar Novamente
                </button>
            </div>
        )
    }

    // Se não encontrou exame no estado, redireciona para configuração
    if (!exam) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-screen gap-4">
                <p className="text-muted-foreground">Nenhum simulado ativo encontrado.</p>
                <button
                    onClick={() => router.push('/simulado')}
                    className="bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-6 rounded-lg transition-colors"
                >
                    Criar Novo Simulado
                </button>
            </div>
        )
    }

    const skippedCount = activeQuestionsList.length - (exam.correctCount + exam.wrongCount)

    // Redireciona se o exame terminou
    if (exam.isFinished) {
        router.replace(`/simulado/resultado/${codigo}`)
        return null
    }

    // Carregador em tela cheia enquanto a IA gera questões — aguarda TODAS as questões, não apenas a primeira
    if (exam.questions.length === 0 || isThisExamGenerating) {
        const questionsReceived = examCtx.questionsReceived;
        const questionCount = exam.questionCount;
        const progressPct = questionCount > 0 ? Math.min((questionsReceived / questionCount) * 100, 100) : 0;

        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-screen gap-8">
                <div className="relative w-28 h-28">
                    <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s' }} />
                    <div className="absolute inset-0 rounded-full border-4 border-primary/10 border-t-primary/40 animate-spin" style={{ animationDuration: '3s' }} />
                    <div className="absolute inset-2 rounded-full border-4 border-primary/15 border-b-primary/60 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
                    <div className="absolute inset-4 rounded-full border-4 border-primary/10 border-l-primary animate-spin" style={{ animationDuration: '1.2s' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <BrainCircuit className="w-10 h-10 text-primary animate-pulse" />
                    </div>
                </div>

                <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                    {/* Barra de progresso */}
                    <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>

                    {/* Texto de status */}
                    {isRetrying ? (
                        <p className="text-sm font-medium text-amber-400 animate-pulse">
                            ⚠ Tentando novamente... ({exam.retryCount}/{2})
                        </p>
                    ) : questionsReceived > 0 ? (
                        <p className="text-sm font-medium text-muted-foreground">
                            {questionsReceived} / {questionCount} questões geradas...
                        </p>
                    ) : (
                        <p className="text-lg font-medium text-muted-foreground text-center animate-pulse">
                            A I.A. está analisando seu material...
                        </p>
                    )}
                </div>
            </div>
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

    const isLastAvailableQuestion = exam.currentQuestionIndex === activeQuestionsList.length - 1;
    let nextButtonText = "Avançar";
    let isNextDisabled = false;

    if (isLastAvailableQuestion) {
        if (isThisExamGenerating) {
            nextButtonText = "Aguardando IA...";
            isNextDisabled = true;
        } else {
            nextButtonText = "Finalizar";
        }
    }

    return (
        <div className="relative min-h-screen">
            {/* Toast de retentativa */}
            {isRetrying && (
                <div className="fixed top-4 right-4 z-50 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg animate-in slide-in-from-top-2">
                    ⚠ Gerando questões novamente... ({exam.retryCount}/{2})
                </div>
            )}

            {/* Indicador de progresso de geração — visível durante o streaming, mesmo após questões começarem */}
            {isThisExamGenerating && !isRetrying && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-zinc-900/90 backdrop-blur-sm border border-primary/30 text-primary text-xs font-semibold px-4 py-2 rounded-full shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                    <span>
                        {examCtx.questionsReceived > 0
                            ? `${examCtx.questionsReceived} / ${exam.questionCount} questões geradas`
                            : "Gerando questões..."}
                    </span>
                    {/* Mini barra de progresso */}
                    {exam.questionCount > 0 && (
                        <div className="w-16 h-1 bg-primary/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${Math.min((examCtx.questionsReceived / exam.questionCount) * 100, 100)}%` }}
                            />
                        </div>
                    )}
                </div>
            )}


            {activeQuestionsList[exam.currentQuestionIndex] ? (
                <QuestionScreen
                    key={exam.currentQuestionIndex}
                    questionIndex={exam.currentQuestionIndex}
                    totalQuestions={exam.questionCount}
                    question={activeQuestionsList[exam.currentQuestionIndex]}
                    onAnswer={handleAnswer}
                    onNext={handleNext}
                    onBack={exam.currentQuestionIndex > 0 ? handleBack : undefined}
                    timeRemaining={exam.timeRemaining}
                    initialSelectedOptionId={exam.userAnswers[activeQuestionsList[exam.currentQuestionIndex].id]}
                    nextButtonText={nextButtonText}
                    isNextDisabled={isNextDisabled}
                />
            ) : (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    )
}
