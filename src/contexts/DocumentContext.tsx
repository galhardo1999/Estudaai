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

    // Fetch documents from database on mount
    const fetchDocuments = useCallback(async () => {
        try {
            const res = await fetch("/api/documents");
            if (res.ok) {
                const data = await res.json();
                setDocuments(data.documents || []);
            }
        } catch (error) {
            console.error("Failed to fetch documents:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const addDocument = (doc: DocumentType) => {
        setDocuments(prev => [{ ...doc, folderId: currentFolderId || undefined, createdAt: doc.createdAt || Date.now() }, ...prev]);
        setActiveDocumentId(doc.id);
    };

    const removeDocument = async (id: string) => {
        // Remove from state immediately for instant UI feedback
        setDocuments(prev => prev.filter(d => d.id !== id));
        if (activeDocumentId === id) {
            setActiveDocumentId(null);
        }

        // Delete from server
        try {
            await fetch(`/api/documents/${id}`, { method: "DELETE" });
        } catch (error) {
            console.error("Failed to delete document:", error);
        }
    };

    const addFolder = (name: string, parentId?: string) => {
        const newFolder: FolderType = {
            id: crypto.randomUUID(),
            name,
            parentId,
            createdAt: Date.now(),
        };
        setFolders(prev => [...prev, newFolder]);
    };

    const removeFolder = (id: string) => {
        // Collect all subfolder IDs recursively
        const getSubfolderIds = (folderId: string): string[] => {
            const children = folders.filter(f => f.parentId === folderId).map(f => f.id);
            return [...children, ...children.flatMap(getSubfolderIds)];
        };

        const idsToRemove = [id, ...getSubfolderIds(id)];

        setFolders(prev => prev.filter(f => !idsToRemove.includes(f.id)));
        setDocuments(prev => prev.filter(d => d.folderId ? !idsToRemove.includes(d.folderId) : true));

        if (currentFolderId && idsToRemove.includes(currentFolderId)) {
            setCurrentFolderId(null);
        }
    };

    const moveDocument = (id: string, folderId: string | null) => {
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, folderId: folderId || undefined } : d));
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
