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

    // Fetch documents and folders from database on mount
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
        // Create on server first, then add to state with the real DB id
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
        // Collect all subfolder IDs recursively (for local state cleanup)
        const getSubfolderIds = (folderId: string): string[] => {
            const children = folders.filter(f => f.parentId === folderId).map(f => f.id);
            return [...children, ...children.flatMap(getSubfolderIds)];
        };

        const idsToRemove = [id, ...getSubfolderIds(id)];

        // Update local state immediately
        setFolders(prev => prev.filter(f => !idsToRemove.includes(f.id)));
        // Documents in deleted folders lose their folderId
        setDocuments(prev => prev.map(d => d.folderId && idsToRemove.includes(d.folderId) ? { ...d, folderId: undefined } : d));

        if (currentFolderId && idsToRemove.includes(currentFolderId)) {
            setCurrentFolderId(null);
        }

        // Delete on server (cascades subfolders via Prisma)
        try {
            await fetch(`/api/folders/${id}`, { method: "DELETE" });
        } catch (error) {
            console.error("Failed to delete folder:", error);
        }
    };

    const moveDocument = async (id: string, folderId: string | null) => {
        // Update local state immediately
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, folderId: folderId || undefined } : d));

        // Persist to server
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
            folders, addFolder, removeFolder, currentFolderId, setCurrentFolderId
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
