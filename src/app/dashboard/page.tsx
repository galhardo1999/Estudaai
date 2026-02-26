import { BookOpen, FileQuestion, Target, TrendingUp, TrendingDown, Minus, Clock, CheckCircle2, XCircle, BarChart3, Trophy, Award } from "lucide-react"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

function formatDuration(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60)
    const secs = Math.round(totalSeconds % 60)
    if (mins === 0) return `${secs}s`
    return `${mins}m ${secs.toString().padStart(2, '0')}s`
}

function getScoreColor(score: number): string {
    if (score >= 70) return "text-success"
    if (score >= 50) return "text-primary"
    return "text-danger"
}

function getBarColor(score: number): string {
    if (score >= 70) return "bg-emerald-500"
    if (score >= 50) return "bg-blue-500"
    return "bg-red-500"
}

interface ExamData {
    id: string
    pontuacao: number
    totalQuestoes: number
    duracao: number
    criadoEm: Date
    documento?: { titulo: string } | null
}

function computeStats(exams: ExamData[]) {
    const totalSimulados = exams.length
    const totalQuestoes = exams.reduce((sum, e) => sum + e.totalQuestoes, 0)
    // pontuacao stores the raw correct answer count (not a percentage)
    const totalAcertos = exams.reduce((sum, e) => sum + e.pontuacao, 0)
    const totalErros = totalQuestoes - totalAcertos
    const totalDuracao = exams.reduce((sum, e) => sum + e.duracao, 0)
    const tempoMedio = totalQuestoes > 0 ? totalDuracao / totalQuestoes : 0

    return { totalSimulados, totalQuestoes, totalAcertos, totalErros, tempoMedio }
}

function computeEvolution(exams: ExamData[], days: number) {
    const now = new Date()
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const prevPeriodStart = new Date(periodStart.getTime() - days * 24 * 60 * 60 * 1000)

    const currentExams = exams.filter(e => new Date(e.criadoEm) >= periodStart)
    const prevExams = exams.filter(e => {
        const d = new Date(e.criadoEm)
        return d >= prevPeriodStart && d < periodStart
    })

    // Derive percentage score (0-100) from raw correct count
    const toPercent = (e: ExamData) => e.totalQuestoes > 0 ? (e.pontuacao / e.totalQuestoes) * 100 : 0

    const currentAvg = currentExams.length > 0
        ? currentExams.reduce((sum, e) => sum + toPercent(e), 0) / currentExams.length
        : null

    const prevAvg = prevExams.length > 0
        ? prevExams.reduce((sum, e) => sum + toPercent(e), 0) / prevExams.length
        : null

    const diff = currentAvg !== null && prevAvg !== null
        ? currentAvg - prevAvg
        : null

    return { currentAvg, prevAvg, diff, count: currentExams.length }
}

