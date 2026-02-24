export default function ResumoLoading() {
    return (
        <div className="flex flex-col min-h-screen bg-background animate-pulse">
            <div className="flex items-center justify-center gap-4 pt-10 pb-8">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                        {i < 2 && <div className="w-12 h-px bg-zinc-200 dark:bg-zinc-800" />}
                    </div>
                ))}
            </div>

            <div className="flex-1 flex flex-col items-center px-6 pb-16 gap-8 max-w-3xl mx-auto w-full">
                <div className="w-full text-center space-y-2">
                    <div className="h-7 bg-zinc-200 dark:bg-zinc-800 rounded w-64 mx-auto" />
                    <div className="h-4 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-80 mx-auto" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="bg-card border border-border/30 rounded-2xl p-8 flex flex-col items-center gap-4">
                            <div className="w-14 h-14 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
                            <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-36" />
                            <div className="h-3.5 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-48" />
                        </div>
                    ))}
                </div>

                <div className="h-12 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
            </div>
        </div>
    )
}
