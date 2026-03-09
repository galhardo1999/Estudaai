"use client"

import { useState, useEffect, useCallback } from "react"
import { X, GraduationCap, BookOpen, Calculator, Globe2, Microscope, Pen, ChevronRight, Clock, Calendar, Users, History, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

/* ─── Data ──────────────────────────────────────────────────────── */
interface EnemArea {
    id: string
    nome: string
    sigla: string
    icon: React.ElementType
    cor: string
    corBg: string
    corBorder: string
    descricao: string
    questoes: number
    tempo: string
    competencias: string[]
    topicos: string[]
}

const areasEnem: EnemArea[] = [
    {
        id: "linguagens",
        nome: "Linguagens e Códigos",
        sigla: "Linguagens",
        icon: Pen,
        cor: "text-rose-400",
        corBg: "bg-rose-500/15",
        corBorder: "border-rose-500/30",
        descricao: "Inclui Língua Portuguesa, Literatura, Língua Estrangeira (Inglês ou Espanhol), Artes, Educação Física e Tecnologias da Informação.",
        questoes: 45,
        tempo: "5h30",
        competencias: [
            "Interpretação de textos",
            "Gêneros textuais e funções da linguagem",
            "Variação linguística",
            "Literatura brasileira e portuguesa",
            "Gramática e norma culta",
            "Compreensão de língua estrangeira",
            "Artes visuais, música e teatro",
            "Intertextualidade e figuras de linguagem",
        ],
        topicos: [
            "Interpretação e compreensão de textos",
            "Figuras de linguagem",
            "Funções da linguagem",
            "Modernismo e Romantismo",
            "Variantes linguísticas",
            "Semântica e morfologia",
        ],
    },
    {
        id: "humanas",
        nome: "Ciências Humanas",
        sigla: "Ciências Humanas",
        icon: Globe2,
        cor: "text-amber-400",
        corBg: "bg-amber-500/15",
        corBorder: "border-amber-500/30",
        descricao: "Abrange História, Geografia, Filosofia e Sociologia. Foco em análise crítica de eventos históricos e sociais.",
        questoes: 45,
        tempo: "5h30",
        competencias: [
            "Cidadania e direitos humanos",
            "Movimentos sociais e culturais",
            "Geopolítica e relações internacionais",
            "Brasil Colônia, Império e República",
            "Globalização e meio ambiente",
            "Filosofia política e ética",
            "Pensamento sociológico clássico",
            "Urbanização e questão agrária",
        ],
        topicos: [
            "Segunda Guerra Mundial e Guerra Fria",
            "Era Vargas e ditadura militar",
            "Iluminismo e Revolução Francesa",
            "Climatologia e biomas brasileiros",
            "Ética e filosofia política",
            "Desigualdade social no Brasil",
        ],
    },
    {
        id: "natureza",
        nome: "Ciências da Natureza e suas Tecnologias",
        sigla: "Ciências da Natureza",
        icon: Microscope,
        cor: "text-emerald-400",
        corBg: "bg-emerald-500/15",
        corBorder: "border-emerald-500/30",
        descricao: "Engloba Biologia, Física e Química. Questões interdisciplinares com foco em fenômenos naturais e tecnologia.",
        questoes: 45,
        tempo: "5h",
        competencias: [
            "Ecologia e meio ambiente",
            "Genética e evolução",
            "Mecânica e termodinâmica",
            "Eletricidade e ondas",
            "Reações químicas e estequiometria",
            "Química orgânica",
            "Fisiologia humana",
            "Energia e sustentabilidade",
        ],
        topicos: [
            "Ecologia e ciclos biogeoquímicos",
            "Genética mendeliana",
            "Leis de Newton",
            "Termoquímica e equilíbrio",
            "Óptica e ondas",
            "Bioquímica e metabolismo",
        ],
    },
    {
        id: "matematica",
        nome: "Matemática e suas Tecnologias",
        sigla: "Matemática e suas Tecnologias",
        icon: Calculator,
        cor: "text-blue-400",
        corBg: "bg-blue-500/15",
        corBorder: "border-blue-500/30",
        descricao: "Prova exclusiva de Matemática com questões que exigem raciocínio lógico, interpretação de dados e resolução de problemas.",
        questoes: 45,
        tempo: "5h",
        competencias: [
            "Razão e proporção",
            "Porcentagem e juros",
            "Geometria plana e espacial",
            "Estatística e probabilidade",
            "Funções e gráficos",
            "Análise combinatória",
            "Progressões (PA e PG)",
            "Equações e sistemas",
        ],
        topicos: [
            "Razão, proporção e regra de três",
            "Porcentagem e juros compostos",
            "Geometria plana (áreas e perímetros)",
            "Probabilidade e análise combinatória",
            "Leitura de gráficos e tabelas",
            "Funções do 1º e 2º grau",
        ],
    },
    {
        id: "redacao",
        nome: "Redação",
        sigla: "Redação",
        icon: BookOpen,
        cor: "text-violet-400",
        corBg: "bg-violet-500/15",
        corBorder: "border-violet-500/30",
        descricao: "Texto dissertativo-argumentativo sobre tema de ordem social, científica, cultural ou política. Nota máxima de 1.000 pontos.",
        questoes: 1,
        tempo: "Incluída no 1º dia",
        competencias: [
            "Domínio da norma culta",
            "Compreensão da proposta de redação",
            "Organização e defesa de ponto de vista",
            "Uso de mecanismos linguísticos de coesão",
            "Proposta de intervenção social",
            "Argumentação consistente",
            "Repertório sociocultural",
            "Estrutura dissertativa (intro, desenv., conclusão)",
        ],
        topicos: [
            "Temas de direitos humanos",
            "Violência e segurança pública",
            "Educação e tecnologia",
            "Meio ambiente e sustentabilidade",
            "Saúde pública",
            "Inclusão social e diversidade",
        ],
    },
]

/* ─── Past Exams Data ───────────────────────────────────────────── */
const provasAnteriores = [
    { ano: "2017", status: "Disponível", cor: "bg-primary/5 border-primary/20 text-primary" },
    { ano: "2018", status: "Disponível", cor: "bg-primary/5 border-primary/20 text-primary" },
    { ano: "2019", status: "Disponível", cor: "bg-primary/5 border-primary/20 text-primary" },
    { ano: "2020", status: "Disponível", cor: "bg-primary/5 border-primary/20 text-primary" },
    { ano: "2021", status: "Disponível", cor: "bg-primary/5 border-primary/20 text-primary" },
    { ano: "2022", status: "Disponível", cor: "bg-primary/5 border-primary/20 text-primary" },
    { ano: "2023", status: "Disponível", cor: "bg-primary/5 border-primary/20 text-primary" },
    { ano: "2024", status: "Disponível", cor: "bg-primary/5 border-primary/20 text-primary" },
    { ano: "2025", status: "Disponível", cor: "bg-primary/5 border-primary/20 text-primary" },
]

/* ─── Skeleton ──────────────────────────────────────────────────── */
function SkeletonCard() {
    return (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden animate-pulse p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-border/30 rounded-xl" />
                <div className="h-5 bg-border/30 rounded w-2/3" />
            </div>
            <div className="space-y-2">
                <div className="h-4 bg-border/20 rounded w-full" />
                <div className="h-4 bg-border/20 rounded w-5/6" />
            </div>
            <div className="flex gap-2 mt-4">
                <div className="h-6 w-20 bg-border/30 rounded-full" />
                <div className="h-6 w-16 bg-border/30 rounded-full" />
            </div>
        </div>
    )
}

/* ─── Detail Modal ──────────────────────────────────────────────── */
function AreaModal({ area, onClose }: { area: EnemArea; onClose: () => void }) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
        document.addEventListener("keydown", handler)
        return () => document.removeEventListener("keydown", handler)
    }, [onClose])

    useEffect(() => {
        document.body.style.overflow = "hidden"
        return () => { document.body.style.overflow = "" }
    }, [])

    const Icon = area.icon

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Detalhes de ${area.nome}`}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
            <div className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border/50 rounded-2xl overflow-hidden shadow-2xl animate-fade-in flex flex-col">
                {/* Header */}
                <div className={cn("p-6 flex items-center gap-4 border-b border-border/50", area.corBg)}>
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", area.corBg, area.corBorder, "border")}>
                        <Icon className={cn("w-6 h-6", area.cor)} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-foreground">{area.nome}</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground">{area.questoes} {area.questoes === 1 ? "texto" : "questões"}</span>
                            <span className="text-xs text-muted-foreground">⏱ {area.tempo}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" aria-label="Fechar modal">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">Sobre</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{area.descricao}</p>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">Competências e Habilidades</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {area.competencias.map((c, i) => (
                                <div key={c} className="flex items-center gap-2 text-sm text-muted-foreground bg-card-hover/50 rounded-lg px-3 py-2">
                                    <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0", area.corBg, area.cor)}>
                                        {i + 1}
                                    </span>
                                    {c}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">Tópicos Mais Cobrados</h3>
                        <ul className="space-y-1.5">
                            {area.topicos.map((t) => (
                                <li key={t} className="text-sm text-muted-foreground flex items-center gap-2">
                                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", area.corBg.replace("/15", ""))} />
                                    {t}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ─── Area Card ─────────────────────────────────────────────────── */
function AreaCard({ area, onOpenDetail }: { area: EnemArea; onOpenDetail: (a: EnemArea) => void }) {
    const Icon = area.icon

    return (
        <div className="group bg-card border border-border/50 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 flex flex-col p-5">
            {/* Icon + Title */}
            <div className="flex items-center gap-3 mb-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", area.corBg, area.corBorder)}>
                    <Icon className={cn("w-5 h-5", area.cor)} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {area.sigla}
                    </h3>
                    <span className="text-[10px] text-muted-foreground">{area.questoes} {area.questoes === 1 ? "texto" : "questões"} · {area.tempo}</span>
                </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-3 flex-1">
                {area.descricao}
            </p>



            {/* CTA */}
            <div className="flex items-center justify-end pt-3 border-t border-border/30 mt-auto">
                <button
                    onClick={() => onOpenDetail(area)}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors group/btn"
                    aria-label={`Ver detalhes de ${area.nome}`}
                >
                    Ver detalhes
                    <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
            </div>
        </div>
    )
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function EnemPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [selectedArea, setSelectedArea] = useState<EnemArea | null>(null)
    const router = useRouter()

    useEffect(() => {
        const t = setTimeout(() => setIsLoading(false), 400)
        return () => clearTimeout(t)
    }, [])

    const handleCloseModal = useCallback(() => setSelectedArea(null), [])

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans p-6 md:p-12">
            <div className="max-w-7xl mx-auto w-full">
                {/* ─── Header ─── */}
                <header className="mb-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-[#0A2540] flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-[#00C853]" />
                        </div>
                        <h1 className="text-3xl font-medium">ENEM</h1>
                    </div>
                    <p className="text-muted-foreground max-w-2xl">
                        Exame Nacional do Ensino Médio — conheça cada área de conhecimento, as competências exigidas e os tópicos que mais caem na prova.
                    </p>
                </header>
                {/* ─── Past Exams Section ─── */}
                <div className="mt-16">
                    <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
                        <History className="w-5 h-5 text-primary" />
                        Resolver Provas Anteriores
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {provasAnteriores.map((prova) => (
                            <button
                                key={prova.ano}
                                disabled={prova.status === "Em breve"}
                                onClick={() => prova.status === "Disponível" && router.push(`/enem/${prova.ano}`)}
                                className={cn(
                                    "flex flex-col items-center justify-center p-6 bg-card border border-border/50 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                                    prova.status === "Disponível" ? "hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-1 cursor-pointer" : "opacity-70 cursor-not-allowed grayscale-[0.5]"
                                )}
                            >
                                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors border", prova.cor)}>
                                    <FileText className="w-6 h-6" />
                                </div>
                                <span className="text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                                    {prova.ano}
                                </span>
                                <span className={cn(
                                    "text-[10px] font-semibold uppercase tracking-wider",
                                    prova.status === "Em breve" ? "text-muted-foreground" : "text-success"
                                )}>
                                    {prova.status}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
                {/* ─── Study Content Card ─── */}
                <div className="bg-card border border-border/50 rounded-2xl p-6 mb-10 mt-10">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Conteúdo para estudar
                    </h2>

                    {/* ─── Cards Grid ─── */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <SkeletonCard key={i} />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {areasEnem.map((area) => (
                                <AreaCard key={area.id} area={area} onOpenDetail={setSelectedArea} />
                            ))}
                        </div>
                    )}
                </div>


            </div>

            {/* ─── Modal ─── */}
            {selectedArea && (
                <AreaModal area={selectedArea} onClose={handleCloseModal} />
            )}
        </div>
    )
}