export default async function DashboardPage() {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || !session.user.id) {
        return (
            <div className="flex flex-col min-h-screen bg-background p-6 md:p-12 items-center justify-center">
                <div className="text-center bg-card p-8 rounded-2xl border border-border">
                    <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
                    <p className="text-muted-foreground mb-6">Faça login para visualizar seu dashboard.</p>
                    <Link href="/login" className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
                        Fazer Login
                    </Link>
                </div>
            </div>
        )
    }

    const exams = await prisma.exame.findMany({
        where: { usuarioId: session.user.id },
        include: { documento: true },
        orderBy: { criadoEm: 'desc' }
    })

    const stats = computeStats(exams)
    const evo7 = computeEvolution(exams, 7)
    const evo15 = computeEvolution(exams, 15)
    const evo30 = computeEvolution(exams, 30)

    const toPercent = (e: ExamData) => e.totalQuestoes > 0 ? (e.pontuacao / e.totalQuestoes) * 100 : 0
    const melhorNota = exams.length > 0 ? Math.max(...exams.map(toPercent)) : 0
    const mediaGeral = exams.length > 0 ? exams.reduce((s, e) => s + toPercent(e), 0) / exams.length : 0
    const recentExams = exams.slice(0, 10)

    const hasData = exams.length > 0

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans p-6 md:p-12">
            <div className="max-w-6xl mx-auto w-full">
                <header className="mb-10">
                    <h1 className="text-3xl font-medium mb-2">Seu Dashboard</h1>
                    <p className="text-muted-foreground">Acompanhe seu desempenho e evolução nos estudos.</p>
                </header>

                {!hasData ? (
                    /* ── Empty State ── */
                    <div className="text-center py-20 bg-card border border-border/50 rounded-2xl mb-8">
                        <Target className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-medium mb-2">Nenhum dado disponível</h3>
                        <p className="text-muted-foreground max-w-md mx-auto mb-6">
                            Realize seu primeiro simulado para começar a acompanhar suas estatísticas e evolução.
                        </p>
                        <Link href="/simulado" className="inline-flex items-center justify-center bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-6 rounded-lg transition-colors">
                            Gerar Primeiro Simulado
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* ═══════════════════════════════════ */}
                        {/* SEÇÃO 1: ESTATÍSTICAS GERAIS        */}
                        {/* ═══════════════════════════════════ */}
                        <section className="mb-10">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-primary" />
                                Estatísticas Gerais
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                {/* Simulados */}
                                <div className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col items-center text-center">
                                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                                        <FileQuestion className="w-5 h-5" />
                                    </div>
                                    <span className="text-2xl font-bold">{stats.totalSimulados}</span>
                                    <span className="text-xs text-muted-foreground mt-1">Simulados</span>
                                </div>

                                {/* Questões resolvidas */}
                                <div className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col items-center text-center">
                                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <span className="text-2xl font-bold">{stats.totalQuestoes}</span>
                                    <span className="text-xs text-muted-foreground mt-1">Questões</span>
                                </div>

                                {/* Acertos */}
                                <div className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col items-center text-center">
                                    <div className="w-11 h-11 rounded-xl bg-success/10 text-success flex items-center justify-center mb-3">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <span className="text-2xl font-bold text-success">{stats.totalAcertos}</span>
                                    <span className="text-xs text-muted-foreground mt-1">Acertos</span>
                                </div>

                                {/* Erros */}
                                <div className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col items-center text-center">
                                    <div className="w-11 h-11 rounded-xl bg-danger/10 text-danger flex items-center justify-center mb-3">
                                        <XCircle className="w-5 h-5" />
                                    </div>
                                    <span className="text-2xl font-bold text-danger">{stats.totalErros}</span>
                                    <span className="text-xs text-muted-foreground mt-1">Erros</span>
                                </div>

                                {/* Tempo médio */}
                                <div className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col items-center text-center col-span-2 sm:col-span-1">
                                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <span className="text-2xl font-bold">{formatDuration(stats.tempoMedio)}</span>
                                    <span className="text-xs text-muted-foreground mt-1">Tempo médio/questão</span>
                                </div>
                            </div>
                        </section>

                        {/* ═══════════════════════════════════ */}
                        {/* SEÇÃO 2: EVOLUÇÃO NO TEMPO          */}
                        {/* ═══════════════════════════════════ */}
                        <section className="mb-10">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                Evolução no Tempo
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                    { label: "Últimos 7 dias", data: evo7 },
                                    { label: "Últimos 15 dias", data: evo15 },
                                    { label: "Últimos 30 dias", data: evo30 },
                                ].map(({ label, data }) => (
                                    <div key={label} className="bg-card border border-border/50 rounded-2xl p-6">
                                        <p className="text-sm text-muted-foreground mb-3">{label}</p>
                                        {data.currentAvg !== null ? (
                                            <>
                                                <div className="flex items-end gap-3 mb-2">
                                                    <span className={`text-3xl font-bold ${getScoreColor(data.currentAvg)}`}>
                                                        {Math.round(data.currentAvg)}%
                                                    </span>
                                                    {data.diff !== null && (
                                                        <span className={`flex items-center gap-0.5 text-sm font-medium pb-1 ${data.diff > 0 ? 'text-success' : data.diff < 0 ? 'text-danger' : 'text-muted-foreground'}`}>
                                                            {data.diff > 0 ? <TrendingUp className="w-4 h-4" /> : data.diff < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                                                            {data.diff > 0 ? '+' : ''}{Math.round(data.diff)}%
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {data.count} simulado{data.count !== 1 ? 's' : ''} no período
                                                    {data.prevAvg !== null && (
                                                        <> · anterior: {Math.round(data.prevAvg)}%</>
                                                    )}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-sm text-muted-foreground/60 italic">Sem dados neste período</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* ═══════════════════════════════════ */}
                        {/* SEÇÃO 3: APROVEITAMENTO SIMULADOS   */}
                        {/* ═══════════════════════════════════ */}
                        <section className="mb-10">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-primary" />
                                Aproveitamento em Simulados
                            </h2>

                            {/* Melhor nota + Média geral */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                <div className="bg-card border border-border/50 rounded-2xl p-6 flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-success/10 text-success flex items-center justify-center shrink-0">
                                        <Award className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-0.5">Melhor Nota</p>
                                        <span className={`text-3xl font-bold ${getScoreColor(melhorNota)}`}>{melhorNota}%</span>
                                    </div>
                                </div>
                                <div className="bg-card border border-border/50 rounded-2xl p-6 flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                        <BarChart3 className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-0.5">Média Geral</p>
                                        <span className={`text-3xl font-bold ${getScoreColor(mediaGeral)}`}>{Math.round(mediaGeral)}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Barras por simulado */}
                            <div className="bg-card border border-border/50 rounded-2xl p-6">
                                <p className="text-sm text-muted-foreground mb-4">Nota por simulado (últimos {recentExams.length})</p>
                                <div className="space-y-3">
                                    {recentExams.map((exam, i) => {
                                        const dateStr = new Intl.DateTimeFormat('pt-BR', {
                                            day: '2-digit', month: 'short'
                                        }).format(new Date(exam.criadoEm))

                                        return (
                                            <div key={exam.id} className="flex items-center gap-3">
                                                <span className="text-xs text-muted-foreground w-16 shrink-0 text-right">{dateStr}</span>
                                                <div className="flex-1 bg-border/30 rounded-full h-5 overflow-hidden relative">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${getBarColor(toPercent(exam))}`}
                                                        style={{ width: `${toPercent(exam)}%` }}
                                                    />
                                                </div>
                                                <span className={`text-sm font-semibold w-12 text-right ${getScoreColor(toPercent(exam))}`}>
                                                    {Math.round(toPercent(exam))}%
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </section>
                    </>
                )}

            </div>
        </div>
    )
}
