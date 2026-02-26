import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { ArrowLeft, BookOpen, Layers, Calendar } from "lucide-react"
import Link from "next/link"

function renderMarkdown(text: string) {
    return (
        <div className="prose prose-invert max-w-none">
            {text.split("\n").map((line, i) => {
                if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold mt-8 mb-3 text-foreground">{line.slice(3)}</h2>
                if (line.startsWith("# ")) return <h1 key={i} className="text-2xl font-bold mt-6 mb-4 text-foreground">{line.slice(2)}</h1>
                if (line.startsWith("### ")) return <h3 key={i} className="text-base font-semibold mt-6 mb-2 text-foreground">{line.slice(4)}</h3>
                if (line.startsWith("---")) return <hr key={i} className="border-border/50 my-6" />
                if (line.startsWith("- ") || line.startsWith("* ")) {
                    const content = line.slice(2)
                    return (
                        <div key={i} className="flex gap-2 my-1">
                            <span className="text-primary mt-1.5 shrink-0">•</span>
                            <p className="text-foreground/90 leading-relaxed" dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                        </div>
                    )
                }
                if (line.trim() === "") return <div key={i} className="h-3" />
                return <p key={i} className="text-foreground/90 leading-relaxed my-1" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            })}
        </div>
    )
}

function renderFlashcards(text: string) {
    // Flashcards are stored as markdown with "**Frente:** ... **Verso:** ..." patterns
    // OR as numbered list sections. Parse them into card pairs.
    const blocks = text.split(/\n(?=\d+\.|#{1,3} |---)/g).filter(b => b.trim())

    // Try to extract Q&A pairs from markdown
    const cards: { front: string; back: string }[] = []

    // Pattern 1: "**Frente:** text\n**Verso:** text"
    const frontBackPattern = /\*\*Frente:\*\*\s*(.+?)(?:\n|\r\n)\*\*Verso:\*\*\s*(.+?)(?=\n\n|\n\*\*Frente|\n\d+\.|\z)/gs
    let match
    while ((match = frontBackPattern.exec(text)) !== null) {
        cards.push({ front: match[1].trim(), back: match[2].trim() })
    }

    // Pattern 2: "**P:** / **R:**"
    if (cards.length === 0) {
        const prPattern = /\*\*P[ergunta]*:\*\*\s*(.+?)(?:\n|\r\n)\*\*R[esposta]*:\*\*\s*(.+?)(?=\n\n|\n\*\*P|\z)/gs
        while ((match = prPattern.exec(text)) !== null) {
            cards.push({ front: match[1].trim(), back: match[2].trim() })
        }
    }

    // If no structured pairs found, fall back to markdown rendering
    if (cards.length === 0) {
        return renderMarkdown(text)
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((card, i) => (
                <div
                    key={i}
                    className="group bg-card border border-border/50 hover:border-primary/40 rounded-2xl overflow-hidden transition-all duration-300"
                >
                    {/* Front */}
                    <div className="p-5 border-b border-border/30">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Frente</p>
                        <p className="text-sm font-medium text-foreground leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: card.front.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                    </div>
                    {/* Back */}
                    <div className="p-5 bg-primary/5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Verso</p>
                        <p className="text-sm text-foreground/80 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: card.back.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
}

export default async function ResumoDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
        redirect("/login")
    }

    const resumo = await prisma.resumo.findFirst({
        where: { id, usuarioId: session.user.id }
    })

    if (!resumo) notFound()

    const isFlashcard = resumo.tipo === "flashcards"
    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(resumo.criadoEm))

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            {/* Top bar */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/30">
                <div className="w-full max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/historico/resumos"
                            className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isFlashcard ? "bg-purple-500/10 text-purple-400" : "bg-primary/10 text-primary"}`}>
                            {isFlashcard ? <Layers className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-base font-semibold text-foreground truncate max-w-xs md:max-w-lg">
                                {resumo.nomeArquivo}
                            </h1>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formattedDate}
                            </p>
                        </div>
                    </div>

                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 ${isFlashcard ? "bg-purple-500/10 text-purple-400" : "bg-primary/10 text-primary"}`}>
                        {isFlashcard ? "Flashcards" : "Resumo Detalhado"}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-10">
                {isFlashcard
                    ? renderFlashcards(resumo.conteudo)
                    : renderMarkdown(resumo.conteudo)
                }
            </div>
        </div>
    )
}
