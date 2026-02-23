"use client"

import React, { createContext, useContext, useState } from 'react';

export type FolderType = {
    id: string;
    name: string;
    createdAt: number;
};

export type DocumentType = {
    id: string;
    name: string;
    url: string;
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

    folders: FolderType[];
    addFolder: (name: string) => void;
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

    const addDocument = (doc: DocumentType) => {
        setDocuments(prev => [{ ...doc, folderId: currentFolderId || undefined, createdAt: Date.now() }, ...prev]);
        setActiveDocumentId(doc.id);
    };

    const removeDocument = (id: string) => {
        setDocuments(prev => prev.filter(d => d.id !== id));
        if (activeDocumentId === id) {
            setActiveDocumentId(null);
        }
    };

    const addFolder = (name: string) => {
        const newFolder: FolderType = {
            id: crypto.randomUUID(),
            name,
            createdAt: Date.now(),
        };
        setFolders(prev => [...prev, newFolder]);
    };

    const removeFolder = (id: string) => {
        setFolders(prev => prev.filter(f => f.id !== id));
        // Also remove or move documents inside this folder? 
        // For now let's just delete the folder and the documents will be "orphaned" or we delete them too.
        setDocuments(prev => prev.filter(d => d.folderId !== id));
        if (currentFolderId === id) {
            setCurrentFolderId(null);
        }
    };

    const activeDocument = documents.find(d => d.id === activeDocumentId) || null;

    return (
        <DocumentContext.Provider value={{
            documents, addDocument, removeDocument, activeDocumentId, setActiveDocumentId, activeDocument,
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
