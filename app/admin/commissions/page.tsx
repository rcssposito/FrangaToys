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
    painters: { nome: string; valor: number }[];
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
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-8 transition-colors duration-300">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2 bg-[var(--card-bg)] border border-[var(--card-border)] hover:bg-[var(--input-bg)] rounded-xl transition-all shadow-sm text-[var(--text-muted)] hover:text-orange-500">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <DollarSign className="text-orange-500" size={32} /> Relatório de Comissões
                        </h1>
                    </div>

                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl flex items-center px-4 py-2 gap-3 shadow-[var(--shadow-md)]">
                        <Calendar size={18} className="text-[var(--text-muted)]" />
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent text-sm font-black text-[var(--foreground)] outline-none cursor-pointer p-2 rounded-lg hover:bg-[var(--input-bg)] transition-colors"
                        >
                            <option value="">Todo o Período</option>
                            {monthOptions.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-[var(--card-bg)] text-[var(--foreground)]">
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                        <div className="lg:col-span-3">
                            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden shadow-[var(--shadow-md)]">
                                <div className="p-6 border-b border-[var(--card-border)] flex justify-between items-center bg-[var(--background)]/30 backdrop-blur-sm">
                                    <h2 className="text-xl font-black tracking-tight">Resumo por Afiliado/Vendedor</h2>
                                </div>
                                {data?.vendedores.length === 0 ? (
                                    <div className="p-16 text-center text-[var(--text-muted)]">
                                        <TrendingUp size={64} className="mx-auto mb-6 opacity-10" />
                                        <p className="font-bold text-lg">Nenhuma venda registrada neste período.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-[var(--background)]/30 text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-widest border-b border-[var(--card-border)]">
                                                <tr>
                                                    <th className="p-5 pl-8">Vendedor</th>
                                                    <th className="p-5 text-center">Vendas</th>
                                                    <th className="p-5 text-right">Volume Bruto</th>
                                                    <th className="p-5 pr-8 text-right text-orange-500">Comissão (15%)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--card-border)]">
                                                {data?.vendedores.map((seller, idx) => (
                                                    <tr key={idx} className="hover:bg-orange-500/[0.02] transition-colors group">
                                                        <td className="p-5 pl-8 text-[var(--foreground)] font-black text-lg tracking-tight">
                                                            {seller.vendedor || 'Sistema Automático'}
                                                        </td>
                                                        <td className="p-5 text-center">
                                                            <span className="bg-[var(--input-bg)] text-[var(--foreground)] px-3 py-1.5 rounded-lg border border-[var(--card-border)] text-xs font-black shadow-inner">
                                                                {seller.vendas_realizadas}
                                                            </span>
                                                        </td>
                                                        <td className="p-5 text-right text-[var(--text-muted)] font-mono text-sm">
                                                            R$ {seller.valor_total_vendido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="p-5 pr-8 text-right">
                                                            <span className="text-orange-500 font-black text-lg tracking-tighter">
                                                                R$ {seller.comissao_a_receber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-[var(--background)]/50 border-t-2 border-[var(--card-border)]">
                                                <tr>
                                                    <td className="p-6 pl-8 font-black text-[var(--text-muted)] uppercase text-[10px] tracking-widest" colSpan={2}>Total de Comissões</td>
                                                    <td className="p-6 text-right text-sm text-[var(--text-muted)] font-mono" colSpan={1}>
                                                        R$ {data?.vendedores.reduce((acc, curr) => acc + curr.valor_total_vendido, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="p-6 pr-8 text-right text-orange-500 font-black text-xl tracking-tighter">
                                                        R$ {data?.vendedores.reduce((acc, curr) => acc + curr.comissao_a_receber, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-2xl p-8 shadow-[var(--shadow-md)] relative overflow-hidden group hover:border-orange-500/40 transition-all duration-300">
                                <Paintbrush className="absolute -right-6 -bottom-6 text-orange-500 opacity-5 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500" size={140} />
                                <div className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 relative z-10 opacity-80">
                                    <Paintbrush size={16} /> Custo Terceirizado
                                </div>
                                <div className="text-5xl font-black text-[var(--foreground)] relative z-10 tracking-tighter leading-tight">
                                    <span className="text-lg text-orange-500 mr-2 font-bold tracking-normal">R$</span>
                                    {data?.freelancer_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-4 relative z-10 font-medium leading-relaxed mb-6">
                                    Gasto total com horas de pintura (Freelancer) no período selecionado.
                                </p>

                                {data?.painters?.length > 0 && (
                                    <div className="relative z-10 space-y-3 pt-6 border-t border-orange-500/10">
                                        <p className="text-[10px] font-bold text-orange-500/60 uppercase tracking-widest">A pagar por profissional:</p>
                                        <div className="space-y-2">
                                            {data?.painters?.map((p, i) => (
                                                <div key={i} className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                                                    <span className="text-xs font-bold text-[var(--text-muted)] truncate mr-2">{p.nome}</span>
                                                    <span className="text-sm font-black text-orange-400 whitespace-nowrap">R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
