'use client';

import Link from 'next/link';
import { 
    DollarSign, 
    Sparkles, 
    TrendingUp, 
    ShieldCheck, 
    Target,
    ArrowRight
} from 'lucide-react';
import { 
    ResponsiveContainer, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    Tooltip, 
    Cell, 
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
    hideValues?: boolean;
}

export default function ExecutiveAnalyticsHub({ financialData, hideValues = false }: AnalyticsHubProps) {
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
    // DADOS DA CASCATA DRE (WATERFALL)
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

    return (
        <div className="bg-zinc-950 border border-zinc-800 p-6 md:p-8 rounded-2xl relative shadow-xl mb-10 w-full">
            
            {/* Header com Navegação e Link para BI de Estúdios */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 border-b border-zinc-800 pb-5">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400 flex items-center gap-1.5 mb-1.5">
                        <Sparkles size={13} className="text-amber-400" />
                        Demonstrativo de Resultado do Exercício
                    </span>
                    <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        <TrendingUp size={26} className="text-emerald-400" />
                        Cascata DRE: Decomposição do Faturamento ao Lucro
                    </h2>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Badge Margem */}
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl">
                        <ShieldCheck size={16} className="text-emerald-400" />
                        <span>Margem Líquida: <strong className="text-emerald-400 font-black">{profitMargin.toFixed(1)}%</strong></span>
                    </div>

                    {/* Botão de Redirecionamento para a tela dedicada de BI de Estúdios */}
                    <Link
                        href="/admin/studios?tab=bi"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 border border-blue-500/30 transition-all shadow-sm group"
                        title="Ir para o BI de Estúdios, Break-even e Matriz BCG"
                    >
                        <Target size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
                        <span>BI de Estúdios & Break-Even</span>
                        <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                </div>
            </div>

            {/* Gráfico de Cascata DRE */}
            <div className="space-y-6">
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

        </div>
    );
}
