import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// ─── Content Security Policy ──────────────────────────────────────────────────
// Em desenvolvimento, Next.js precisa de unsafe-eval (HMR/React DevTools) e
// unsafe-inline (estilos injetados). Em produção, removemos ambos para
// proteção real contra XSS.
const cspDirectives = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
    : "script-src 'self'",
  isDev
    ? "style-src 'self' 'unsafe-inline'"
    : "style-src 'self' 'unsafe-inline'", // Tailwind CSS ainda precisa de unsafe-inline para estilos
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co https://*.googleapis.com",
  "frame-src 'self' https://*.supabase.co",
].join("; ");

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        // Proteção contra clickjacking — impede que o site seja embutido em iframes
        { key: "X-Frame-Options", value: "DENY" },
        // Previne sniffing de MIME type pelo navegador
        { key: "X-Content-Type-Options", value: "nosniff" },
        // Controla quais informações de referrer são enviadas
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // Força HTTPS por 1 ano (incluindo subdomínios)
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        // Permite DNS prefetch para melhorar performance
        { key: "X-DNS-Prefetch-Control", value: "on" },
        // Restringe APIs do navegador que o site pode acessar
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        // Content Security Policy — previne XSS e injeção de conteúdo
        { key: "Content-Security-Policy", value: cspDirectives },
      ],
    },
  ],
};

export default nextConfig;
