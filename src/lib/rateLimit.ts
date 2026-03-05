import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiter distribuído usando Upstash Redis com sliding window.
 * Funciona corretamente em ambientes serverless (Vercel) porque o
 * estado é mantido no Redis, não na memória da instância.
 */

// ─── Redis Client ─────────────────────────────────────────────────────────────

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken ? new Redis({
    url: redisUrl,
    token: redisToken,
}) : null;

// ─── Rate limiters pré-configurados por categoria ─────────────────────────────

const aiLimiter = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "60 s"),
    analytics: true,
    prefix: "ratelimit:ai",
}) : null;

const uploadLimiter = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    analytics: true,
    prefix: "ratelimit:upload",
}) : null;

const registerLimiter = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "300 s"),
    analytics: true,
    prefix: "ratelimit:register",
}) : null;

const defaultLimiter = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "60 s"),
    analytics: true,
    prefix: "ratelimit:default",
}) : null;

// ─── Mapeamento de categorias ─────────────────────────────────────────────────

/**
 * Configurações de rate limit por rota (mantida para compatibilidade).
 * Os valores agora são usados para selecionar o limiter correto.
 */
export const RATE_LIMITS = {
    ai: { limit: 5, windowMs: 60_000 },
    upload: { limit: 10, windowMs: 60_000 },
    register: { limit: 5, windowMs: 300_000 },
    default: { limit: 30, windowMs: 60_000 },
} as const;

function getLimiter(config: { limit: number; windowMs: number }): Ratelimit | null {
    // Identifica o limiter correto comparando com as configs conhecidas
    if (config === RATE_LIMITS.ai) return aiLimiter;
    if (config === RATE_LIMITS.upload) return uploadLimiter;
    if (config === RATE_LIMITS.register) return registerLimiter;
    return defaultLimiter;
}

// ─── API pública (mesma interface de antes) ───────────────────────────────────

/**
 * Extrai o IP do request para usar como identificador de rate limiting.
 */
export function getClientIp(request: Request): string {
    const headers = new Headers(request.headers);
    return (
        headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headers.get("x-real-ip") ||
        "unknown"
    );
}

/**
 * Helper: aplica rate limiting e retorna Response 429 se excedido.
 * Retorna `null` se o request é permitido.
 *
 * A assinatura é idêntica à versão anterior para não exigir mudanças
 * nas API routes existentes.
 */
export async function applyRateLimit(
    request: Request,
    routeName: string,
    config: { limit: number; windowMs: number } = RATE_LIMITS.default
): Promise<NextResponse | null> {
    const limiter = getLimiter(config);

    // Se o Redis não estiver configurado (ex: amb. de dev), permitimos sempre o acesso
    if (!limiter) {
        console.warn("⚠️ Rate limiting bypass (no Upstash Redis configured)");
        return null;
    }

    const ip = getClientIp(request);
    const identifier = `${ip}:${routeName}`;

    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    if (!success) {
        const resetMs = Math.max(0, reset - Date.now());
        return NextResponse.json(
            { error: "Muitas requisições. Tente novamente em alguns segundos." },
            {
                status: 429,
                headers: {
                    "Retry-After": String(Math.ceil(resetMs / 1000)),
                    "X-RateLimit-Limit": String(limit),
                    "X-RateLimit-Remaining": "0",
                },
            }
        );
    }

    return null;
}
