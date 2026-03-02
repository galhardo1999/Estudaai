"use client"

import React, { useRef } from "react"
import ExportPDFButton from "@/components/ExportPDFButton"

interface SimuladoPDFWrapperProps {
    filename: string
    diffLabel: string
    diffColor: string
    children: React.ReactNode
}

export default function SimuladoPDFWrapper({ filename, diffLabel, diffColor, children }: SimuladoPDFWrapperProps) {
    const contentRef = useRef<HTMLDivElement>(null)

    return (
        <div className="w-full">
            <div className="flex w-full items-center justify-between gap-4 mb-6 mt-4">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${diffColor}`}>
                    {diffLabel}
                </span>

                <ExportPDFButton
                    filename={`${filename}-resultado.pdf`}
                    contentRef={contentRef}
                />
            </div>

            {/* Everything inside this ref will be rendered into the PDF exactly as seen on screen */}
            <div ref={contentRef} className="bg-background pt-8 pb-10 px-8 rounded-2xl border border-border/20">
                {children}
            </div>
        </div>
    )
}
