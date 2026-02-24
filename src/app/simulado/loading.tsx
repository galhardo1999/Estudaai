export default function SimuladoLoading() {
    return (
        <div className="flex flex-1 flex-col md:flex-row items-stretch justify-start gap-6 p-6 md:p-12 min-h-screen max-w-6xl mx-auto w-full animate-pulse">
            {/* Left: Material de Estudo */}
            <div className="w-full md:w-1/3 bg-card border border-border/30 rounded-2xl p-6 flex flex-col gap-6">
                <div>
                    <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-40 mb-2" />
                    <div className="h-3.5 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-56" />
                </div>
                <div className="w-full h-40 bg-zinc-100 dark:bg-zinc-800/30 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl" />
                <div className="flex flex-col gap-2 flex-1">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-3 rounded-xl border border-border/30 flex items-center gap-3">
                            <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg shrink-0" />
                            <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded flex-1" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Configurações */}
            <div className="w-full md:w-2/3 bg-card border border-border/30 rounded-2xl p-8 flex flex-col gap-6">
                <div>
                    <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-48 mb-2" />
                    <div className="h-3.5 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-64" />
                </div>
                <div className="h-32 bg-zinc-100 dark:bg-zinc-800/30 rounded-xl border border-border/20" />
                <div className="flex gap-3 flex-wrap">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-10 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                    ))}
                </div>
                <div className="flex gap-3 flex-wrap">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-10 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                    ))}
                </div>
                <div className="mt-auto flex justify-end">
                    <div className="h-12 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                </div>
            </div>
        </div>
    )
}
