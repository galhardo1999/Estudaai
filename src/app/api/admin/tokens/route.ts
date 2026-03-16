import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { startOfDay, subDays, subMinutes, format } from "date-fns";

export async function GET() {
    try {
        const session = await auth();

        const userRole = (session?.user as { role?: string } | undefined)?.role || "USER";
        if (!session || !session.user || userRole !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // We only have one model right now, "gemini-2.5-flash", but let's aggregate for it
        const modelName = "gemini-2.5-flash";

        // Limits based on the Gemini free tier for Flash
        const limitRpm = 15;
        const limitTpm = 1000000;
        const limitRpd = 1500;

        const now = new Date();
        const oneMinuteAgo = subMinutes(now, 1);
        const todayStart = startOfDay(now);
        const sevenDaysAgo = subDays(todayStart, 6);

        // 1. Busca apenas 2 queries: últimos 60 min e últimos 7 dias
        const sixtyMinutesAgo = subMinutes(now, 59);
        const allRecentMinuteUsages = await prisma.tokenUsage.findMany({
            where: {
                modelo: modelName,
                criadoEm: { gte: sixtyMinutesAgo }
            },
            orderBy: { criadoEm: 'asc' }
        });

        const allRecentDayUsages = await prisma.tokenUsage.findMany({
            where: {
                modelo: modelName,
                criadoEm: { gte: sevenDaysAgo }
            },
            orderBy: { criadoEm: 'asc' }
        });

        // Deriva métricas atuais filtrando em memória (evita 2 queries extras)
        const currentMinuteUsages = allRecentMinuteUsages.filter(u => u.criadoEm >= oneMinuteAgo);
        const todayUsages = allRecentDayUsages.filter(u => u.criadoEm >= todayStart);

        const currentRpm = currentMinuteUsages.length;
        const currentTpm = currentMinuteUsages.reduce((acc, usage) => acc + usage.totalTokens, 0);
        const currentRpd = todayUsages.length;

        // Aggregate by minute for RPM/TPM
        const minuteAggregation: Record<string, { requests: number; tokens: number }> = {};
        for (let i = 0; i < 60; i++) {
            const m = format(subMinutes(now, 59 - i), "HH:mm");
            minuteAggregation[m] = { requests: 0, tokens: 0 };
        }

        allRecentMinuteUsages.forEach(usage => {
            const m = format(usage.criadoEm, "HH:mm");
            if (minuteAggregation[m]) {
                minuteAggregation[m].requests += 1;
                minuteAggregation[m].tokens += usage.totalTokens;
            }
        });

        const rpmData = Object.keys(minuteAggregation).map(time => ({
            date: time,
            value: minuteAggregation[time].requests
        }));

        const tpmData = Object.keys(minuteAggregation).map(time => ({
            date: time,
            value: minuteAggregation[time].tokens
        }));

        // Aggregate by day for RPD
        const dayAggregation: Record<string, number> = {};
        for (let i = 0; i < 7; i++) {
            const d = format(subDays(todayStart, 6 - i), "dd/MM");
            dayAggregation[d] = 0;
        }

        allRecentDayUsages.forEach(usage => {
            const d = format(usage.criadoEm, "dd/MM");
            if (dayAggregation[d] !== undefined) {
                dayAggregation[d] += 1;
            }
        });

        const rpdData = Object.keys(dayAggregation).map(day => ({
            date: day,
            value: dayAggregation[day]
        }));

        const payload = {
            models: [
                {
                    id: modelName,
                    name: "Gemini 2.5 Flash",
                    category: "Modelos de saída de texto",
                    rpm: { current: currentRpm, max: limitRpm },
                    tpm: {
                        current: currentTpm,
                        max: limitTpm,
                        formattedText: `${(currentTpm / 1000).toFixed(1)}K / ${(limitTpm / 1000).toFixed(0)}K`
                    },
                    rpd: { current: currentRpd, max: limitRpd }
                }
            ],
            charts: {
                rpmData,
                tpmData,
                rpdData,
                limits: {
                    rpm: limitRpm,
                    tpm: limitTpm,
                    rpd: limitRpd
                }
            }
        };

        return NextResponse.json(payload, { status: 200 });

    } catch (error) {
        console.error("Failed to fetch token usage data:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}
