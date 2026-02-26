"use client"

import { useState, useRef, useEffect } from "react"
import { useDocuments, DocumentType } from "@/contexts/DocumentContext"
import { BookOpen, UploadCloud, FileText, X, Check, Loader2, Sparkles, Library, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

type SummarySource = "library" | "upload" | null
type SummaryType = "resumo" | "flashcards"
type Step = "source" | "result"

type AnalyzedFile = { id: string; name: string; url: string; geminiUri?: string | null }

function renderMarkdown(text: string, isStreaming: boolean) {
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
            {isStreaming && <span className="inline-block w-1.5 h-4 bg-primary rounded animate-pulse ml-0.5 align-middle" />}
        </div>
    )
}

export default function ResumoPage() {
    const { documents } = useDocuments()
    const [step, setStep] = useState<Step>("source")

    // Source state
    const [source, setSource] = useState<SummarySource>(null)
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
    const [uploadedDocs, setUploadedDocs] = useState<AnalyzedFile[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [summaryType, setSummaryType] = useState<SummaryType>("resumo")

    // Per-file summaries: name -> text
    const [summaries, setSummaries] = useState<Record<string, string>>({})
    const [analyzedFiles, setAnalyzedFiles] = useState<AnalyzedFile[]>([])
    const [activeFileName, setActiveFileName] = useState<string>("")
    const [streamingFileName, setStreamingFileName] = useState<string>("")

    const resultRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (resultRef.current) {
            resultRef.current.scrollTop = resultRef.current.scrollHeight
        }
    }, [summaries, activeFileName])

    const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return
        setIsUploading(true)
        try {
            const results: AnalyzedFile[] = []
            for (const file of Array.from(files)) {
                const formData = new FormData()
                formData.append("file", file)
                const res = await fetch("/api/upload", { method: "POST", body: formData })
                if (!res.ok) throw new Error("Upload failed")
                const data = await res.json()
                if (data.document) results.push({ id: data.document.id, name: data.document.name, url: data.document.url, geminiUri: data.document.geminiUri })
            }
            setUploadedDocs(prev => [...prev, ...results])
        } catch (err) {
            console.error("Upload error:", err)
            alert("Erro ao fazer upload. Tente novamente.")
        } finally {
            setIsUploading(false)
        }
    }

    const toggleDocSelection = (id: string) => {
        setSelectedDocIds(prev =>
            prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
        )
    }

    const canProceed = source === "library" ? selectedDocIds.length > 0 : uploadedDocs.length > 0

    const streamSummaryForFile = async (file: AnalyzedFile): Promise<string> => {
        const res = await fetch("/api/generate-summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documentIds: [file.id], summaryType })
        })
        if (!res.ok || !res.body) throw new Error("Failed")

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            setSummaries(prev => ({ ...prev, [file.name]: buffer }))
        }
        buffer += decoder.decode()
        setSummaries(prev => ({ ...prev, [file.name]: buffer }))

        // Persist to database
        fetch("/api/save-resumo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tipo: summaryType, nomeArquivo: file.name, conteudo: buffer })
        }).catch(err => console.error("Failed to save resumo:", err))

        return buffer
    }

    const handleGenerate = async () => {
        const files: AnalyzedFile[] = source === "library"
            ? documents.filter(d => selectedDocIds.includes(d.id)).map(d => ({ id: d.id, name: d.name, url: d.url, geminiUri: d.geminiUri }))
            : uploadedDocs

        setAnalyzedFiles(files)
        setSummaries({})
        setActiveFileName(files[0]?.name ?? "")
        setStep("result")

        for (const file of files) {
            setStreamingFileName(file.name)
            try {
                await streamSummaryForFile(file)
            } catch (err) {
                console.error(`Failed to generate for ${file.name}:`, err)
                setSummaries(prev => ({ ...prev, [file.name]: "Erro ao gerar resumo para este arquivo." }))
            }
        }
        setStreamingFileName("")
    }

    const handleReset = () => {
        setStep("source")
        setSource(null)
        setSelectedDocIds([])
        setUploadedDocs([])
        setSummaries({})
        setAnalyzedFiles([])
        setActiveFileName("")
        setStreamingFileName("")
    }

    // --- RESULT VIEW ---
    if (step === "result") {
        const activeText = summaries[activeFileName] ?? ""
        const isActiveStreaming = streamingFileName === activeFileName

        return (
            <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
                {/* Top bar */}
                <div className="w-full max-w-6xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between border-b border-border/30">
                    <h1 className="text-xl font-semibold flex items-center gap-2">
                        {summaryType === "resumo" ? <BookOpen className="w-5 h-5 text-primary" /> : <Layers className="w-5 h-5 text-primary" />}
                        {summaryType === "resumo" ? "Resumo de Estudos" : "Flashcards"}
                    </h1>
                    <button
                        onClick={handleReset}
                        className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                    >
                        <Sparkles className="w-4 h-4" />
                        Novo Resumo
                    </button>
                </div>

                {/* Two-column layout */}
                <div className="flex flex-1 w-full max-w-6xl mx-auto px-6 pt-6 pb-16 gap-6">

                    {/* Left sidebar: file selector */}
                    <aside className="w-56 shrink-0">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                            Arquivos Analisados
                        </p>
                        <div className="flex flex-col gap-2">
                            {analyzedFiles.map((file) => {
                                const isActive = activeFileName === file.name
                                const isDone = !!summaries[file.name]
                                const isThisStreaming = streamingFileName === file.name
                                return (
                                    <button
                                        key={file.name}
                                        onClick={() => setActiveFileName(file.name)}
                                        className={cn(
                                            "flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-left w-full transition-all border",
                                            isActive
                                                ? "bg-primary/10 border-primary text-foreground"
                                                : "bg-zinc-800/40 border-border/50 text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200"
                                        )}
                                    >
                                        {isThisStreaming ? (
                                            <Loader2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5 animate-spin" />
                                        ) : isDone ? (
                                            <FileText className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", isActive ? "text-primary" : "text-zinc-500")} />
                                        ) : (
                                            <div className="w-3.5 h-3.5 rounded-full border border-zinc-600 shrink-0 mt-0.5" />
                                        )}
                                        <span className="break-words leading-snug">{file.name}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </aside>

                    {/* Right: scrollable content */}
                    <div ref={resultRef} className="flex-1 overflow-auto min-h-0">
                        {activeText
                            ? renderMarkdown(activeText, isActiveStreaming)
                            : (
                                <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                    <p className="text-sm">Gerando resumo para <strong className="text-foreground">{activeFileName}</strong>...</p>
                                </div>
                            )
                        }
                    </div>
                </div>
            </div>
        )
    }

    // --- SETUP VIEW ---
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans p-6 md:p-12">
            <div className="max-w-3xl mx-auto w-full">
                <header className="mb-10">
                    <h1 className="text-3xl font-semibold mb-2">Resumo de Estudos</h1>
                    <p className="text-muted-foreground">Escolha seu material e a IA vai gerar um resumo ou flashcards para você.</p>
                </header>

                {/* Step 1: Source */}
                <section className="mb-10">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">1. Fonte do Material</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={() => { setSource("library"); setUploadedDocs([]) }}
                            className={cn(
                                "group flex flex-col items-start gap-4 p-6 rounded-2xl border text-left transition-all duration-200",
                                source === "library" ? "border-primary bg-primary/5" : "border-border/50 bg-card hover:border-zinc-600"
                            )}
                        >
                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-colors", source === "library" ? "bg-primary/20 text-primary" : "bg-zinc-800 text-zinc-400 group-hover:text-foreground")}>
                                <Library className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">Da Biblioteca</h3>
                                <p className="text-sm text-muted-foreground">Escolha arquivos que você já salvou na sua Biblioteca de documentos.</p>
                            </div>
                        </button>

                        <button
                            onClick={() => { setSource("upload"); setSelectedDocIds([]) }}
                            className={cn(
                                "group flex flex-col items-start gap-4 p-6 rounded-2xl border text-left transition-all duration-200",
                                source === "upload" ? "border-primary bg-primary/5" : "border-border/50 bg-card hover:border-zinc-600"
                            )}
                        >
                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-colors", source === "upload" ? "bg-primary/20 text-primary" : "bg-zinc-800 text-zinc-400 group-hover:text-foreground")}>
                                <UploadCloud className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">Anexar Arquivo</h3>
                                <p className="text-sm text-muted-foreground">Faça upload de um novo arquivo diretamente para gerar o resumo agora.</p>
                            </div>
                        </button>
                    </div>

                    {/* Library Picker */}
                    {source === "library" && (
                        <div className="mt-4 border border-border/50 rounded-2xl overflow-hidden">
                            {documents.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                    Nenhum documento na biblioteca. Adicione arquivos em <strong>/biblioteca</strong> primeiro.
                                </div>
                            ) : (
                                <div className="divide-y divide-border/50">
                                    {documents.map((doc: DocumentType) => {
                                        const selected = selectedDocIds.includes(doc.id)
                                        return (
                                            <button
                                                key={doc.id}
                                                onClick={() => toggleDocSelection(doc.id)}
                                                className={cn("w-full flex items-center gap-4 p-4 text-left transition-colors", selected ? "bg-primary/5" : "hover:bg-zinc-800/30")}
                                            >
                                                <div className={cn("w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors", selected ? "bg-primary border-primary" : "border-zinc-600")}>
                                                    {selected && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <FileText className="w-5 h-5 text-zinc-400 shrink-0" />
                                                <span className="text-sm font-medium truncate">{doc.name}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Upload Area */}
                    {source === "upload" && (
                        <div className="mt-4 space-y-3">
                            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border/50 rounded-2xl p-8 cursor-pointer hover:border-primary/50 transition-colors bg-card/50">
                                {isUploading ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> : <UploadCloud className="w-8 h-8 text-zinc-500" />}
                                <p className="text-sm text-muted-foreground">{isUploading ? "Enviando..." : "Clique para selecionar ou arraste PDFs, DOCX, imagens"}</p>
                                <input type="file" multiple accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={handleUploadFile} disabled={isUploading} />
                            </label>
                            {uploadedDocs.length > 0 && (
                                <div className="border border-border/50 rounded-2xl divide-y divide-border/50 overflow-hidden">
                                    {uploadedDocs.map((doc, i) => (
                                        <div key={i} className="flex items-center gap-3 p-4">
                                            <FileText className="w-4 h-4 text-primary shrink-0" />
                                            <span className="text-sm font-medium flex-1 truncate">{doc.name}</span>
                                            <button onClick={() => setUploadedDocs(prev => prev.filter((_, idx) => idx !== i))} className="text-zinc-500 hover:text-danger transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Step 2: Type */}
                {source && (
                    <section className="mb-10">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">2. Tipo de Saída</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => setSummaryType("resumo")}
                                className={cn("flex flex-col items-start gap-3 p-6 rounded-2xl border text-left transition-all duration-200", summaryType === "resumo" ? "border-primary bg-primary/5" : "border-border/50 bg-card hover:border-zinc-600")}
                            >
                                <BookOpen className={cn("w-6 h-6", summaryType === "resumo" ? "text-primary" : "text-zinc-400")} />
                                <div>
                                    <h3 className="font-semibold mb-1">Resumo Detalhado</h3>
                                    <p className="text-sm text-muted-foreground">Gere um guia abrangente com base no conteúdo que você está estudando. Isso é bom para revisões detalhadas.</p>
                                </div>
                            </button>

                            <button
                                onClick={() => setSummaryType("flashcards")}
                                className={cn("flex flex-col items-start gap-3 p-6 rounded-2xl border text-left transition-all duration-200", summaryType === "flashcards" ? "border-primary bg-primary/5" : "border-border/50 bg-card hover:border-zinc-600")}
                            >
                                <Layers className={cn("w-6 h-6", summaryType === "flashcards" ? "text-primary" : "text-zinc-400")} />
                                <div>
                                    <h3 className="font-semibold mb-1">Flashcards / Cartões de Estudo</h3>
                                    <p className="text-sm text-muted-foreground">Crie um conjunto completo de cartões didáticos com todo o conteúdo do seu teste. Isso é bom para revisão rápida.</p>
                                </div>
                            </button>
                        </div>
                    </section>
                )}

                {/* Generate Button */}
                {source && (
                    <button
                        onClick={handleGenerate}
                        disabled={!canProceed}
                        className="w-full py-4 px-6 bg-primary hover:bg-primary-hover text-black font-semibold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
                    >
                        <Sparkles className="w-5 h-5" />
                        {summaryType === "resumo" ? "Gerar Resumo com IA" : "Gerar Flashcards com IA"}
                    </button>
                )}
            </div>
        </div>
    )
}
