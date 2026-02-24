export default function ResultadoLoading() {
    return (
        <div className="flex flex-col min-h-screen bg-background p-6 md:p-12 animate-pulse">
            <div className="max-w-5xl mx-auto w-full">
                <div className="h-4 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-32 mb-8" />

                <div className="bg-card border border-border/30 rounded-2xl p-8 mb-6">
                    <div className="h-7 bg-zinc-200 dark:bg-zinc-800 rounded w-48 mb-3" />
                    <div className="h-4 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-64" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-card border border-border/30 rounded-2xl p-5">
                            <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg mb-3" />
                            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-12 mb-1" />
                            <div className="h-3 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-20" />
                        </div>
                    ))}
                </div>

                <div className="bg-card border border-border/30 rounded-2xl p-6">
                    <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-40 mb-5" />
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="border border-border/20 rounded-xl p-4">
                                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full mb-3" />
                                <div className="h-4 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-4/5 mb-4" />
                                <div className="grid grid-cols-2 gap-2">
                                    {[...Array(4)].map((_, j) => (
                                        <div key={j} className="h-3 bg-zinc-200/40 dark:bg-zinc-800/40 rounded" />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
