import { BrainCircuit, Clock, FileText, Target, ChevronRight } from "lucide-react"
import Link from "next/link"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export default async function HistoricoPage() {
    // 1. Get the current user session
    const session = await auth()

    if (!session || !session.user || !session.user.id) {
        return (
            <div className="flex flex-col min-h-screen bg-background p-6 md:p-12 items-center justify-center">
                <div className="text-center bg-card p-8 rounded-2xl border border-border">
                    <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
                    <p className="text-muted-foreground mb-6">Faça login para visualizar seu histórico de simulados.</p>
                    <Link href="/login" className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
                        Fazer Login
                    </Link>
                </div>
            </div>
        )
    }

    // 2. Fetch from database using the user's ID
    const exams = await prisma.exame.findMany({
        where: {
            usuarioId: session.user.id
        },
        select: {
            id: true,
            codigo: true,
            pontuacao: true,
            totalQuestoes: true,
            criadoEm: true,
            nomesDocumentos: true,
            documento: {
                select: {
                    titulo: true
                }
            }
        },
        orderBy: {
            criadoEm: 'desc'
        }
    })

    return (
        <div className="flex flex-col min-h-screen bg-background p-6 md:p-12">
            <div className="max-w-5xl mx-auto w-full">
                <header className="mb-10">
                    <h1 className="text-3xl font-semibold mb-2 text-foreground">Histórico de Simulados</h1>
                    <p className="text-muted-foreground">Acompanhe sua evolução e revise simulados anteriores.</p>
                </header>

                <div className="grid gap-4">
                    {exams.map((exam) => {
                        // Format the date
                        const dateObj = new Date(exam.criadoEm);
                        const formattedDate = new Intl.DateTimeFormat('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                        }).format(dateObj);

                        return (
                            <div
                                key={exam.id}
                                className="group bg-card border border-border/50 hover:border-primary/50 rounded-2xl p-6 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6"
                            >
                                {/* Left Side: Info */}
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
                                        <BrainCircuit className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium text-foreground mb-1">
                                            {exam.codigo ? `#${exam.codigo} - Simulado Geral` : "Simulado Geral"}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {formattedDate}</span>
                                            <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {exam.nomesDocumentos?.length > 0 ? exam.nomesDocumentos.join(", ") : (exam.documento?.titulo || "Documento Analisado")}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Stats & Action */}
                                <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8 border-t md:border-t-0 border-border/50 pt-4 md:pt-0">
                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Questões</p>
                                            <p className="text-lg font-medium text-foreground drop-shadow-sm">
                                                {exam.totalQuestoes}
                                            </p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Acertos</p>
                                            <p className="text-lg font-medium text-success drop-shadow-sm">
                                                {exam.pontuacao}
                                            </p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Erros</p>
                                            <p className="text-lg font-medium text-danger drop-shadow-sm">
                                                {Math.max(0, exam.totalQuestoes - exam.pontuacao)}
                                            </p>
                                        </div>
                                    </div>

                                    <Link href={`/resultado/${exam.id}`} className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors group-hover:bg-primary group-hover:text-white shrink-0">
                                        <ChevronRight className="w-5 h-5" />
                                    </Link>
                                </div>
                            </div>
                        )
                    })}

                    {exams.length === 0 && (
                        <div className="text-center py-20 bg-card border border-border/50 rounded-2xl">
                            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum simulado realizado ainda</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto mb-6">Comece agora mesmo a gerar simulados para construir seu histórico de evolução.</p>
                            <Link href="/simulado" className="inline-flex items-center justify-center bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-6 rounded-lg transition-colors">
                                Gerar Primeiro Simulado
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
