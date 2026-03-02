import React from 'react';
import { cn } from '@/lib/utils';

interface MetricProgressBarProps {
    current: number;
    max: number;
    formattedText?: string;
    className?: string;
}

export function MetricProgressBar({ current, max, formattedText, className }: MetricProgressBarProps) {
    const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
    const isOverLimit = current >= max;

    return (
        <div className={cn("flex items-center gap-3 w-full", className)}>
            <div className="h-1.5 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                    className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isOverLimit ? "bg-red-500" : "bg-zinc-400"
                    )}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className={cn(
                "text-xs w-24 whitespace-nowrap text-right",
                isOverLimit ? "text-red-400" : "text-zinc-400"
            )}>
                {formattedText || `${current} / ${max}`}
            </span>
        </div>
    );
}
