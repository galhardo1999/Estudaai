export default function DashboardLoading() {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground p-6 md:p-12 animate-pulse">
            <div className="max-w-4xl mx-auto w-full">
                <div className="mb-12">
                    <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-48 mb-3" />
                    <div className="h-4 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-72" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-card border border-border/30 rounded-2xl p-8 flex flex-col gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                            <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-40" />
                            <div className="space-y-2">
                                <div className="h-3.5 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-full" />
                                <div className="h-3.5 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-5/6" />
                                <div className="h-3.5 bg-zinc-200/60 dark:bg-zinc-800/60 rounded w-4/6" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
