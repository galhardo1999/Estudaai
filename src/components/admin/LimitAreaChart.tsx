"use client";

import React, { useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';

interface DataPoint {
    date: string;
    value: number;
}

interface LimitAreaChartProps {
    data: DataPoint[];
    limit: number;
    dataKey?: string;
    xAxisKey?: string;
    yAxisFormatter?: (value: number) => string;
}

const CustomLimitLabel = (props: any) => {
    const { viewBox } = props;
    const x = viewBox.x ?? 0;
    const y = viewBox.y ?? 0;

    return (
        <g>
            <rect x={x + 5} y={y - 8} width={34} height={16} fill="#ef4444" rx={3} />
            <text x={x + 22} y={y + 3} fill="#fff" fontSize={9} fontWeight="bold" textAnchor="middle">
                Limite
            </text>
        </g>
    );
};

export function LimitAreaChart({
    data,
    limit,
    dataKey = "value",
    xAxisKey = "date",
    yAxisFormatter
}: LimitAreaChartProps) {

    // Tooltip personalizado para formatar de acordo com o tema
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-zinc-900 border border-zinc-800 rounded-md p-2 shadow-xl">
                    <p className="text-zinc-400 text-xs mb-1">{label}</p>
                    <p className="text-zinc-100 font-semibold text-sm">
                        {yAxisFormatter ? yAxisFormatter(payload[0].value) : payload[0].value}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="h-[220px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fff" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#fff" stopOpacity={0} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid
                        strokeDasharray="0"
                        vertical={false}
                        stroke="#27272a"
                        opacity={0.5}
                    />

                    <XAxis
                        dataKey={xAxisKey}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#71717a', fontSize: 11 }}
                        dy={10}
                        minTickGap={20}
                    />

                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#71717a', fontSize: 11 }}
                        tickFormatter={yAxisFormatter}
                        width={45}
                        orientation="right"
                        domain={[0, limit * 1.2]} // Define o máximo ligeiramente acima do limite para que a linha de limite fique visível
                    />

                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '4 4' }} />

                    <ReferenceLine
                        y={limit}
                        stroke="#ef4444"
                        strokeDasharray="4 4"
                        label={<CustomLimitLabel />}
                    />

                    <Area
                        type="linear"
                        dataKey={dataKey}
                        stroke="#fff"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorValue)"
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
