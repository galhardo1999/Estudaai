export default function HistoricoLoading() {
    return (
        <div className="flex flex-col min-h-screen bg-background p-6 md:p-12 animate-pulse">
            <div className="max-w-5xl mx-auto w-full">
                <div className="mb-10">
                    <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-56 mb-3" />
                    <div className="h-4 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-80" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-card border border-border/30 rounded-2xl p-5">
                            <div className="h-3 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-20 mb-3" />
                            <div className="h-7 bg-zinc-200 dark:bg-zinc-800 rounded w-12" />
                        </div>
                    ))}
                </div>

                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-card border border-border/30 rounded-2xl p-6 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-40" />
                                    <div className="h-3 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-56" />
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right space-y-2">
                                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16" />
                                    <div className="h-3 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-12" />
                                </div>
                                <div className="w-5 h-5 bg-zinc-200 dark:bg-zinc-800 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
