"use client"

import { useState } from "react"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type Question = {
    id: string
    text: string
    options: {
        id: string
        letter: string
        text: string
        isCorrect: boolean
        explanation?: string
    }[]
}

interface QuestionScreenProps {
    questionIndex: number
    totalQuestions: number
    question: Question
    onNext: () => void
    onBack?: () => void
    onAnswer: (isCorrect: boolean, questionId: string, optionId: string) => void
    timeRemaining: number
    initialSelectedOptionId?: string | null
    nextButtonText?: string
    isNextDisabled?: boolean
}

export function QuestionScreen({
    questionIndex,
    totalQuestions,
    question,
    onNext,
    onBack,
    onAnswer,
    timeRemaining,
    initialSelectedOptionId,
    nextButtonText = "Avançar",
    isNextDisabled = false,
}: QuestionScreenProps) {
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(initialSelectedOptionId || null)

    const progressPercentage = ((questionIndex) / totalQuestions) * 100

    // Formata o timeRemaining como mm:ss
    const minutes = Math.floor(timeRemaining / 60)
    const seconds = timeRemaining % 60
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    const isLowTime = timeRemaining <= 60

    const handleSelect = (optionId: string) => {
        if (selectedOptionId) return // Já respondeu
        setSelectedOptionId(optionId)
        const option = question.options.find(o => o.id === optionId)
        if (option) {
            onAnswer(option.isCorrect, question.id, option.id)
        }
    }

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
            {/* Top Bar area */}
            <div className="flex items-center gap-4 py-4 px-6 md:px-12 w-full max-w-5xl mx-auto mt-4">
                {/* Progress Bar */}
                <div
                    className="flex-1 h-1.5 bg-border rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.round(progressPercentage)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progresso: questão ${questionIndex + 1} de ${totalQuestions}`}
                >
                    <div
                        className="h-full bg-primary transition-all duration-300 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>

                <div className="flex items-center gap-4 text-sm font-medium text-zinc-400">
                    <span>{questionIndex + 1} / {totalQuestions}</span>
                    <span aria-live="polite" aria-atomic="true" className={cn(
                        "font-mono tabular-nums transition-colors",
                        isLowTime ? "text-danger animate-pulse" : "text-zinc-400"
                    )}>
                        <span className="sr-only">Tempo restante:</span>
                        ⌘ {formattedTime}
                    </span>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col w-full max-w-3xl mx-auto px-6 py-12">
                <div className="flex shrink-0 w-full mb-8">
                    <span className="text-lg font-medium mr-4">{questionIndex + 1}.</span>
                    <h2 className="text-lg md:text-xl font-medium leading-relaxed">
                        {question.text}
                    </h2>
                </div>

                <div className="flex flex-col gap-3 w-full ml-0 md:ml-8">
                    {(question.options ?? []).map((option) => {
                        const isSelected = selectedOptionId === option.id
                        const isAnswered = selectedOptionId !== null
                        const isCorrectOption = option.isCorrect

                        // Determina as classes de estado
                        let stateClasses = "bg-card border-border hover:bg-card-hover"
                        const textClasses = "text-foreground"

                        if (isAnswered) {
                            if (isSelected) {
                                if (isCorrectOption) {
                                    stateClasses = "bg-success-bg/10 border-success hover:bg-success-bg/10"
                                } else {
                                    stateClasses = "bg-danger-bg/10 border-danger hover:bg-danger-bg/10"
                                }
                            } else if (isCorrectOption) {
                                // Destaca a correta se o usuário errou
                                stateClasses = "border-success/50 bg-success-bg/5"
                            } else {
                                stateClasses = "opacity-50 bg-card border-border"
                            }
                        }

                        return (
                            <button
                                key={option.id}
                                onClick={() => handleSelect(option.id)}
                                disabled={isAnswered}
                                className={cn(
                                    "relative flex flex-col text-left w-full rounded-xl border p-4 transition-all duration-200",
                                    stateClasses
                                )}
                            >
                                <div className="flex items-start gap-4 w-full">
                                    <span className={cn(
                                        "text-base w-6 mt-0.5 font-medium",
                                        isSelected && isCorrectOption ? "text-success" :
                                            isSelected && !isCorrectOption ? "text-danger" : "text-zinc-400"
                                    )}>
                                        {option.letter}.
                                    </span>

                                    <div className="flex-1">
                                        <span className={textClasses}>{option.text}</span>

                                        {/* Explanation Section */}
                                        {isSelected && option.explanation && (
                                            <div className="mt-4 pt-4 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className={cn(
                                                    "flex items-center gap-2 font-medium mb-2",
                                                    isCorrectOption ? "text-success" : "text-danger"
                                                )}>
                                                    {isCorrectOption ? <Check aria-hidden="true" className="w-4 h-4" /> : <X aria-hidden="true" className="w-4 h-4" />}
                                                    {isCorrectOption ? "Isso mesmo!" : "Incorreto"}
                                                </div>
                                                <p className="text-muted-foreground leading-relaxed">
                                                    {option.explanation}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </main>

            {/* Bottom Action Bar */}
            <div className="w-full flex justify-between px-6 md:px-12 py-6 max-w-5xl mx-auto">
                <div>
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold tracking-wide py-2.5 px-8 rounded-full transition-all duration-200 active:scale-95 animate-in fade-in zoom-in-95"
                        >
                            Voltar
                        </button>
                    )}
                </div>
                <div>
                    {selectedOptionId && (
                        <button
                            onClick={onNext}
                            disabled={isNextDisabled}
                            className={cn(
                                "font-semibold tracking-wide py-2.5 px-8 rounded-full transition-all duration-200 active:scale-95 animate-in fade-in zoom-in-95",
                                isNextDisabled
                                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                    : "bg-primary-hover hover:bg-primary text-black"
                            )}
                        >
                            {nextButtonText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
