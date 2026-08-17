'use client';

import { useState, useRef, useEffect } from 'react';
import { DollarSign, Sparkles, TrendingUp, Paintbrush, Droplet, UserCheck, Truck, Layers, ShieldCheck } from 'lucide-react';

interface SankeyFlowProps {
    financialData?: {
        grossRevenue: number;
        netProfit: number;
        painterCost: number;
        productionCost: number;
        commissionCost: number;
        freightCost: number;
    };
    catalogData?: Array<{
        studio: string;
        series: string;
        value: number;
    }>;
    hideValues?: boolean;
}

export default function FinancialSankeyFlow({ financialData, catalogData = [], hideValues = false }: SankeyFlowProps) {
    const [viewMode, setViewMode] = useState<'financial' | 'catalog'>('financial');
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const gross = financialData?.grossRevenue || 0;
    const netProfit = financialData?.netProfit || 0;
    const painterCost = financialData?.painterCost || 0;
    const productionCost = financialData?.productionCost || 0;
    const commissionCost = financialData?.commissionCost || 0;
    const freightCost = financialData?.freightCost || 0;

    const profitMargin = gross > 0 ? (netProfit / gross) * 100 : 0;

    const formatMoney = (val: number) => {
        if (hideValues) return "R$ ••••";
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // 1. Destinos Financeiros
    const financialDestinations = [
        {
            id: 'profit',
            label: 'Lucro Líquido Real',
            value: netProfit,
            color: '#10b981',
            icon: TrendingUp,
            desc: 'Margem limpa no caixa',
            badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        },
        {
            id: 'production',
            label: 'Insumos (Resina)',
            value: productionCost,
            color: '#06b6d4',
            icon: Droplet,
            desc: 'Resina e horas de máquina',
            badgeBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
        },
        {
            id: 'painter',
            label: 'Pintores Freelancer',
            value: painterCost,
            color: '#818cf8',
            icon: Paintbrush,
            desc: 'Mão de obra externa',
            badgeBg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
        },
        {
            id: 'commission',
            label: 'Comissões Vendas',
            value: commissionCost,
            color: '#f59e0b',
            icon: UserCheck,
            desc: 'Repasse comercial',
            badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-400'
        },
        {
            id: 'freight',
            label: 'Logística & Frete',
            value: freightCost,
            color: '#f43f5e',
            icon: Truck,
            desc: 'Envios e Correios',
            badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }
    ].filter(d => d.value > 0 || d.id === 'profit');

    const totalFinancialAllocated = financialDestinations.reduce((sum, d) => sum + d.value, 0) || gross || 1;

    // Cálculo das alturas e curvas proporcionais para Financeiro
    const svgHeight = 240;
    const sourceHeight = 180;
    const sourceTop = 30;
    let currentSourceY = sourceTop;

    const gap = 8;
    const targetUsableHeight = svgHeight - (financialDestinations.length * gap);
    let currentTargetY = 15;

    const financialCurves = financialDestinations.map((dest, idx) => {
        const prop = dest.value / totalFinancialAllocated;
        const sH = Math.max(6, prop * sourceHeight);
        const tH = Math.max(22, prop * (targetUsableHeight / 1.4));

        const y0_top = currentSourceY;
        const y0_bottom = currentSourceY + sH;
        currentSourceY += sH;

        const y1_top = currentTargetY;
        const y1_bottom = currentTargetY + tH;
        currentTargetY += tH + gap;

        const pathData = `
            M 0 ${y0_top}
            C 200 ${y0_top}, 250 ${y1_top}, 450 ${y1_top}
            L 450 ${y1_bottom}
            C 250 ${y1_bottom}, 200 ${y0_bottom}, 0 ${y0_bottom}
            Z
        `;

        return {
            ...dest,
            idx,
            percentage: gross > 0 ? (dest.value / gross) * 100 : 0,
            pathData
        };
    });

    // 2. Destinos Catálogo
    const topCatalogItems = catalogData.slice(0, 6);
    const totalCatalogValue = topCatalogItems.reduce((acc, item) => acc + item.value, 0) || 1;

    const studiosMap: { [key: string]: number } = {};
    const seriesMap: { [key: string]: number } = {};
    topCatalogItems.forEach(item => {
        studiosMap[item.studio] = (studiosMap[item.studio] || 0) + item.value;
        seriesMap[item.series] = (seriesMap[item.series] || 0) + item.value;
    });

    const studioColors = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4'];
    const studioList = Object.entries(studiosMap)
        .sort((a, b) => b[1] - a[1])
        .map(([name, val], i) => ({
            name,
            value: val,
            color: studioColors[i % studioColors.length]
        }));

    const seriesList = Object.entries(seriesMap)
        .sort((a, b) => b[1] - a[1])
        .map(([name, val], i) => ({
            name,
            value: val,
            color: studioColors[(i + 2) % studioColors.length]
        }));

    let catSY = 10;
    const catSPos: { [k: string]: { top: number; h: number } } = {};
    studioList.forEach(s => {
        const h = Math.max(20, (s.value / totalCatalogValue) * 160);
        catSPos[s.name] = { top: catSY, h };
        catSY += h + 6;
    });

    let catDY = 10;
    const catDPos: { [k: string]: { top: number; h: number } } = {};
    seriesList.forEach(s => {
        const h = Math.max(20, (s.value / totalCatalogValue) * 160);
        catDPos[s.name] = { top: catDY, h };
        catDY += h + 6;
    });

    const catalogCurves = topCatalogItems.map((item, idx) => {
        const s = catSPos[item.studio] || { top: 10, h: 20 };
        const d = catDPos[item.series] || { top: 10, h: 20 };
        const stObj = studioList.find(x => x.name === item.studio);
        const color = stObj?.color || '#3b82f6';

        const pathData = `
            M 0 ${s.top + 2}
            C 200 ${s.top + 2}, 250 ${d.top + 2}, 450 ${d.top + 2}
            L 450 ${d.top + d.h - 2}
            C 250 ${d.top + d.h - 2}, 200 ${s.top + s.h - 2}, 0 ${s.top + s.h - 2}
            Z
        `;

        return { ...item, idx, color, pathData };
    });

    return (
        <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 p-6 rounded-2xl relative group shadow-xl hover:border-zinc-700 transition-all mb-8 overflow-hidden">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-900 pb-4">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 mb-1">
                        <Sparkles size={12} className="text-amber-400" />
                        Fluxo Estratégico (Sankey)
                    </span>
                    <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                        {viewMode === 'financial' ? (
                            <>
                                <DollarSign size={20} className="text-emerald-400" />
                                Fluxo de Receita ➔ Lucro Real
                            </>
                        ) : (
                            <>
                                <Layers size={20} className="text-blue-400" />
                                Estúdios ➔ Franquias
                            </>
                        )}
                    </h2>
                </div>

                <div className="flex items-center gap-3">
                    {viewMode === 'financial' && (
                        <div className="text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-emerald-400" />
                            <span>Margem Líquida: <strong className="text-emerald-400 font-black">{profitMargin.toFixed(1)}%</strong></span>
                        </div>
                    )}

                    <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                        <button
                            onClick={() => { setViewMode('financial'); setHoveredIndex(null); }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                viewMode === 'financial'
                                    ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                                    : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                            Financeiro
                        </button>
                        <button
                            onClick={() => { setViewMode('catalog'); setHoveredIndex(null); }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                viewMode === 'catalog'
                                    ? 'bg-blue-500 text-white shadow-sm'
                                    : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                            Catálogo
                        </button>
                    </div>
                </div>
            </div>

            {/* ==================================================== */}
            {/* VISÃO 1: DRE FINANCEIRO (Layout Híbrido Sem Sobreposição) */}
            {/* ==================================================== */}
            {viewMode === 'financial' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    
                    {/* Nó de Origem (Esquerda: 3 cols) */}
                    <div className="lg:col-span-3 bg-zinc-900/80 border border-emerald-500/30 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between h-[230px]">
                        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500" />
                        <div>
                            <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400 block mb-1">
                                Origem da Receita
                            </span>
                            <h3 className="text-sm font-black text-white">Faturamento Total</h3>
                        </div>
                        <div className="my-auto">
                            <p className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                                {formatMoney(gross)}
                            </p>
                            <span className="text-[11px] text-zinc-500 font-bold">100% da Receita Bruta</span>
                        </div>
                        <div className="pt-2 border-t border-zinc-800/80 flex justify-between items-center text-[10px]">
                            <span className="text-zinc-400 font-medium">Margem Líquida</span>
                            <span className="text-emerald-400 font-black">{profitMargin.toFixed(1)}%</span>
                        </div>
                    </div>

                    {/* Conector Central SVG (Centro: 4 cols) */}
                    <div className="hidden lg:block lg:col-span-4 h-[230px] relative">
                        <svg viewBox="0 0 450 240" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                            <defs>
                                {financialCurves.map((flow) => (
                                    <linearGradient key={`fg-${flow.id}`} id={`fg-${flow.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={hoveredIndex === null || hoveredIndex === flow.idx ? "0.65" : "0.1"} />
                                        <stop offset="100%" stopColor={flow.color} stopOpacity={hoveredIndex === null || hoveredIndex === flow.idx ? "0.85" : "0.1"} />
                                    </linearGradient>
                                ))}
                            </defs>
                            {financialCurves.map((flow) => (
                                <path
                                    key={flow.id}
                                    d={flow.pathData}
                                    fill={`url(#fg-${flow.id})`}
                                    className="transition-all duration-200 cursor-pointer"
                                    onMouseEnter={() => setHoveredIndex(flow.idx)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                />
                            ))}
                        </svg>
                    </div>

                    {/* Nós de Destino (Direita: 5 cols) */}
                    <div className="lg:col-span-5 flex flex-col justify-between gap-2">
                        {financialCurves.map((flow) => {
                            const isHovered = hoveredIndex === flow.idx;
                            const isDimmed = hoveredIndex !== null && !isHovered;
                            const Icon = flow.icon;

                            return (
                                <div
                                    key={flow.id}
                                    onMouseEnter={() => setHoveredIndex(flow.idx)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    className={`p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-between cursor-pointer ${
                                        isHovered
                                            ? 'bg-zinc-900 border-zinc-600 shadow-lg'
                                            : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                                    } ${isDimmed ? 'opacity-35' : 'opacity-100'}`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: flow.color }} />
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-zinc-200 truncate">{flow.label}</p>
                                            <p className="text-[9px] text-zinc-500 truncate">{flow.desc}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <span className="text-xs font-mono font-black text-white block">
                                            {formatMoney(flow.value)}
                                        </span>
                                        <span className="text-[10px] font-black" style={{ color: flow.color }}>
                                            {flow.percentage.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                </div>
            )}

            {/* ==================================================== */}
            {/* VISÃO 2: FLUXO DE CATÁLOGO (Estúdios ➔ Franquias) */}
            {/* ==================================================== */}
            {viewMode === 'catalog' && (
                <div>
                    {catalogData.length === 0 ? (
                        <div className="text-center py-10 text-zinc-500 text-sm font-bold">
                            Nenhuma venda com vínculo de estúdio no período selecionado.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                            {/* Coluna Estúdios (4 cols) */}
                            <div className="lg:col-span-4 space-y-2">
                                {studioList.map((st) => (
                                    <div key={st.name} className="p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0 pr-2">
                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: st.color }} />
                                            <span className="text-xs font-bold text-zinc-200 truncate">{st.name}</span>
                                        </div>
                                        <span className="text-xs font-mono font-bold text-zinc-400 flex-shrink-0">{formatMoney(st.value)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Conector Central (4 cols) */}
                            <div className="hidden lg:block lg:col-span-4 h-[220px] relative">
                                <svg viewBox="0 0 450 240" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                                    <defs>
                                        {catalogCurves.map((flow) => (
                                            <linearGradient key={`cg-${flow.idx}`} id={`cg-${flow.idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor={flow.color} stopOpacity={hoveredIndex === null || hoveredIndex === flow.idx ? "0.65" : "0.1"} />
                                                <stop offset="100%" stopColor={flow.color} stopOpacity={hoveredIndex === null || hoveredIndex === flow.idx ? "0.75" : "0.1"} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    {catalogCurves.map((flow) => (
                                        <path
                                            key={`c-path-${flow.idx}`}
                                            d={flow.pathData}
                                            fill={`url(#cg-${flow.idx})`}
                                            className="transition-all duration-200 cursor-pointer"
                                            onMouseEnter={() => setHoveredIndex(flow.idx)}
                                            onMouseLeave={() => setHoveredIndex(null)}
                                        />
                                    ))}
                                </svg>
                            </div>

                            {/* Coluna Séries (4 cols) */}
                            <div className="lg:col-span-4 space-y-2">
                                {seriesList.map((se) => (
                                    <div key={se.name} className="p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0 pr-2">
                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: se.color }} />
                                            <span className="text-xs font-bold text-zinc-200 truncate">{se.name}</span>
                                        </div>
                                        <span className="text-xs font-mono font-black text-emerald-400 flex-shrink-0">{formatMoney(se.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
