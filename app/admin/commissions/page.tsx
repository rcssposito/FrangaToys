'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, DollarSign, Calendar, Paintbrush, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SellerCommission {
    vendedor: string;
    vendas_realizadas: number;
    valor_total_vendido: number;
    comissao_a_receber: number;
}

interface CommissionsData {
    vendedores: SellerCommission[];
    freelancer_total: number;
}

export default function CommissionsPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<CommissionsData | null>(null);

    // Default to current month "YYYY-MM"
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const generateMonthOptions = () => {
        const options = [];
        const today = new Date();
        for (let i = 0; i < 12; i++) {
            const date = subMonths(today, i);
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            let label = format(date, 'MMMM yyyy', { locale: ptBR });
            label = label.charAt(0).toUpperCase() + label.slice(1);
            options.push({ value, label });
        }
        return options;
    };

    const monthOptions = generateMonthOptions();

    useEffect(() => {
        fetchCommissions();
    }, [selectedMonth]);

    const fetchCommissions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/commissions?month=${selectedMonth}`);
            if (!res.ok) throw new Error('Falha ao carregar comissões');

            const json = await res.json();
            setData(json);
        } catch (err) {
            toast.error('Erro ao carregar relatório');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <DollarSign className="text-emerald-500" size={32} /> Relatório de Comissões
                        </h1>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex items-center px-4 py-2 gap-3 shadow-lg">
                        <Calendar size={18} className="text-zinc-500" />
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent text-sm font-semibold text-zinc-200 outline-none cursor-pointer"
                        >
                            <option value="">Todo o Período</option>
                            {monthOptions.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-zinc-900 text-zinc-200">
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                        <div className="lg:col-span-3">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
                                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
                                    <h2 className="text-xl font-bold">Resumo por Afiliado/Vendedor</h2>
                                </div>
                                {data?.vendedores.length === 0 ? (
                                    <div className="p-12 text-center text-zinc-500">
                                        <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
                                        Nenhuma venda registrada neste período.
                                    </div>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead className="bg-zinc-900/80 text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
                                            <tr>
                                                <th className="p-4 pl-6 font-semibold">Vendedor</th>
                                                <th className="p-4 text-center font-semibold">Vendas</th>
                                                <th className="p-4 text-right font-semibold">Volume Bruto</th>
                                                <th className="p-4 pr-6 text-right font-semibold text-emerald-500">Comissão (15%)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/60">
                                            {data?.vendedores.map((seller, idx) => (
                                                <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                                                    <td className="p-4 pl-6 text-zinc-300 font-medium">
                                                        {seller.vendedor || 'Sistema Automático'}
                                                    </td>
                                                    <td className="p-4 text-center font-mono">
                                                        <span className="bg-zinc-800/80 text-zinc-300 px-2.5 py-1 rounded text-xs">
                                                            {seller.vendas_realizadas}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right text-sm">
                                                        R$ {seller.valor_total_vendido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="p-4 pr-6 text-right">
                                                        <span className="text-emerald-400 font-bold font-mono">
                                                            R$ {seller.comissao_a_receber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-zinc-950/50 border-t border-zinc-700">
                                            <tr>
                                                <td className="p-4 pl-6 font-bold text-zinc-400 uppercase text-xs" colSpan={2}>Total de Comissões</td>
                                                <td className="p-4 text-right text-sm text-zinc-400 font-medium" colSpan={1}>
                                                    R$ {data?.vendedores.reduce((acc, curr) => acc + curr.valor_total_vendido, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="p-4 pr-6 text-right text-emerald-500 font-black">
                                                    R$ {data?.vendedores.reduce((acc, curr) => acc + curr.comissao_a_receber, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </div>
                        </div>

                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-gradient-to-br from-orange-950 to-orange-900 border border-orange-800 rounded-xl p-6 shadow-xl relative overflow-hidden group hover:border-orange-600 transition-colors">
                                <Paintbrush className="absolute -right-4 -bottom-4 text-orange-500 opacity-10" size={120} />
                                <div className="text-orange-400 text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2 relative z-10">
                                    <Paintbrush size={16} /> Custo Terceirizado
                                </div>
                                <div className="text-4xl font-black text-white relative z-10">
                                    <span className="text-lg text-orange-400 mr-1">R$</span>
                                    {data?.freelancer_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <p className="text-xs text-orange-300 mt-2 relative z-10 opacity-80">
                                    Gasto total com horas de pintura (Freelancer) no período selecionado.
                                </p>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
