/**
 * reset-db.ts
 * Apaga TODOS os dados do banco (usuários, históricos, simulados, resumos, etc.)
 * E também remove todos os arquivos do Supabase Storage (bucket "documentos").
 *
 * Uso:
 *   bun scripts/reset-db.ts
 *
 * ⚠️  IRREVERSÍVEL — use com cuidado!
 */

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role para acesso admin
);

const BUCKET = "documentos";

async function clearSupabaseStorage() {
    console.log("🗂️  Limpando Supabase Storage...");

    // Lista todos os arquivos no bucket (até 1000 por chamada)
    let totalRemoved = 0;
    let hasMore = true;
    let offset = 0;

    while (hasMore) {
        const { data: files, error } = await supabase.storage
            .from(BUCKET)
            .list("", { limit: 1000, offset });

        if (error) {
            console.error("  ❌ Erro ao listar arquivos:", error.message);
            break;
        }

        if (!files || files.length === 0) {
            hasMore = false;
            break;
        }

        const paths = files.map((f) => f.name);
        const { error: removeError } = await supabase.storage
            .from(BUCKET)
            .remove(paths);

        if (removeError) {
            console.error("  ❌ Erro ao remover arquivos:", removeError.message);
        } else {
            totalRemoved += paths.length;
        }

        if (files.length < 1000) {
            hasMore = false;
        } else {
            offset += 1000;
        }
    }

    console.log(`  ✅ Storage: ${totalRemoved} arquivo(s) removido(s) do bucket "${BUCKET}"`);
}

async function clearDatabase() {
    console.log("\n🗃️  Limpando banco de dados...");

    // A ordem importa: apagar filhos antes dos pais (foreign keys)
    const results = await prisma.$transaction([
        prisma.resumo.deleteMany(),
        prisma.exame.deleteMany(),
        prisma.documento.deleteMany(),
        prisma.pasta.deleteMany(),
        prisma.verificationToken.deleteMany(),
        prisma.session.deleteMany(),
        prisma.account.deleteMany(),
        prisma.user.deleteMany(),
    ]);

    const labels = [
        "Resumos",
        "Exames",
        "Documentos",
        "Pastas",
        "VerificationTokens",
        "Sessions",
        "Accounts",
        "Users",
    ];

    labels.forEach((label, i) => {
        console.log(`  ✅ ${label}: ${(results[i] as { count: number }).count} registro(s) removido(s)`);
    });
}

async function main() {
    console.log("⚠️  RESET COMPLETO — banco de dados + Supabase Storage\n");

    await clearSupabaseStorage();
    await clearDatabase();

    console.log("\n🏁 Reset concluído. Tudo está vazio.");
}

main()
    .catch((e) => {
        console.error("❌ Erro durante o reset:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
