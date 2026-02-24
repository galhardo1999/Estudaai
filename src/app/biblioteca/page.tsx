"use client"

import { useState } from "react"
import { useDocuments } from "@/contexts/DocumentContext"
import { FolderPlus, UploadCloud, Folder, FileText, Trash2, ChevronRight, Home } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function BibliotecaPage() {
    const { documents, folders, addFolder, removeFolder, currentFolderId, setCurrentFolderId, removeDocument, moveDocument, addDocument } = useDocuments()
    const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false)
    const [newFolderName, setNewFolderName] = useState("")
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)

    // Filter items based on current folder
    const currentFolders = folders.filter(f => f.parentId === (currentFolderId || undefined))
    const currentDocuments = documents.filter(d => d.folderId === (currentFolderId || undefined))

    // Generate breadcrumbs path
    const getBreadcrumbs = () => {
        const path = [];
        let currentId = currentFolderId;
        while (currentId) {
            const folder = folders.find(f => f.id === currentId);
            if (folder) {
                path.unshift(folder);
                currentId = folder.parentId || null;
            } else {
                break;
            }
        }
        return path;
    }
    const breadcrumbs = getBreadcrumbs();

    const handleCreateFolder = (e: React.FormEvent) => {
        e.preventDefault()
        if (newFolderName.trim()) {
            addFolder(newFolderName.trim(), currentFolderId || undefined)
            setNewFolderName("")
            setIsCreateFolderModalOpen(false)
        }
    }

    const handleFileUploadClick = () => {
        // Trigger the hidden file input
        document.getElementById('biblioteca-file-upload')?.click();
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files)
            try {
                const uploadPromises = files.map(async (file) => {
                    const formData = new FormData()
                    formData.append("file", file)

                    const res = await fetch("/api/upload", {
                        method: "POST",
                        body: formData,
                    })

                    if (!res.ok) throw new Error(`Upload failed for ${file.name}`)

                    const data = await res.json()
                    addDocument({
                        id: data.document.id,
                        name: data.document.name,
                        url: data.document.url,
                        geminiUri: data.document.geminiUri,
                        createdAt: data.document.createdAt || Date.now()
                    })
                })

                await Promise.all(uploadPromises)
            } catch (error) {
                console.error(error)
                alert("Falha no upload de um ou mais arquivos")
            }
        }
    }

    return (
        <div className="p-8 max-w-6xl mx-auto w-full flex flex-col h-full">
            {/* Header & Breadcrumbs */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-foreground">Biblioteca de Documentos</h1>

                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                        <button
                            onClick={() => setCurrentFolderId(null)}
                            onDragOver={(e) => { e.preventDefault(); setDragOverFolderId('home'); }}
                            onDragLeave={() => setDragOverFolderId(null)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setDragOverFolderId(null);
                                const docId = e.dataTransfer.getData("text/plain");
                                if (docId) moveDocument(docId, null);
                            }}
                            className={`hover:text-foreground transition-colors flex items-center gap-1 ${dragOverFolderId === 'home' ? 'text-primary bg-primary/10 px-2 py-0.5 rounded' : ''}`}
                        >
                            <Home className="w-4 h-4" />
                            <span>Início</span>
                        </button>

                        {breadcrumbs.map((crumb, index) => (
                            <div key={crumb.id} className="flex items-center gap-2">
                                <ChevronRight className="w-4 h-4" />
                                <button
                                    onClick={() => setCurrentFolderId(crumb.id)}
                                    onDragOver={(e) => { e.preventDefault(); setDragOverFolderId(crumb.id); }}
                                    onDragLeave={() => setDragOverFolderId(null)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setDragOverFolderId(null);
                                        const docId = e.dataTransfer.getData("text/plain");
                                        if (docId) moveDocument(docId, crumb.id);
                                    }}
                                    className={`transition-colors flex items-center gap-1 ${index === breadcrumbs.length - 1 ? 'text-foreground font-medium' : 'hover:text-foreground'} ${dragOverFolderId === crumb.id ? 'text-primary bg-primary/10 px-2 py-0.5 rounded' : ''}`}
                                >
                                    <span>{crumb.name}</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsCreateFolderModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors text-sm font-medium border border-border/50 shadow-sm"
                    >
                        <FolderPlus className="w-4 h-4" />
                        <span>Nova Pasta</span>
                    </button>

                    <button
                        onClick={handleFileUploadClick}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors text-sm font-medium"
                    >
                        <UploadCloud className="w-4 h-4" />
                        <span>Fazer Upload</span>
                    </button>
                    <input
                        id="biblioteca-file-upload"
                        type="file"
                        multiple
                        className="hidden"
                        accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                    />
                </div>
            </div>

            {/* Folder Grid */}
            {currentFolders.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Pastas</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {currentFolders.map(folder => (
                            <div
                                key={folder.id}
                                onClick={() => setCurrentFolderId(folder.id)}
                                onDragOver={(e) => { e.preventDefault(); setDragOverFolderId(folder.id); }}
                                onDragLeave={() => setDragOverFolderId(null)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragOverFolderId(null);
                                    const docId = e.dataTransfer.getData("text/plain");
                                    if (docId) moveDocument(docId, folder.id);
                                }}
                                className={`group flex items-center gap-3 p-4 bg-card ${dragOverFolderId === folder.id ? 'bg-primary/10 border-primary ring-2 ring-primary/50' : 'hover:bg-zinc-800/50 border-border/50'} border rounded-xl cursor-pointer transition-all`}
                            >
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <Folder className="w-6 h-6" fill="currentColor" fillOpacity={0.2} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-sm text-foreground truncate">{folder.name}</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {documents.filter(d => d.folderId === folder.id).length} arquivos
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (confirm("Tem certeza que deseja excluir esta pasta? Seus arquivos não serão excluídos, mas ficarão sem pasta.")) {
                                            removeFolder(folder.id)
                                        }
                                    }}
                                    className="p-1.5 text-zinc-500 hover:text-danger hover:bg-danger/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Files Grid */}
            <div>
                <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Arquivos</h2>

                {currentDocuments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-card/50 border border-dashed border-border/50 rounded-2xl text-center">
                        <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-1">Nenhum arquivo encontrado</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mb-6">
                            {currentFolderId
                                ? "Esta pasta está vazia. Faça o upload de um arquivo para começar."
                                : "Não há arquivos soltos na raiz da biblioteca. Crie uma pasta ou faça um upload."}
                        </p>
                        <button
                            onClick={handleFileUploadClick}
                            className="text-primary hover:text-primary/80 font-medium text-sm transition-colors"
                        >
                            Clique para fazer upload
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-2">
                        {currentDocuments.map(doc => (
                            <div
                                key={doc.id}
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData("text/plain", doc.id)}
                                className="group flex flex-col gap-3 p-4 bg-card border border-border/50 rounded-xl hover:border-border transition-colors relative cursor-grab active:cursor-grabbing"
                            >
                                <button
                                    onClick={(e) => {
                                        e.preventDefault()
                                        if (confirm("Deseja excluir este documento?")) {
                                            removeDocument(doc.id)
                                        }
                                    }}
                                    className="absolute top-3 right-3 p-1.5 text-zinc-500 hover:text-danger hover:bg-danger/10 rounded-md opacity-0 group-hover:opacity-100 transition-all z-10"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>

                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 bg-zinc-800 rounded-lg text-zinc-400 shrink-0">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <h3 className="font-medium text-sm text-foreground truncate pr-6" title={doc.name}>{doc.name}</h3>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatDistanceToNow(doc.createdAt || 0, { addSuffix: true, locale: ptBR })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Folder Modal */}
            {isCreateFolderModalOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-md rounded-2xl border border-border/50 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h2 className="text-xl font-semibold text-foreground mb-1">Nova Pasta</h2>
                            <p className="text-sm text-muted-foreground mb-6">Crie uma nova pasta para organizar seus materiais.</p>

                            <form onSubmit={handleCreateFolder}>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="folderName" className="block text-sm font-medium text-foreground mb-1.5">
                                            Nome da Pasta
                                        </label>
                                        <input
                                            id="folderName"
                                            type="text"
                                            value={newFolderName}
                                            onChange={(e) => setNewFolderName(e.target.value)}
                                            placeholder="Ex: Concurso Banco do Brasil"
                                            className="w-full px-4 py-2.5 bg-zinc-100 bg-zinc-900 border border-border/50 rounded-xl text-foreground placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateFolderModalOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-foreground transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!newFolderName.trim()}
                                        className="px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Criar Pasta
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
