import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { FileText, Layers, TrendingUp, ChevronLeft } from "lucide-react"
import Link from "next/link"

export default async function ResultadoPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions)

    if (!session || !session.user || !session.user.id) {
        redirect("/login")
    }

    const exame = await prisma.exame.findUnique({
        where: { id: id },
        include: { documento: true }
    })

    if (!exame) {
        notFound()
    }

    // Security check
    if (exame.usuarioId !== session.user.id) {
        redirect("/historico/simulados")
    }

    const correctCount = exame.pontuacao
    const totalQuestions = exame.totalQuestoes
    const wrongCount = totalQuestions - correctCount // Simplification for history
    const percentage = Math.round((correctCount / totalQuestions) * 100) || 0

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
            {/* Header / Back Link */}
            <div className="w-full max-w-4xl mx-auto px-6 pt-12 pb-4">
                <Link href="/historico/simulados" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Voltar para o Histórico
                </Link>
            </div>

            <main className="flex-1 w-full max-w-4xl mx-auto px-6 pb-12">
                <h1 className="text-2xl font-medium mb-2">Detalhes do Simulado</h1>
                <p className="text-zinc-400 mb-8 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {exame.nomesDocumentos?.length > 0 ? exame.nomesDocumentos.join(", ") : (exame.documento?.titulo || "Documento Geral")}
                </p>

                {/* Top Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Score Card */}
                    <div className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col justify-center">
                        <span className="text-sm text-zinc-400 font-medium mb-2">Pontuação</span>
                        <div className="text-4xl font-medium">
                            {correctCount}<span className="text-zinc-500 text-3xl">/{totalQuestions}</span>
                        </div>
                    </div>

                    {/* Percentage Card */}
                    <div className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col justify-center">
                        <span className="text-sm text-zinc-400 font-medium mb-2">de acerto</span>
                        <div className="text-4xl font-medium">
                            {percentage}%
                        </div>
                    </div>

                    {/* Breakdown Card */}
                    <div className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col justify-center text-sm font-medium">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-zinc-400">Corretas</span>
                            <span className="text-success">{correctCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-zinc-400">Erradas/Ignoradas</span>
                            <span className="text-danger">{wrongCount}</span>
                        </div>
                    </div>
                </div>

                {/* Question Detail Section */}
                {
                    (() => {
                        type ExameOption = { id: string; letter: string; text: string; isCorrect: boolean; explanation?: string }
                        type ExameQuestion = { id: string; text: string; options: ExameOption[] };
                        const questoes = (exame as unknown as { questoes: ExameQuestion[] | null }).questoes;
                        const respostas = (exame as unknown as { respostas: Record<string, string> | null }).respostas;
                        if (!questoes || questoes.length === 0) return null;
                        return (
                            <div className="mt-16">
                                <h2 className="text-xl font-medium mb-8 border-b border-border/50 pb-4">Detalhamento das Questões</h2>
                                <div className="flex flex-col gap-12">
                                    {questoes.map((question: ExameQuestion, idx: number) => {
                                        const userAnswerId = respostas?.[question.id];

                                        return (
                                            <div key={question.id} className="flex flex-col gap-4">
                                                <div className="flex shrink-0 w-full mb-2">
                                                    <span className="text-lg font-medium mr-4">{idx + 1}.</span>
                                                    <h3 className="text-lg font-medium leading-relaxed">
                                                        {question.text}
                                                    </h3>
                                                </div>

                                                <div className="flex flex-col gap-3 ml-0 md:ml-8">
                                                    {question.options.map((option: ExameOption) => {
                                                        const isSelected = option.id === userAnswerId;
                                                        const isCorrectOption = option.isCorrect;

                                                        let stateClasses = "bg-card border-border";
                                                        const textClasses = "text-foreground";

                                                        if (isSelected) {
                                                            if (isCorrectOption) {
                                                                stateClasses = "bg-success-bg/10 border-success";
                                                            } else {
                                                                stateClasses = "bg-danger-bg/10 border-danger";
                                                            }
                                                        } else if (isCorrectOption && userAnswerId !== undefined) {
                                                            stateClasses = "border-success/50 bg-success-bg/5";
                                                        } else if (userAnswerId !== undefined) {
                                                            stateClasses = "opacity-50 bg-card border-border";
                                                        }

                                                        return (
                                                            <div
                                                                key={option.id}
                                                                className={`relative flex flex-col text-left w-full rounded-xl border p-4 ${stateClasses}`}
                                                            >
                                                                <div className="flex items-start gap-4 w-full">
                                                                    <span className={`text-base w-6 mt-0.5 font-medium ${isSelected && isCorrectOption ? "text-success" : isSelected && !isCorrectOption ? "text-danger" : "text-zinc-400"}`}>
                                                                        {option.letter}.
                                                                    </span>

                                                                    <div className="flex-1">
                                                                        <span className={textClasses}>{option.text}</span>

                                                                        {(isSelected || isCorrectOption) && option.explanation && userAnswerId && (
                                                                            <div className="mt-4 pt-4 border-t border-border/50 text-sm">
                                                                                <div className={`flex items-center gap-2 font-medium mb-2 ${isCorrectOption ? "text-success" : "text-danger"}`}>
                                                                                    {isCorrectOption ? "Alternativa Correta" : "Sua Resposta"}
                                                                                </div>
                                                                                <p className="text-zinc-400 leading-relaxed">
                                                                                    {option.explanation}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                    {!userAnswerId && (
                                                        <div className="text-sm font-medium text-amber-500 mt-2">Você ignorou esta questão e não respondeu.</div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })()
                }
            </main>
        </div>
    )
}
