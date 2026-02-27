export default function BibliotecaLoading() {
    return (
        <div className="p-8 max-w-6xl mx-auto w-full flex flex-col h-full animate-pulse">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col gap-2">
                    <div className="h-7 bg-zinc-800 rounded-lg w-56" />
                    <div className="h-4 bg-zinc-800/60 rounded w-32 mt-1" />
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-9 bg-zinc-800 rounded-lg w-32" />
                    <div className="h-9 bg-zinc-800 rounded-lg w-36" />
                </div>
            </div>

            {/* Folders section */}
            <div className="mb-8">
                <div className="h-3.5 bg-zinc-800/60 rounded w-16 mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-4 bg-card border border-border/30 rounded-xl">
                            <div className="p-2 bg-zinc-800 rounded-lg shrink-0">
                                <div className="w-6 h-6 rounded bg-zinc-700" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="h-3.5 bg-zinc-800 rounded w-3/4" />
                                <div className="h-2.5 bg-zinc-800/60 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Files section */}
            <div>
                <div className="h-3.5 bg-zinc-800/60 rounded w-14 mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-2">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex flex-col gap-3 p-4 bg-card border border-border/30 rounded-xl">
                            <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-zinc-800 rounded-lg shrink-0">
                                    <div className="w-6 h-6 rounded bg-zinc-700" />
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5 space-y-2">
                                    <div className="h-3 bg-zinc-800 rounded w-3/4" />
                                    <div className="h-2.5 bg-zinc-800/60 rounded w-1/2" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
