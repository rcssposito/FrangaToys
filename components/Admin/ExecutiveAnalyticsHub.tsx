'use client';

import { useState } from 'react';
import { 
    DollarSign, 
    Sparkles, 
    TrendingUp, 
    ShieldCheck, 
    Target, 
    Star, 
    Zap, 
    Scale, 
    AlertTriangle 
} from 'lucide-react';
import { 
    ResponsiveContainer, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    Tooltip, 
    Cell, 
    ReferenceLine, 
    ScatterChart, 
    Scatter, 
    ZAxis, 
    CartesianGrid 
} from 'recharts';

interface AnalyticsHubProps {
    financialData?: {
        grossRevenue: number;
        netProfit: number;
        painterCost: number;
        productionCost: number;
        commissionCost: number;
        freightCost: number;
    };
    studioMatrix?: Array<{
        name: string;
        revenue: number;
        profit: number;
        margin: number;
        itemsSold: number;
    }>;
    hideValues?: boolean;
}

export default function ExecutiveAnalyticsHub({ financialData, studioMatrix = [], hideValues = false }: AnalyticsHubProps) {
    const [activeTab, setActiveTab] = useState<'waterfall' | 'bcg'>('waterfall');
    const [activeStudioName, setActiveStudioName] = useState<string | null>(null);

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

    // ==============================================================
    // 1. DADOS DA CASCATA DRE (WATERFALL)
    // ==============================================================
    const waterfallItems = [
        {
            name: 'Receita Bruta',
            base: 0,
            value: gross,
            displayValue: gross,
            type: 'pillar',
            color: '#10b981',
            percentage: 100,
            desc: '100% das Vendas Realizadas'
        },
        {
            name: 'Insumos (Resina)',
            base: Math.max(0, gross - productionCost),
            value: productionCost,
            displayValue: -productionCost,
            type: 'deduction',
            color: '#06b6d4',
            percentage: gross > 0 ? (productionCost / gross) * 100 : 0,
            desc: 'Resina, FEP, Álcool & Energia'
        },
        {
            name: 'Pintura Freelancer',
            base: Math.max(0, gross - productionCost - painterCost),
            value: painterCost,
            displayValue: -painterCost,
            type: 'deduction',
            color: '#818cf8',
            percentage: gross > 0 ? (painterCost / gross) * 100 : 0,
            desc: 'Mão de obra terceirizada'
        },
        {
            name: 'Comissões Vendas',
            base: Math.max(0, gross - productionCost - painterCost - commissionCost),
            value: commissionCost,
            displayValue: -commissionCost,
            type: 'deduction',
            color: '#f59e0b',
            percentage: gross > 0 ? (commissionCost / gross) * 100 : 0,
            desc: 'Repasse aos vendedores'
        },
        {
            name: 'Logística & Frete',
            base: Math.max(0, gross - productionCost - painterCost - commissionCost - freightCost),
            value: freightCost,
            displayValue: -freightCost,
            type: 'deduction',
            color: '#f43f5e',
            percentage: gross > 0 ? (freightCost / gross) * 100 : 0,
            desc: 'Envios e Correios'
        },
        {
            name: 'Lucro Líquido Real',
            base: 0,
            value: Math.max(0, netProfit),
            displayValue: netProfit,
            type: 'pillar',
            color: '#10b981',
            percentage: profitMargin,
            desc: 'Saldo Limpo no Caixa'
        }
    ].filter(item => item.value > 0 || item.type === 'pillar');

    // ==============================================================
    // 2. DADOS DA MATRIZ BCG DE ESTÚDIOS (SCATTER / CORRELAÇÃO)
    // ==============================================================
    const validStudios = studioMatrix.filter(s => s.revenue > 0);
    const avgStudioMargin = validStudios.length > 0 
        ? validStudios.reduce((acc, s) => acc + s.margin, 0) / validStudios.length 
        : 35;
    
    const revenues = validStudios.map(s => s.revenue).sort((a, b) => a - b);
    const medianStudioRevenue = revenues.length > 0
        ? revenues[Math.floor(revenues.length / 2)]
        : 200;

    // Classificação em Quadrantes Estratégicos
    const categorizedStudios = validStudios.map(s => {
        const isHighRevenue = s.revenue >= medianStudioRevenue;
        const isHighMargin = s.margin >= Math.max(0, avgStudioMargin);

        let quadrant: 'star' | 'opportunity' | 'cash_cow' | 'review';
        let quadrantLabel: string;
        let badgeColor: string;
        let recommendation: string;
        let icon: any;

        if (isHighRevenue && isHighMargin) {
            quadrant = 'star';
            quadrantLabel = 'Estrela (Alto Volume + Alta Margem)';
            badgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
            recommendation = 'Motor de lucro. Priorizar novos lançamentos e manter estoque de resina pronto.';
            icon = Star;
        } else if (!isHighRevenue && isHighMargin) {
            quadrant = 'opportunity';
            quadrantLabel = 'Oportunidade (Alta Margem)';
            badgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
            recommendation = 'Altamente rentável. Vale impulsionar marketing e fotos pintadas nas redes sociais.';
            icon = Zap;
        } else if (isHighRevenue && !isHighMargin) {
            quadrant = 'cash_cow';
            quadrantLabel = 'Volume (Margem Apertada)';
            badgeColor = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
            recommendation = 'Gera caixa rápido, mas consome muita resina. Otimizar suportes ou reajustar preço base.';
            icon = Scale;
        } else {
            quadrant = 'review';
            quadrantLabel = 'Revisar Precificação & Consumo';
            badgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
            recommendation = 'Baixo retorno ou margem negativa. O peso de resina está superando o preço cobrado.';
            icon = AlertTriangle;
        }

        return {
            ...s,
            quadrant,
            quadrantLabel,
            badgeColor,
            recommendation,
            icon,
            x: s.revenue,
            // Clamped margin para plotar sem quebrar a escala do gráfico caso seja outlier extremo
            y: Math.max(-100, Math.min(100, s.margin)),
            actualMargin: s.margin,
            z: Math.max(1, s.itemsSold)
        };
    });

    const focusedStudio = categorizedStudios.find(s => s.name === activeStudioName) || categorizedStudios[0] || null;

    return (
        <div className="bg-zinc-950 border border-zinc-800 p-6 md:p-8 rounded-2xl relative shadow-xl mb-10 w-full">
            
            {/* Header com Navegação Executiva */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 border-b border-zinc-800 pb-5">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400 flex items-center gap-1.5 mb-1.5">
                        <Sparkles size={13} className="text-amber-400" />
                        Business Intelligence & Correlação Estratégica
                    </span>
                    <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        {activeTab === 'waterfall' ? (
                            <>
                                <TrendingUp size={26} className="text-emerald-400" />
                                Cascata DRE: Decomposição do Faturamento ao Lucro
                            </>
                        ) : (
                            <>
                                <Target size={26} className="text-blue-400" />
                                Matriz de Eficiência BCG: Faturamento vs Margem Real
                            </>
                        )}
                    </h2>
                </div>

                <div className="flex items-center gap-3">
                    {/* Badge Margem */}
                    <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl">
                        <ShieldCheck size={16} className="text-emerald-400" />
                        <span>Margem Líquida: <strong className="text-emerald-400 font-black">{profitMargin.toFixed(1)}%</strong></span>
                    </div>

                    {/* Toggle Abas */}
                    <div className="flex items-center gap-1.5 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800">
                        <button
                            onClick={() => setActiveTab('waterfall')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
                                activeTab === 'waterfall'
                                    ? 'bg-emerald-500 text-zinc-950 shadow-md font-extrabold'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                            }`}
                        >
                            <DollarSign size={14} />
                            Cascata DRE
                        </button>
                        <button
                            onClick={() => setActiveTab('bcg')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
                                activeTab === 'bcg'
                                    ? 'bg-blue-600 text-white shadow-md font-extrabold'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                            }`}
                        >
                            <Target size={14} />
                            Matriz de Estúdios
                        </button>
                    </div>
                </div>
            </div>

            {/* ============================================================== */}
            {/* ABA 1: WATERFALL DRE (CASCATA FINANCEIRA EXECUTIVA) */}
            {/* ============================================================== */}
            {activeTab === 'waterfall' && (
                <div className="space-y-6">
                    {/* Gráfico de Cascata */}
                    <div className="h-[340px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={waterfallItems} maxBarSize={56} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="2 4" stroke="#27272a" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 700 }}
                                    axisLine={{ stroke: '#27272a' }}
                                    tickLine={false}
                                />
                                <YAxis 
                                    tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }}
                                    tickFormatter={(v) => `R$ ${(v || 0).toLocaleString('pt-BR')}`}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                    wrapperStyle={{ zIndex: 9999, pointerEvents: 'none' }}
                                    content={({ active, payload }) => {
                                        if (!active || !payload || !payload.length) return null;
                                        const data = payload[0].payload;
                                        const isPillar = data.type === 'pillar';
                                        return (
                                            <div className="bg-zinc-950 border border-zinc-700 p-4 rounded-xl shadow-2xl">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                                                    <h4 className="text-sm font-black text-white">{data.name}</h4>
                                                </div>
                                                <p className="text-xs text-zinc-400 mb-3">{data.desc}</p>
                                                
                                                <div className="flex justify-between items-baseline gap-6 pt-2 border-t border-zinc-800">
                                                    <span className="text-xs text-zinc-400">Impacto no Caixa:</span>
                                                    <span className="text-sm font-mono font-black" style={{ color: data.color }}>
                                                        {isPillar ? '' : '-'}{formatMoney(Math.abs(data.displayValue))}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-baseline gap-6 text-xs mt-1">
                                                    <span className="text-zinc-500">% do Faturamento:</span>
                                                    <span className="font-bold text-zinc-200">{data.percentage.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        );
                                    }}
                                />

                                {/* Barra Base Invisível */}
                                <Bar dataKey="base" stackId="waterfall" fill="transparent" />

                                {/* Barra do Valor Real */}
                                <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 4, 4]}>
                                    {waterfallItems.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.color} 
                                            className="transition-opacity hover:opacity-90"
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Cards de Síntese Executiva & Taxas de Eficiência */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-zinc-800">
                        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">
                                💰 Faturamento Bruto
                            </span>
                            <p className="text-xl font-black text-white font-mono">{formatMoney(gross)}</p>
                            <span className="text-[10px] text-emerald-400 font-bold mt-1">Base de 100% das Vendas</span>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">
                                🧪 Peso da Matéria-Prima
                            </span>
                            <p className="text-xl font-black text-cyan-400 font-mono">
                                {gross > 0 ? ((productionCost / gross) * 100).toFixed(1) : 0}%
                            </p>
                            <span className="text-[10px] text-zinc-500 font-medium mt-1">
                                {formatMoney(productionCost)} em resina e desgaste
                            </span>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">
                                🟢 Lucro Líquido Real
                            </span>
                            <p className="text-xl font-black text-emerald-400 font-mono">{formatMoney(netProfit)}</p>
                            <span className="text-[10px] text-emerald-400 font-bold mt-1">
                                {profitMargin.toFixed(1)}% de margem no bolso
                            </span>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">
                                🎯 Eficiência p/ Real
                            </span>
                            <p className="text-xl font-black text-amber-400 font-mono">
                                R$ {(profitMargin / 100).toFixed(2)}
                            </p>
                            <span className="text-[10px] text-zinc-500 font-medium mt-1">
                                Lucro limpo gerado por R$ 1,00 vendido
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* ABA 2: MATRIZ BCG DE ESTÚDIOS (FATURAMENTO VS MARGEM REAL) */}
            {/* ============================================================== */}
            {activeTab === 'bcg' && (
                <div className="space-y-6">
                    {categorizedStudios.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500 text-sm font-bold">
                            Nenhum dado de estúdio disponível para o período selecionado.
                        </div>
                    ) : (
                        <>
                            {/* Painel Inspetor Executivo Fixo (100% Nítido e com contraste sólido) */}
                            {focusedStudio && (
                                <div className="bg-zinc-900 border border-zinc-700 p-4 md:p-5 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-lg">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-11 h-11 rounded-xl bg-zinc-950 border border-zinc-700 flex items-center justify-center text-white shrink-0">
                                            {(() => {
                                                const Icon = focusedStudio.icon;
                                                return <Icon size={22} className={focusedStudio.badgeColor.split(' ')[0]} />;
                                            })()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <h3 className="text-base font-black text-white tracking-tight">{focusedStudio.name}</h3>
                                                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${focusedStudio.badgeColor}`}>
                                                    {focusedStudio.quadrantLabel}
                                                </span>
                                            </div>
                                            <p className="text-xs text-zinc-300 mt-1 font-medium">{focusedStudio.recommendation}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-5 self-start lg:self-center bg-zinc-950 px-5 py-2.5 rounded-xl border border-zinc-800 shrink-0">
                                        <div>
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase block">Faturamento</span>
                                            <span className="text-sm font-mono font-black text-white">{formatMoney(focusedStudio.revenue)}</span>
                                        </div>
                                        <div className="h-6 w-px bg-zinc-800" />
                                        <div>
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase block">Lucro Real</span>
                                            <span className={`text-sm font-mono font-black ${focusedStudio.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {focusedStudio.profit >= 0 ? `+${formatMoney(focusedStudio.profit)}` : formatMoney(focusedStudio.profit)}
                                            </span>
                                        </div>
                                        <div className="h-6 w-px bg-zinc-800" />
                                        <div>
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase block">Margem Líquida</span>
                                            <span className={`text-sm font-black ${focusedStudio.actualMargin >= 30 ? 'text-emerald-400' : focusedStudio.actualMargin >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                {focusedStudio.actualMargin.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="h-6 w-px bg-zinc-800" />
                                        <div>
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase block">Volume</span>
                                            <span className="text-sm font-bold text-zinc-200">{focusedStudio.itemsSold} un</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                
                                {/* Gráfico Scatter 2D (8 Colunas) */}
                                <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
                                            Posicionamento Estratégico do Portfólio
                                        </h3>
                                        <span className="text-[10px] font-mono text-zinc-400">
                                            Margem Média: <strong className="text-zinc-200">{avgStudioMargin.toFixed(1)}%</strong>
                                        </span>
                                    </div>

                                    <div className="h-[340px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                                                <CartesianGrid strokeDasharray="2 4" stroke="#27272a" />
                                                <XAxis 
                                                    type="number" 
                                                    dataKey="x" 
                                                    name="Faturamento" 
                                                    tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 700 }}
                                                    tickFormatter={(v) => `R$ ${v}`}
                                                    axisLine={{ stroke: '#27272a' }}
                                                />
                                                <YAxis 
                                                    type="number" 
                                                    dataKey="y" 
                                                    name="Margem de Lucro" 
                                                    tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 700 }}
                                                    tickFormatter={(v) => `${v}%`}
                                                    axisLine={{ stroke: '#27272a' }}
                                                    domain={[-100, 100]}
                                                />
                                                <ZAxis type="number" dataKey="z" range={[120, 500]} name="Peças Vendidas" />
                                                
                                                {/* Linha da Margem Média */}
                                                <ReferenceLine 
                                                    y={Math.max(-100, Math.min(100, avgStudioMargin))} 
                                                    stroke="#3b82f6" 
                                                    strokeDasharray="3 3" 
                                                    label={{ value: 'Margem Média', fill: '#60a5fa', fontSize: 10, position: 'right' }} 
                                                />
                                                {/* Linha do Faturamento Mediano */}
                                                <ReferenceLine 
                                                    x={medianStudioRevenue} 
                                                    stroke="#71717a" 
                                                    strokeDasharray="3 3" 
                                                    label={{ value: 'Faturamento Mediano', fill: '#9ca3af', fontSize: 10, position: 'top' }} 
                                                />
                                                <Tooltip
                                                    cursor={false}
                                                    wrapperStyle={{ zIndex: 99999, pointerEvents: 'none' }}
                                                    content={({ active, payload }) => {
                                                        if (!active || !payload || !payload.length) return null;
                                                        const s = payload[0].payload;
                                                        return (
                                                            <div className="bg-zinc-950 border-2 border-zinc-700 p-3.5 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.95)] min-w-[220px]">
                                                                <div className="flex items-center justify-between gap-3 mb-2">
                                                                    <h4 className="text-sm font-black text-white">{s.name}</h4>
                                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${s.badgeColor}`}>
                                                                        {s.actualMargin.toFixed(1)}%
                                                                    </span>
                                                                </div>
                                                                <div className="space-y-1 text-xs pt-2 border-t border-zinc-800">
                                                                    <div className="flex justify-between gap-4">
                                                                        <span className="text-zinc-400 font-medium">Faturamento:</span>
                                                                        <span className="font-mono font-bold text-white">{formatMoney(s.revenue)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between gap-4">
                                                                        <span className="text-zinc-400 font-medium">Lucro Líquido:</span>
                                                                        <span className={`font-mono font-bold ${s.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                            {s.profit >= 0 ? `+${formatMoney(s.profit)}` : formatMoney(s.profit)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between gap-4">
                                                                        <span className="text-zinc-400 font-medium">Peças Vendidas:</span>
                                                                        <span className="font-bold text-zinc-200">{s.itemsSold} un</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }}
                                                />

                                                <Scatter 
                                                    data={categorizedStudios} 
                                                    fill="#3b82f6" 
                                                    onClick={(e) => setActiveStudioName(e.name)}
                                                    onMouseEnter={(e) => setActiveStudioName(e.name)}
                                                    className="cursor-pointer"
                                                >
                                                    {categorizedStudios.map((entry, index) => {
                                                        const colors = {
                                                            star: '#f59e0b',       // Amber
                                                            opportunity: '#10b981', // Emerald
                                                            cash_cow: '#3b82f6',   // Blue
                                                            review: '#f43f5e'       // Rose
                                                        };
                                                        const isSelected = focusedStudio?.name === entry.name;
                                                        return (
                                                            <Cell 
                                                                key={`cell-${index}`} 
                                                                fill={colors[entry.quadrant]}
                                                                stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.4)'}
                                                                strokeWidth={isSelected ? 3 : 1}
                                                            />
                                                        );
                                                    })}
                                                </Scatter>
                                            </ScatterChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Ranking Estratégico por Quadrante (4 Colunas) */}
                                <div className="lg:col-span-4 space-y-3">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 mb-3 flex items-center justify-between">
                                        <span>Classificação do Portfólio</span>
                                        <span className="text-[10px] text-zinc-400 font-bold">{categorizedStudios.length} estúdios</span>
                                    </h3>

                                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                                        {categorizedStudios.map((st) => {
                                            const Icon = st.icon;
                                            const isSelected = focusedStudio?.name === st.name;
                                            return (
                                                <div 
                                                    key={st.name}
                                                    onClick={() => setActiveStudioName(st.name)}
                                                    onMouseEnter={() => setActiveStudioName(st.name)}
                                                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                                        isSelected 
                                                            ? 'bg-zinc-800 border-zinc-400 shadow-md ring-1 ring-zinc-400' 
                                                            : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                                        <span className="text-xs font-bold text-white truncate">{st.name}</span>
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border flex items-center gap-1 ${st.badgeColor}`}>
                                                            <Icon size={10} />
                                                            {st.actualMargin.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[11px] text-zinc-300">
                                                        <span>{formatMoney(st.revenue)}</span>
                                                        <span className={`font-mono font-bold ${st.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {st.profit >= 0 ? `+${formatMoney(st.profit)}` : formatMoney(st.profit)} limpo
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                            </div>
                        </>
                    )}
                </div>
            )}

        </div>
    );
}
