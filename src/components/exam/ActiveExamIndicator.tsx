"use client"

import { useExam } from "@/contexts/ExamContext"
import { usePathname, useRouter } from "next/navigation"
import { ClipboardList } from "lucide-react"

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function ActiveExamIndicator() {
    const { activeExams } = useExam()
    const pathname = usePathname()
    const router = useRouter()

    // Don't show when on the active exam page or when no exams are active
    if (activeExams.length === 0 || pathname.startsWith('/simulado/active')) return null

    // Show the most recent active exam
    const latestExam = activeExams[activeExams.length - 1]
    const isUrgent = latestExam.questions.length > 0 && latestExam.timeRemaining <= 5 * 60

    return (
        <button
            onClick={() => router.push(`/simulado/active/${latestExam.examId}`)}
            title={`Voltar para o simulado #${latestExam.examId}`}
            className={`
                flex items-center gap-2 px-3 py-2 rounded-full
                shadow-lg border backdrop-blur-md
                transition-all duration-300 cursor-pointer
                hover:scale-105 active:scale-95
                ${isUrgent
                    ? 'bg-danger/90 border-danger/50 text-white shadow-danger/30 animate-pulse'
                    : 'bg-primary/90 border-primary/50 text-white shadow-primary/30'
                }
            `}
        >
            <ClipboardList className="w-4 h-4" />
            <span className="text-sm font-semibold tabular-nums">
                #{latestExam.examId}
                {activeExams.length > 1 && ` +${activeExams.length - 1}`}
            </span>
        </button>
    )
}
