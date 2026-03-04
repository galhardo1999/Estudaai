import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { ArrowLeft, Layers, Calendar } from "lucide-react"
import Link from "next/link"
import ClientPDFWrapper from "./_components/ClientPDFWrapper"

function renderFlashcards(text: string) {
    const cards: { front: string; back: string }[] = []

    // Pattern 1: "**Frente:** text\n**Verso:** text"
    const frontBackPattern = /\*\*Frente:\*\*\s*([\s\S]+?)(?:\n|\r\n)\*\*Verso:\*\*\s*([\s\S]+?)(?=\n\n|\n\*\*Frente|\n\d+\.|$)/g
    let match
    while ((match = frontBackPattern.exec(text)) !== null) {
        cards.push({ front: match[1].trim(), back: match[2].trim() })
    }

    // Pattern 2: "**P:** / **R:**"
    if (cards.length === 0) {
        const prPattern = /\*\*P[ergunta]*:\*\*\s*([\s\S]+?)(?:\n|\r\n)\*\*R[esposta]*:\*\*\s*([\s\S]+?)(?=\n\n|\n\*\*P|$)/g
        while ((match = prPattern.exec(text)) !== null) {
            cards.push({ front: match[1].trim(), back: match[2].trim() })
        }
    }

    if (cards.length === 0) {
        // Fallback: plain text
        return (
            <div className="prose prose-invert max-w-none">
                {text.split("\n").map((line, i) => (
                    <p key={i} className="text-foreground/90 leading-relaxed my-1"
                        dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                ))}
            </div>
        )
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
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Pergunta</p>
                        <p className="text-sm font-medium text-foreground leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: card.front.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                    </div>
                    {/* Back */}
                    <div className="p-5 bg-primary/5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Resposta</p>
                        <p className="text-sm text-foreground/80 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: card.back.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
}

export default async function FlashcardDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
        redirect("/login")
    }

    const resumo = await prisma.resumo.findFirst({
        where: { id, usuarioId: session.user.id }
    })

    if (!resumo) notFound()
    if (resumo.tipo !== "flashcards") notFound()

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
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-purple-500/10 text-purple-400">
                            <Layers className="w-5 h-5" />
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
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-10">
                <ClientPDFWrapper filename={resumo.nomeArquivo} isFlashcard>
                    {renderFlashcards(resumo.conteudo)}
                </ClientPDFWrapper>
            </div>
        </div>
    )
}
