"use client"

import React, { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExportPDFButtonProps {
    filename: string
    contentRef: React.MutableRefObject<any>
    isGenerating?: boolean
    className?: string
}

export default function ExportPDFButton({ filename, contentRef, isGenerating = false, className }: ExportPDFButtonProps) {
    const [loading, setLoading] = useState(false)

    async function handleExport() {
        if (!contentRef.current) return
        setLoading(true)
        try {
            // Dynamic imports to keep bundle size minimal
            const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
                import('html2canvas-pro'),
                import('jspdf'),
            ])

            const element = contentRef.current as HTMLElement
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: null,
            })

            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF({
                orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height],
            })
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
            pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
        } catch (err) {
            console.error('Erro ao exportar PDF:', err)
        } finally {
            setLoading(false)
        }
    }

    const busy = isGenerating || loading

    return (
        <button
            onClick={handleExport}
            disabled={busy}
            className={cn(
                "flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-white rounded-lg transition-colors text-sm font-medium",
                busy && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            {busy ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gerando...</span>
                </>
            ) : (
                <>
                    <Download className="w-4 h-4" />
                    <span>Exportar PDF</span>
                </>
            )}
        </button>
    )
}
