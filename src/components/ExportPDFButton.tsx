import React from 'react';
import { usePDF } from 'react-to-pdf';
import { Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportPDFButtonProps {
    filename: string;
    contentRef: React.MutableRefObject<any>;
    isGenerating?: boolean; // If there's an external loading state (like generating the markdown)
    className?: string; // Optional styling
}

export default function ExportPDFButton({ filename, contentRef, isGenerating = false, className }: ExportPDFButtonProps) {
    const { toPDF, targetRef } = usePDF({ filename });

    // We bind the hook's targetRef to the ref passed in by the parent component automatically.
    // This allows the parent to just specify exactly what DOM node to export.
    React.useEffect(() => {
        if (contentRef.current) {
            targetRef.current = contentRef.current;
        }
    }, [contentRef, targetRef]);

    return (
        <button
            onClick={() => toPDF()}
            disabled={isGenerating}
            className={cn(
                "flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-white rounded-lg transition-colors text-sm font-medium",
                isGenerating && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            {isGenerating ? (
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
    );
}
