"use client"

import { useExam } from "@/contexts/ExamContext"
import { useEnemExam } from "@/contexts/EnemExamContext"
import { usePathname, useRouter } from "next/navigation"
import { ClipboardList, GraduationCap } from "lucide-react"

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function ActiveExamIndicator() {
    const { activeExams } = useExam()
    const { activeEnemExams } = useEnemExam()
    const pathname = usePathname()
    const router = useRouter()

    const showSimulado = activeExams.length > 0 && !pathname.startsWith('/simulado/active')
    const showEnem = activeEnemExams.length > 0 && !pathname.match(/^\/enem\/\d{4}\/dia\d\/enem-/)

    if (!showSimulado && !showEnem) return null

    return (
        <>
            {showSimulado && (() => {
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
            })()}
            {showEnem && (() => {
                const latestEnem = activeEnemExams[activeEnemExams.length - 1]
                const isUrgent = latestEnem.timeRemaining <= 5 * 60
                return (
                    <button
                        onClick={() => router.push(`/enem/${latestEnem.ano}/${latestEnem.dia}/${latestEnem.examId}`)}
                        title={`Voltar para ENEM ${latestEnem.ano} ${latestEnem.dia === 'dia1' ? 'Dia 1' : 'Dia 2'}`}
                        className={`
                            flex items-center gap-2 px-3 py-2 rounded-full
                            shadow-lg border backdrop-blur-md
                            transition-all duration-300 cursor-pointer
                            hover:scale-105 active:scale-95
                            ${isUrgent
                                ? 'bg-danger/90 border-danger/50 text-white shadow-danger/30 animate-pulse'
                                : 'bg-emerald-600/90 border-emerald-500/50 text-white shadow-emerald-500/30'
                            }
                        `}
                    >
                        <GraduationCap className="w-4 h-4" />
                        <span className="text-sm font-semibold">
                            ENEM {latestEnem.ano}
                        </span>
                    </button>
                )
            })()}
        </>
    )
}
