"use client"

import React, { createContext, useContext, useState } from 'react';

export type DocumentType = {
    id: string;
    name: string;
    url: string;
};

interface DocumentContextType {
    documents: DocumentType[];
    addDocument: (doc: DocumentType) => void;
    removeDocument: (id: string) => void;
    activeDocumentId: string | null;
    setActiveDocumentId: (id: string | null) => void;
    activeDocument: DocumentType | null;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: React.ReactNode }) {
    const [documents, setDocuments] = useState<DocumentType[]>([]);
    const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

    const addDocument = (doc: DocumentType) => {
        setDocuments(prev => [doc, ...prev]);
        setActiveDocumentId(doc.id);
    };

    const removeDocument = (id: string) => {
        setDocuments(prev => prev.filter(d => d.id !== id));
        if (activeDocumentId === id) {
            setActiveDocumentId(null);
        }
    };

    const activeDocument = documents.find(d => d.id === activeDocumentId) || null;

    return (
        <DocumentContext.Provider value={{ documents, addDocument, removeDocument, activeDocumentId, setActiveDocumentId, activeDocument }}>
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
