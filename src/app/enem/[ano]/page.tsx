import { ArrowLeft, Clock, FileText, Lock, BrainCircuit, Target, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { diasConfig, isDiaDisponivel } from "@/lib/enem-config"
import Link from "next/link"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export default async function EnemAnoPage({ params }: { params: Promise<{ ano: string }> }) {
    const { ano } = await params

    // Auth Session
    const session = await auth()
    const isLogged = !!(session?.user?.id)

    // Check availability
    const dias = diasConfig.map((d) => ({
        ...d,
        disponivel: isDiaDisponivel(ano, d.slug),
    }))

    // Fetch history for this specific year if user is logged in
    let historicoExames: any[] = []
    if (isLogged) {
        historicoExames = await prisma.exame.findMany({
            where: {
                usuarioId: session.user.id,
                codigo: {
                    startsWith: `enem-${ano}`,
                }
            },
            select: {
                id: true,
                codigo: true,
                pontuacao: true,
                totalQuestoes: true,
                criadoEm: true,
            },
            orderBy: {
                criadoEm: 'desc'
            }
        })
    }

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans p-6 md:p-12">
            <div className="max-w-4xl mx-auto w-full">

                {/* Back button */}
                <Link
                    href="/enem"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Voltar para ENEM
                </Link>

                {/* Header */}
                <header className="mb-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-[#0A2540] flex items-center justify-center">
                            <FileText className="w-5 h-5 text-[#00C853]" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">ENEM</p>
                            <h1 className="text-3xl font-medium leading-none">Prova {ano}</h1>
                        </div>
                    </div>
                    <p className="text-muted-foreground max-w-xl mt-3">
                        Escolha qual dia da prova deseja simular. Responda no ritmo certo, com o timer oficial.
                    </p>
                </header>

                {/* Day cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {dias.map((item) => {
                        const Icon = item.icon

                        const CardContent = (
                            <div className="p-7 flex flex-col flex-1">
                                {/* Icon + title */}
                                <div className="flex items-center gap-4 mb-5">
                                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border shrink-0", item.corBg, item.corBorder)}>
                                        <Icon className={cn("w-6 h-6", item.cor)} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{item.dia}</h2>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {item.tempo}
                                            </span>
                                            <span className="text-xs text-muted-foreground">{item.questoes} questões</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <p className="text-sm text-muted-foreground leading-relaxed mb-5">{item.descricao}</p>

                                {/* Areas */}
                                <div className="flex flex-col gap-2 mb-6 flex-1">
                                    {item.areas.map((area) => (
                                        <div key={area} className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", item.corBg.replace("/15", ""))} />
                                            {area}
                                        </div>
                                    ))}
                                </div>

                                {/* CTA */}
                                <div className="pt-4 border-t border-border/30">
                                    {item.disponivel ? (
                                        <span className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all">
                                            Iniciar simulado
                                            <span className="text-lg leading-none">→</span>
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            <Lock className="w-4 h-4" />
                                            Em breve
                                        </span>
                                    )}
                                </div>
                            </div>
                        )

                        const Wrapper = item.disponivel ? Link : "div"

                        return (
                            <Wrapper
                                href={item.disponivel ? `/enem/${ano}/${item.slug}` : ""}
                                key={item.dia}
                                className={cn(
                                    "relative group bg-card border border-border/50 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col no-underline",
                                    item.disponivel
                                        ? `cursor-pointer hover:shadow-xl ${item.corGlow} hover:border-primary/30 hover:-translate-y-1`
                                        : "cursor-not-allowed opacity-60"
                                )}
                            >
                                {/* Top accent bar */}
                                <div className={cn("h-1 w-full", item.corBg.replace("/15", "").replace("bg-", "bg-"))} />
                                {CardContent}
                            </Wrapper>
                        )
                    })}
                </div>

                {/* Histórico da Edição */}
                <section className="mb-8">
                    <h2 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        Seu histórico nesta edição
                    </h2>

                    {!isLogged && (
                        <div className="p-6 bg-card border border-border/50 rounded-xl text-center">
                            <p className="text-muted-foreground text-sm mb-4">
                                Faça login para salvar e acompanhar seu histórico de desempenho nesta edição do ENEM.
                            </p>
                            <Link href="/login" className="inline-flex items-center justify-center bg-primary hover:bg-primary/90 text-white font-medium py-2 px-5 rounded-lg transition-colors text-sm">
                                Fazer Login
                            </Link>
                        </div>
                    )}

                    {isLogged && historicoExames.length === 0 && (
                        <div className="p-6 bg-card border border-border/50 rounded-xl text-center">
                            <p className="text-muted-foreground text-sm">
                                Você ainda não realizou simulados desta edição. Escolha um dos dias acima para começar!
                            </p>
                        </div>
                    )}

                    {isLogged && historicoExames.length > 0 && (
                        <div className="grid gap-3">
                            {historicoExames.map((exam) => {
                                const dateObj = new Date(exam.criadoEm)
                                const formattedDate = new Intl.DateTimeFormat('pt-BR', {
                                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                }).format(dateObj)

                                // Extrai "d1" ou "d2" do código para saber qual dia foi
                                const isDia1 = exam.codigo?.includes("-d1-")
                                const diaBadge = isDia1 ? "Dia 1" : "Dia 2"

                                return (
                                    <div
                                        key={exam.id}
                                        className="group bg-card border border-border/50 hover:border-primary/50 rounded-xl p-5 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        {/* Left Side: Info */}
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                                <BrainCircuit className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-medium text-foreground mb-0.5">
                                                    ENEM {ano} - {diaBadge}
                                                </h3>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formattedDate}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Side: Stats & Action */}
                                        <div className="flex items-center justify-between md:justify-end gap-5">
                                            <div className="flex items-center gap-4">
                                                <div className="text-center">
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Total</p>
                                                    <p className="text-base font-medium text-foreground drop-shadow-sm">{exam.totalQuestoes}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Acertos</p>
                                                    <p className="text-base font-medium text-success drop-shadow-sm">{exam.pontuacao}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Erros</p>
                                                    <p className="text-base font-medium text-danger drop-shadow-sm">{Math.max(0, exam.totalQuestoes - exam.pontuacao)}</p>
                                                </div>
                                            </div>

                                            <Link href={`/resultado/${exam.id}`} className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors group-hover:bg-primary group-hover:text-white shrink-0 mt-1 md:mt-0">
                                                <ChevronRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </section>

                {/* Info banner */}
                <div className="mt-4 p-4 bg-card border border-border/50 rounded-xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground mb-0.5">Timer oficial da prova</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            O simulado replica o tempo real do ENEM. Você pode sair e voltar — o progresso e o cronômetro são mantidos na sessão. O resultado é exibido ao finalizar.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
