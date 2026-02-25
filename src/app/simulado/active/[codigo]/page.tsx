"use client"

import { useState, useEffect, useRef, use } from "react"
import { QuestionScreen, type Question } from "@/components/exam/QuestionScreen"
import { ResultDashboard } from "@/components/exam/ResultDashboard"
import { BrainCircuit } from "lucide-react"
import { useExam } from "@/contexts/ExamContext"
import { useRouter } from "next/navigation"

export default function ActiveExamPage({ params }: { params: Promise<{ codigo: string }> }) {
    const { codigo } = use(params)
    const examCtx = useExam()
    const router = useRouter()
    const exam = examCtx.getExam(codigo)

    const [isSaving, setIsSaving] = useState(false)
    const [phraseIndex, setPhraseIndex] = useState(0)

    // Register this exam as "being viewed" — timer only runs while viewing
    useEffect(() => {
        examCtx.setViewingExamId(codigo)
        return () => examCtx.setViewingExamId(null)
    }, [codigo]) // eslint-disable-line react-hooks/exhaustive-deps

    const isThisExamGenerating = examCtx.generatingExamId === codigo && examCtx.isGenerating

    // Rotating phrases while generating
    const loadingPhrases = [
        "A I.A. está analisando seu material...",
        "Gerando questões com base no conteúdo...",
        "Criando alternativas e gabaritos...",
        "Montando o simulado perfeito pra você...",
        "Quase lá, falta pouco...",
        "Revisando a qualidade das questões...",
        "Finalizando os últimos detalhes...",
    ];

    useEffect(() => {
        if (!isThisExamGenerating || (exam && exam.questions.length > 0)) return;

        const timer = setInterval(() => {
            setPhraseIndex(prev => (prev + 1) % loadingPhrases.length);
        }, 3500);

        return () => clearInterval(timer);
    }, [isThisExamGenerating, exam?.questions.length, loadingPhrases.length]);

    // Time's up handler
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
                    questoes: activeQuestionsList,
                    respostas: exam.userAnswers
                })
            });
        } catch (error) {
            console.error("Failed to save exam to history:", error);
        } finally {
            examCtx.finishExam(codigo)
            setIsSaving(false)
        }
    }

    const handleNext = async () => {
        if (!exam) return
        if (exam.currentQuestionIndex < activeQuestionsList.length - 1) {
            examCtx.setCurrentQuestionIndex(codigo, prev => prev + 1)
        } else {
            if (isThisExamGenerating && exam.currentQuestionIndex === activeQuestionsList.length - 1) return;
            await saveAndFinishExam()
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

    // If no exam found, redirect to setup
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

    // Show results if exam is finished
    if (exam.isFinished) {
        return (
            <ResultDashboard
                totalQuestions={activeQuestionsList.length}
                correctCount={exam.correctCount}
                wrongCount={exam.wrongCount}
                skippedCount={skippedCount}
                onReview={handleRestart}
                onMoreQuestions={handleBackToSetup}
            />
        )
    }

    // Full-page loader while AI generates questions
    if (exam.questions.length === 0) {
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
                <p
                    key={phraseIndex}
                    className="text-lg font-medium text-muted-foreground text-center animate-fade-in"
                >
                    {loadingPhrases[phraseIndex]}
                </p>
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

    return (
        <div className="relative min-h-screen">
            {activeQuestionsList[exam.currentQuestionIndex] ? (
                <QuestionScreen
                    key={exam.currentQuestionIndex}
                    questionIndex={exam.currentQuestionIndex}
                    totalQuestions={activeQuestionsList.length}
                    question={activeQuestionsList[exam.currentQuestionIndex]}
                    onAnswer={handleAnswer}
                    onNext={handleNext}
                    timeRemaining={exam.timeRemaining}
                />
            ) : (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    )
}
