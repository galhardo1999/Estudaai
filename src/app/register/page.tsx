"use client"

import { BrainCircuit, Mail, Lock, User } from "lucide-react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function RegisterPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const router = useRouter()

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        try {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name, email, password }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Erro ao registrar usuário.")
            }

            // Immediately redirect to login after successful registration
            router.push("/login?registered=true")
        } catch (error: any) {
            setError(error.message || "Ocorreu um erro inesperado.")
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col items-center">
                {/* Logo */}
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/10 shrink-0">
                    <BrainCircuit className="w-7 h-7 text-primary" />
                </div>

                <h1 className="text-2xl font-bold text-foreground mb-2">Crie sua conta</h1>
                <p className="text-muted-foreground text-sm text-center mb-8">
                    Junte-se ao EstudosAI e revolucione sua forma de aprender.
                </p>

                {error && (
                    <div className="w-full p-3 mb-6 text-sm text-danger-foreground bg-danger-bg rounded-lg border border-danger/20 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="w-full flex flex-col gap-4 mb-6">
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Seu nome"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full bg-secondary/30 border border-input rounded-xl py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                    </div>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="email"
                            placeholder="Seu e-mail"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-secondary/30 border border-input rounded-xl py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="password"
                            placeholder="Crie uma senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full bg-secondary/30 border border-input rounded-xl py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-semibold py-3 rounded-xl transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center mt-2"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        ) : (
                            "Cadastrar"
                        )}
                    </button>
                </form>

                <p className="mt-4 text-sm text-muted-foreground">
                    Já tem uma conta?{" "}
                    <Link href="/login" className="text-primary hover:text-primary-hover font-semibold transition-colors">
                        Faça login
                    </Link>
                </p>
            </div>
        </div>
    )
}
