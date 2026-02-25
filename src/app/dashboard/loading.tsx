export default function DashboardLoading() {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground p-6 md:p-12 animate-pulse">
            <div className="max-w-6xl mx-auto w-full">
                {/* Header */}
                <div className="mb-10">
                    <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-48 mb-3" />
                    <div className="h-4 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-80" />
                </div>

                {/* Stats Cards */}
                <div className="mb-10">
                    <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-44 mb-4" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="bg-card border border-border/30 rounded-2xl p-5 flex flex-col items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                                <div className="h-7 bg-zinc-200 dark:bg-zinc-800 rounded w-16" />
                                <div className="h-3 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-20" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Evolution Cards */}
                <div className="mb-10">
                    <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-44 mb-4" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-card border border-border/30 rounded-2xl p-6 flex flex-col gap-3">
                                <div className="h-3.5 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-28" />
                                <div className="h-9 bg-zinc-200 dark:bg-zinc-800 rounded w-20" />
                                <div className="h-3 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-36" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Performance */}
                <div className="mb-10">
                    <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-56 mb-4" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="bg-card border border-border/30 rounded-2xl p-6 flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                                <div className="flex flex-col gap-2">
                                    <div className="h-3.5 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-20" />
                                    <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-16" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-card border border-border/30 rounded-2xl p-6">
                        <div className="h-3.5 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-44 mb-4" />
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="h-3.5 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-16" />
                                    <div className="flex-1 bg-zinc-200/30 dark:bg-zinc-800/30 rounded-full h-5" />
                                    <div className="h-3.5 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-12" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div>
                    <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-32 mb-4" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="bg-card border border-border/30 rounded-2xl p-8 flex flex-col gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                                <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-40" />
                                <div className="space-y-2">
                                    <div className="h-3.5 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-full" />
                                    <div className="h-3.5 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-5/6" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
