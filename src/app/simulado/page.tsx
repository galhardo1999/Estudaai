"use client"

import { useState, useEffect } from "react"
import { FileText, Trash2, FolderOpen, ChevronRight, ChevronDown, Upload, Check } from "lucide-react"
import { useExam } from "@/contexts/ExamContext"
import { useRouter } from "next/navigation"

type LibDoc = { id: string; name: string; url: string; geminiUri?: string | null; folderId?: string }
type LibFolder = { id: string; name: string; parentId?: string }

export default function SimuladoSetupPage() {
    const exam = useExam()
    const router = useRouter()

    // Setup form state
    type LocalDoc = { id: string; name: string; url: string; geminiUri?: string | null }
    const [localDocs, setLocalDocs] = useState<LocalDoc[]>([])
    const [topic, setTopic] = useState("")
    const [questionCount, setQuestionCount] = useState(30)
    const [difficulty, setDifficulty] = useState<"facil" | "medio" | "dificil">("medio")
    const [timeLimit, setTimeLimit] = useState(60)
    const [isUploading, setIsUploading] = useState(false)

    // Library state
    const [libraryDocs, setLibraryDocs] = useState<LibDoc[]>([])
    const [libraryFolders, setLibraryFolders] = useState<LibFolder[]>([])
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
    const [loadingLibrary, setLoadingLibrary] = useState(true)

    // Fetch library on mount
    useEffect(() => {
        const fetchLibrary = async () => {
            try {
                const [docsRes, foldersRes] = await Promise.all([
                    fetch("/api/documents"),
                    fetch("/api/folders")
                ])
                const docsData = await docsRes.json()
                const foldersData = await foldersRes.json()
                setLibraryDocs(docsData.documents || [])
                setLibraryFolders(foldersData.folders || [])
            } catch (error) {
                console.error("Failed to fetch library:", error)
            } finally {
                setLoadingLibrary(false)
            }
        }
        fetchLibrary()
    }, [])

    const isDocSelected = (docId: string) => localDocs.some(d => d.id === docId)

    const toggleDocSelection = (doc: LibDoc) => {
        if (isDocSelected(doc.id)) {
            setLocalDocs(prev => prev.filter(d => d.id !== doc.id))
        } else {
            setLocalDocs(prev => [...prev, {
                id: doc.id,
                name: doc.name,
                url: doc.url,
                geminiUri: doc.geminiUri,
            }])
        }
    }

    const toggleFolder = (folderId: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev)
            if (next.has(folderId)) next.delete(folderId)
            else next.add(folderId)
            return next
        })
    }

    const getFolderDocs = (folderId: string) => libraryDocs.filter(d => d.folderId === folderId)
    const getRootDocs = () => libraryDocs.filter(d => !d.folderId)
    const getRootFolders = () => libraryFolders.filter(f => !f.parentId)
    const getSubFolders = (parentId: string) => libraryFolders.filter(f => f.parentId === parentId)

    const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsUploading(true)
            try {
                const files = Array.from(e.target.files)
                const uploadPromises = files.map(async (file) => {
                    const formData = new FormData()
                    formData.append("file", file)

                    const res = await fetch("/api/upload", {
                        method: "POST",
                        body: formData,
                    })

                    if (!res.ok) throw new Error(`Upload failed for ${file.name}`)

                    const data = await res.json()
                    const newDoc = {
                        id: data.document.id,
                        name: data.document.name,
                        url: data.document.url,
                        geminiUri: data.document.geminiUri,
                    }
                    setLocalDocs(prev => [...prev, newDoc])

                    // Also add to library so it appears immediately
                    setLibraryDocs(prev => [{ ...newDoc, folderId: undefined }, ...prev])
                })

                await Promise.all(uploadPromises)

            } catch (error) {
                console.error("Erro no upload", error)
                alert("Falha ao carregar um ou mais arquivos.")
            } finally {
                setIsUploading(false)
            }
        }
    }

    const renderFolder = (folder: LibFolder, depth: number = 0) => {
        const isExpanded = expandedFolders.has(folder.id)
        const docs = getFolderDocs(folder.id)
        const subFolders = getSubFolders(folder.id)
        const hasContent = docs.length > 0 || subFolders.length > 0

        return (
            <div key={folder.id}>
                <button
                    onClick={() => toggleFolder(folder.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg hover:bg-secondary/50 transition-colors text-left"
                    style={{ paddingLeft: `${8 + depth * 16}px` }}
                >
                    {hasContent ? (
                        isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    ) : (
                        <span className="w-3.5" />
                    )}
                    <FolderOpen className="w-4 h-4 text-primary/70 shrink-0" />
                    <span className="truncate text-foreground/80">{folder.name}</span>
                    {docs.length > 0 && <span className="text-xs text-muted-foreground ml-auto shrink-0">{docs.length}</span>}
                </button>
                {isExpanded && (
                    <div>
                        {subFolders.map(sf => renderFolder(sf, depth + 1))}
                        {docs.map(doc => renderDocItem(doc, depth + 1))}
                    </div>
                )}
            </div>
        )
    }

    const renderDocItem = (doc: LibDoc, depth: number = 0) => {
        const selected = isDocSelected(doc.id)
        return (
            <button
                key={doc.id}
                onClick={() => toggleDocSelection(doc)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg transition-colors text-left ${selected ? 'bg-primary/10 text-primary' : 'hover:bg-secondary/50 text-foreground/80'}`}
                style={{ paddingLeft: `${8 + depth * 16 + 20}px` }}
            >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-primary border-primary' : 'border-border'}`}>
                    {selected && <Check className="w-3 h-3 text-white" />}
                </div>
                <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{doc.name}</span>
            </button>
        )
    }

    return (
        <div className="flex-1 flex flex-col md:flex-row items-stretch justify-start gap-6 p-6 md:p-12 min-h-screen max-w-6xl mx-auto w-full">
            {/* Left Card: Material de Estudo */}
            <div className="w-full md:w-1/3 bg-card border border-border/50 rounded-2xl p-6 flex flex-col gap-4">
                <div>
                    <h2 className="text-xl font-semibold mb-1">Material de Estudo</h2>
                    <p className="text-zinc-400 text-sm">Selecione documentos da biblioteca ou faça upload de novos arquivos.</p>
                </div>

                {/* Upload area */}
                <div>
                    <label className={`flex items-center justify-center gap-3 w-full px-4 py-4 bg-secondary/30 border border-dashed rounded-xl text-sm font-medium transition-colors ${isUploading ? 'border-primary text-primary opacity-50 cursor-not-allowed' : 'border-input hover:border-foreground/50 text-foreground cursor-pointer group'}`}>
                        {isUploading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <span>Enviando...</span>
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                                <span className="text-xs">Clique para upload ou arraste arquivos</span>
                                <input type="file" multiple className="hidden" accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png" onChange={handleUploadDocument} disabled={isUploading} />
                            </>
                        )}
                    </label>
                </div>

                {/* Library browser — fills available space */}
                <div className="flex-1 overflow-y-auto border border-border/30 rounded-xl p-2 bg-secondary/10">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">Biblioteca</p>
                    {loadingLibrary ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : libraryDocs.length === 0 && libraryFolders.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">Nenhum documento na biblioteca.</p>
                    ) : (
                        <div className="flex flex-col gap-0.5">
                            {getRootFolders().map(f => renderFolder(f))}
                            {getRootDocs().map(doc => renderDocItem(doc))}
                        </div>
                    )}
                </div>

                {/* Selected documents at bottom */}
                {localDocs.length > 0 && (
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Selecionados ({localDocs.length})</p>
                        <div className="flex flex-col gap-1.5 max-h-[150px] overflow-y-auto">
                            {localDocs.map(doc => (
                                <div
                                    key={doc.id}
                                    className="px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                                        <span className="text-sm font-medium truncate">{doc.name}</span>
                                    </div>
                                    <button
                                        onClick={() => setLocalDocs(prev => prev.filter(d => d.id !== doc.id))}
                                        className="p-1 text-zinc-500 hover:text-danger hover:bg-danger/10 rounded-md shrink-0 ml-2"
                                        title="Remover documento"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>


            {/* Right Card: Preparar Simulado */}
            <div className="w-full md:w-2/3 bg-card border border-border/50 rounded-2xl p-8 flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-semibold mb-2">Preparar Simulado</h1>
                    <p className="text-zinc-400 text-sm">Configure os assuntos e regras do seu próximo simulado.</p>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-foreground">Sobre qual assunto é o simulado?</label>
                    <textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Ex: Foque apenas em Atos Administrativos e Poderes da Administração..."
                        className="w-full bg-secondary/30 border border-input rounded-xl p-4 min-h-[120px] text-sm focus:outline-none focus:border-primary resize-none placeholder:text-muted-foreground text-foreground"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-foreground">Quantas questões?</label>
                    <div className="flex flex-wrap gap-3">
                        {[5, 10, 30, 40, 45, 60, 90, 120].map((count) => (
                            <button
                                key={count}
                                onClick={() => setQuestionCount(count)}
                                className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${questionCount === count
                                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                    : "bg-secondary/30 border-input hover:border-foreground/50 text-foreground"
                                    }`}
                            >
                                {count}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-foreground">Nível de dificuldade</label>
                    <div className="flex flex-wrap gap-3">
                        {([
                            { value: "facil" as const, label: "Fácil", desc: "Questões diretas e conceituais" },
                            { value: "medio" as const, label: "Médio", desc: "Questões que exigem interpretação" },
                            { value: "dificil" as const, label: "Difícil", desc: "Questões com pegadinhas e análise profunda" },
                        ]).map(({ value, label, desc }) => (
                            <button
                                key={value}
                                onClick={() => setDifficulty(value)}
                                className={`flex-1 min-w-[120px] px-5 py-3 rounded-xl text-sm font-medium border transition-colors text-left ${difficulty === value
                                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                    : "bg-secondary/30 border-input hover:border-foreground/50 text-foreground"
                                    }`}
                            >
                                <span className="block font-semibold">{label}</span>
                                <span className={`block text-xs mt-0.5 ${difficulty === value ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-foreground">Quanto tempo limite?</label>
                    <div className="flex flex-wrap gap-3">
                        {[15, 30, 45, 60, 90, 120].map((time) => (
                            <button
                                key={time}
                                onClick={() => setTimeLimit(time)}
                                className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${timeLimit === time
                                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                    : "bg-secondary/30 border-input hover:border-foreground/50 text-foreground"
                                    }`}
                            >
                                {time} min
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex md:flex-row flex-col items-center justify-between mt-4 gap-4">
                    <div className="flex-1 w-full">
                        {localDocs.length === 0 && <p className="text-sm text-amber-500/80">⚠ Selecione pelo menos um documento antes de gerar.</p>}
                        {exam.isGenerating && <p className="text-sm text-amber-500/80">⚠ Aguarde a geração do simulado atual terminar antes de criar outro.</p>}
                    </div>
                    <button
                        onClick={() => {
                            const examId = Math.random().toString(36).substring(2, 6).toUpperCase()
                            const genParams = {
                                fileUris: localDocs.filter(d => d.geminiUri).map(d => d.geminiUri),
                                topic: topic || "Conhecimentos gerais do documento",
                                questionCount,
                                difficulty
                            }
                            exam.startExam(timeLimit, questionCount, examId)
                            setTimeout(() => {
                                exam.generateExam(examId, genParams)
                            }, 100)
                            router.push(`/simulado/active/${examId}`)
                        }}
                        disabled={localDocs.length === 0 || exam.isGenerating}
                        className={`font-semibold py-3 px-8 rounded-full transition-colors w-full md:w-auto ${(localDocs.length === 0 || exam.isGenerating) ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover text-white'}`}
                    >
                        {exam.isGenerating ? 'Gerando...' : 'Gerar Simulado'}
                    </button>
                </div>
            </div>
        </div>
    )
}
