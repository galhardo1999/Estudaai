"use client"

import React, { useRef } from "react"
import ExportPDFButton from "@/components/ExportPDFButton"

interface ClientPDFWrapperProps {
    filename: string
    isFlashcard: boolean
    children: React.ReactNode
}

export default function ClientPDFWrapper({ filename, isFlashcard, children }: ClientPDFWrapperProps) {
    // This ref captures the exact DOM node to be rendered into the PDF.
    const contentRef = useRef<HTMLDivElement>(null)

    return (
        <div className="w-full">
            <div className="flex w-full items-center justify-between gap-4 mb-6">
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 ${isFlashcard ? "bg-purple-500/10 text-purple-400" : "bg-primary/10 text-primary"}`}>
                    {isFlashcard ? "Flashcards" : "Resumo Detalhado"}
                </span>

                <ExportPDFButton
                    filename={`${filename}.pdf`}
                    contentRef={contentRef}
                />
            </div>

            {/* The actual content to be printed is wrapped here */}
            <div ref={contentRef} className="bg-background pt-2 pb-10 px-4 rounded-xl">
                {children}
            </div>
        </div>
    )
}
