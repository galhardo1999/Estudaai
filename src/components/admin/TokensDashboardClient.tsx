"use client";

import React, { useState, useEffect } from 'react';
import { ChevronDown, BarChart2, Loader2 } from 'lucide-react';
import { MetricProgressBar } from './MetricProgressBar';
import { LimitAreaChart } from './LimitAreaChart';

interface ModelMetric {
    id: string;
    name: string;
    category: string;
    rpm: { current: number; max: number };
    tpm: { current: number; max: number; formattedText?: string };
    rpd: { current: number; max: number };
}

interface ChartDataPoint {
    date: string;
    value: number;
}

interface DashboardData {
    models: ModelMetric[];
    charts: {
        rpmData: ChartDataPoint[];
        tpmData: ChartDataPoint[];
        rpdData: ChartDataPoint[];
        limits: {
            rpm: number;
            tpm: number;
            rpd: number;
        };
    };
}

export function TokensDashboardClient() {
    const [selectedModel, setSelectedModel] = useState("Gemini 2.5 Flash");
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTokensAdmin() {
            try {
                const res = await fetch('/api/admin/tokens');
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                } else {
                    console.error("Failed to load tokens data");
                }
            } catch (err) {
                console.error("Error fetching tokens data:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchTokensAdmin();
    }, []);

    if (loading) {
        return (
            <div className="w-full min-h-screen bg-[#18181b] flex items-center justify-center text-zinc-100">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
                    <p className="text-sm text-zinc-400">Carregando métricas de tokens...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="w-full min-h-screen bg-[#18181b] flex items-center justify-center text-zinc-100">
                <p className="text-zinc-400">Não foi possível carregar os dados.</p>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-[#18181b] text-zinc-100 p-8">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Table Section */}
                <div className="space-y-4">
                    <div className="grid grid-cols-12 gap-4 text-sm font-medium text-zinc-400 pb-3 border-b border-zinc-800/50">
                        <div className="col-span-3">Modelo</div>
                        <div className="col-span-3">Categoria</div>
                        <div className="col-span-2 flex items-center gap-1">RPM <ChevronDown className="w-4 h-4" /></div>
                        <div className="col-span-2">TPM</div>
                        <div className="col-span-1">RPD</div>
                        <div className="col-span-1 text-right">Gráficos</div>
                    </div>

                    <div className="space-y-2">
                        {data.models.map((model) => (
                            <div key={model.id} className="grid grid-cols-12 gap-4 items-center text-sm py-2">
                                <div className="col-span-3 text-zinc-300 font-medium">
                                    {model.name}
                                </div>
                                <div className="col-span-3 text-zinc-500">
                                    {model.category}
                                </div>
                                <div className="col-span-2 pr-4">
                                    <MetricProgressBar current={model.rpm.current} max={model.rpm.max} />
                                </div>
                                <div className="col-span-2 pr-4">
                                    <MetricProgressBar current={model.tpm.current} max={model.tpm.max} formattedText={model.tpm.formattedText} />
                                </div>
                                <div className="col-span-1">
                                    <MetricProgressBar className="justify-start gap-1 flex-row-reverse w-auto" current={model.rpd.current} max={model.rpd.max} />
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    <BarChart2 className="w-4 h-4 text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 flex justify-center">
                        <button className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors">
                            Ver mais <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Details Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-zinc-100">Detalhamento dos limites de taxa</h2>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-zinc-500">Modelo</span>
                            <div className="flex items-center gap-2 bg-[#27272a] hover:bg-zinc-700 px-4 py-1.5 rounded-full cursor-pointer transition-colors text-sm text-zinc-200">
                                {selectedModel} <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* RPM Card */}
                        <div className="bg-[#202022] border border-zinc-800 rounded-xl p-5 shadow-sm">
                            <h3 className="text-sm text-zinc-400 font-medium mb-1">Máximo de solicitações por minuto (RPM)</h3>
                            <LimitAreaChart
                                data={data.charts.rpmData}
                                limit={data.charts.limits.rpm}
                            />
                        </div>

                        {/* TPM Card */}
                        <div className="bg-[#202022] border border-zinc-800 rounded-xl p-5 shadow-sm">
                            <h3 className="text-sm text-zinc-400 font-medium mb-1">Máximo de tokens de entrada por minuto (TPM)</h3>
                            <LimitAreaChart
                                data={data.charts.tpmData}
                                limit={data.charts.limits.tpm}
                                yAxisFormatter={(val) => val === 0 ? "0" : `${(val / 1000).toFixed(0)}K`}
                            />
                        </div>

                        {/* RPD Card */}
                        <div className="bg-[#202022] border border-zinc-800 rounded-xl p-5 shadow-sm">
                            <h3 className="text-sm text-zinc-400 font-medium mb-1">Máximo de solicitações por dia (RPD)</h3>
                            <LimitAreaChart
                                data={data.charts.rpdData}
                                limit={data.charts.limits.rpd}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
