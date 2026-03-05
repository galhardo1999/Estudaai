"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type FolderType = {
    id: string;
    name: string;
    parentId?: string;
    createdAt: number;
};

export type DocumentType = {
    id: string;
    name: string;
    url: string;
    geminiUri?: string | null;
    folderId?: string;
    size?: number | null;
    createdAt: number;
};

interface DocumentContextType {
    documents: DocumentType[];
    addDocument: (doc: DocumentType) => void;
    removeDocument: (id: string) => void;
    activeDocumentId: string | null;
    setActiveDocumentId: (id: string | null) => void;
    activeDocument: DocumentType | null;
    moveDocument: (id: string, folderId: string | null) => void;
    isLoading: boolean;

    folders: FolderType[];
    addFolder: (name: string, parentId?: string) => void;
    removeFolder: (id: string) => void;
    renameFolder: (id: string, newName: string) => Promise<void>;
    currentFolderId: string | null;
    setCurrentFolderId: (id: string | null) => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: React.ReactNode }) {
    const [documents, setDocuments] = useState<DocumentType[]>([]);
    const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
    const [folders, setFolders] = useState<FolderType[]>([]);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Busca documentos e pastas do banco de dados na montagem
    const fetchData = useCallback(async () => {
        try {
            const [docsRes, foldersRes] = await Promise.all([
                fetch("/api/documents"),
                fetch("/api/folders"),
            ]);

            if (docsRes.ok) {
                const docsData = await docsRes.json();
                setDocuments(docsData.documents || []);
            }

            if (foldersRes.ok) {
                const foldersData = await foldersRes.json();
                setFolders(foldersData.folders || []);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const addDocument = (doc: DocumentType) => {
        setDocuments(prev => [{ ...doc, folderId: currentFolderId || undefined, createdAt: doc.createdAt || Date.now() }, ...prev]);
        setActiveDocumentId(doc.id);
    };

    const removeDocument = async (id: string) => {
        setDocuments(prev => prev.filter(d => d.id !== id));
        if (activeDocumentId === id) {
            setActiveDocumentId(null);
        }

        try {
            await fetch(`/api/documents/${id}`, { method: "DELETE" });
        } catch (error) {
            console.error("Failed to delete document:", error);
        }
    };

    const addFolder = async (name: string, parentId?: string) => {
        // Cria no servidor primeiro, depois adiciona ao estado com o id real do banco
        try {
            const res = await fetch("/api/folders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, parentId: parentId || null }),
            });

            if (res.ok) {
                const data = await res.json();
                const newFolder: FolderType = {
                    id: data.folder.id,
                    name: data.folder.name,
                    parentId: data.folder.parentId || undefined,
                    createdAt: data.folder.createdAt,
                };
                setFolders(prev => [...prev, newFolder]);
            }
        } catch (error) {
            console.error("Failed to create folder:", error);
        }
    };

    const removeFolder = async (id: string) => {
        // Coleta todos os IDs de subpastas recursivamente (para limpeza do estado local)
        const getSubfolderIds = (folderId: string): string[] => {
            const children = folders.filter(f => f.parentId === folderId).map(f => f.id);
            return [...children, ...children.flatMap(getSubfolderIds)];
        };

        const idsToRemove = [id, ...getSubfolderIds(id)];

        // Atualiza o estado local imediatamente
        setFolders(prev => prev.filter(f => !idsToRemove.includes(f.id)));
        // Documentos em pastas excluídas perdem seu folderId
        setDocuments(prev => prev.map(d => d.folderId && idsToRemove.includes(d.folderId) ? { ...d, folderId: undefined } : d));

        if (currentFolderId && idsToRemove.includes(currentFolderId)) {
            setCurrentFolderId(null);
        }

        // Exclui no servidor (cascateia subpastas via Prisma)
        try {
            await fetch(`/api/folders/${id}`, { method: "DELETE" });
        } catch (error) {
            console.error("Failed to delete folder:", error);
        }
    };

    const renameFolder = async (id: string, newName: string) => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        // Atualização otimista
        setFolders(prev => prev.map(f => f.id === id ? { ...f, name: trimmed } : f));
        try {
            await fetch(`/api/folders/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: trimmed }),
            });
        } catch (error) {
            console.error("Failed to rename folder:", error);
        }
    };

    const moveDocument = async (id: string, folderId: string | null) => {
        // Atualiza o estado local imediatamente
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, folderId: folderId || undefined } : d));

        // Persiste no servidor
        try {
            await fetch(`/api/documents/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ folderId }),
            });
        } catch (error) {
            console.error("Failed to move document:", error);
        }
    };

    const activeDocument = documents.find(d => d.id === activeDocumentId) || null;

    return (
        <DocumentContext.Provider value={{
            documents, addDocument, removeDocument, activeDocumentId, setActiveDocumentId, activeDocument, moveDocument, isLoading,
            folders, addFolder, removeFolder, renameFolder, currentFolderId, setCurrentFolderId
        }}>
            {children}
        </DocumentContext.Provider>
    );
}

export function useDocuments() {
    const context = useContext(DocumentContext);
    if (context === undefined) {
        throw new Error('useDocuments must be used within a DocumentProvider');
    }
    return context;
}
