'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2, ArrowLeft, TrendingUp, Calendar, Trash2, Package, Paintbrush, DollarSign, RotateCcw, Receipt } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/hooks/usePermission';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Sale {
    id: number;
    data_venda: string;
    cliente_nome: string;
    valor_venda_final: number;
    lucro_real: number;
    custo_producao_snapshot?: number;
    quantidade: number;
    vendedor?: string;
    vendedor_nome?: string;
    comissao_vendedor?: number;
    pintura_freelancer?: boolean;
    observacao?: string;
    status?: string;
    figuras: {
        nome: string;
        studios: { nome: string } | { nome: string }[];
    };
}

interface MonthGroup {
    label: string;
    totalVenda: number;
    totalLucro: number;
    sales: Sale[];
}

export default function SalesPage() {
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState<MonthGroup[]>([]);
    const { hasRole } = usePermission();

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            const res = await fetch('/api/admin/sales');
            const data: Sale[] = await res.json();

            if (res.ok) {
                processGroups(data);
            }
        } catch (err) {
            toast.error('Erro ao carregar vendas');
        } finally {
            setLoading(false);
        }
    };

    const processGroups = (data: Sale[]) => {
        const grouped: { [key: string]: MonthGroup } = {};
        const order: string[] = [];

        data.forEach(sale => {
            const date = new Date(sale.data_venda);
            // Label ex: "Dezembro 2025"
            // Capitalize first letter
            let label = format(date, 'MMMM yyyy', { locale: ptBR });
            label = label.charAt(0).toUpperCase() + label.slice(1);

            if (!grouped[label]) {
                grouped[label] = {
                    label,
                    totalVenda: 0,
                    totalLucro: 0,
                    sales: []
                };
                order.push(label);
            }

            grouped[label].sales.push(sale);
            grouped[label].totalVenda += sale.valor_venda_final;
            grouped[label].totalLucro += sale.lucro_real;
        });

        const result = order.map(key => grouped[key]);
        setGroups(result);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir este registro de venda?')) return;

        try {
            const res = await fetch('/api/admin/sales', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });

            if (!res.ok) throw new Error('Erro ao excluir');

            toast.success('Venda removida');
            // Refresh list
            fetchSales();
        } catch (err) {
            toast.error('Erro ao excluir venda');
        }
    };

    const handleSendToKanban = async (id: number) => {
        if (!confirm('Deseja reenviar esta venda para a Fila de Impressão do Kanban?')) return;

        try {
            const res = await fetch('/api/admin/kanban', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: 'Fila de Impressão' })
            });

            if (!res.ok) throw new Error('Erro ao atualizar status');

            toast.success('Enviado para o Kanban!');
            fetchSales();
        } catch (err) {
            toast.error('Erro ao reenviar para o Kanban');
        }
    };

    const getStudioName = (figura: Sale['figuras']) => {
        if (!figura?.studios) return '-';
        if (Array.isArray(figura.studios)) return figura.studios[0]?.nome || '-';
        // @ts-ignore
        return figura.studios.nome || '-';
    };

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8 transition-colors duration-300">
            <div className="w-full mx-auto">

                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2 bg-[var(--card-bg)] border border-[var(--card-border)] hover:bg-[var(--input-bg)] rounded-xl transition-all shadow-sm text-[var(--text-muted)] hover:text-orange-500">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-3xl font-black tracking-tight">Registro de Vendas</h1>
                    </div>

                    <Link href="/admin/sales/new" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20 active:scale-95">
                        <Plus size={20} /> Nova Venda
                    </Link>
                </div>

                {/* Lista Agrupada */}
                {loading ? (
                    <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-orange-500" /></div>
                ) : groups.length === 0 ? (
                    <div className="p-12 text-center text-[var(--text-muted)] bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-sm font-medium">
                        Nenhuma venda registrada ainda.
                    </div>
                ) : (
                    <div className="space-y-8">
                        {groups.map((group) => (
                            <div key={group.label} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden shadow-[var(--shadow-md)]">
                                {/* Group Header */}
                                <div className="bg-[var(--background)]/50 px-6 py-5 flex justify-between items-center border-b border-[var(--card-border)]">
                                    <h2 className="text-xl font-black text-orange-500 flex items-center gap-3">
                                        <Calendar size={22} className="text-orange-500/70" />
                                        {group.label}
                                    </h2>
                                    <div className="flex gap-8 text-sm">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[var(--text-muted)] text-[10px] uppercase font-black tracking-[0.1em]">Total Vendas</span>
                                            <span className="font-black text-[var(--foreground)] text-lg tracking-tighter">R$ {group.totalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        {(hasRole('admin') || hasRole('finance')) && (
                                            <div className="flex flex-col items-end border-l border-[var(--card-border)] pl-8">
                                                <span className="text-[var(--text-muted)] text-[10px] uppercase font-black tracking-[0.1em]">Lucro Real</span>
                                                <span className="font-black text-[var(--accent-emerald)] text-lg tracking-tighter">R$ {group.totalLucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-full text-left whitespace-nowrap">
                                        <thead className="bg-[var(--background)]/30 text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-widest border-b border-[var(--card-border)]">
                                            <tr>
                                                <th className="p-4 pl-6">Data</th>
                                                <th className="p-4 w-full">Figura / Estúdio</th>
                                                <th className="p-4 text-center">Qtd</th>
                                                <th className="p-4">Cliente</th>
                                                <th className="p-4">Vendedor / Opcionais</th>
                                                <th className="p-4 text-right">Valor</th>
                                                {hasRole('admin') || hasRole('finance') ? (
                                                    <>
                                                        <th className="p-4 text-right text-[var(--text-muted)]/80" title="Custo de Resina e Tempo Máquina">Custo Base</th>
                                                        <th className="p-4 text-right text-[var(--accent-emerald)]">Lucro Líquido</th>
                                                    </>
                                                ) : null}
                                                <th className="p-4 pr-6 w-10 text-right">AÇÕES</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--card-border)] text-sm">
                                            {group.sales.map(sale => (
                                                <tr key={sale.id} className="hover:bg-orange-500/[0.02] transition-colors group">
                                                    <td className="p-4 pl-6 text-[var(--text-muted)] font-mono text-xs">
                                                        {new Date(sale.data_venda).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="p-4 w-full">
                                                        <div className="font-black text-[var(--foreground)] flex items-center gap-2 text-base tracking-tight">
                                                            {sale.figuras?.nome || 'Desconhecida'}
                                                            {sale.pintura_freelancer && (
                                                                <span title="Pintura Terceirizada (Freelancer)" className="bg-orange-500/10 text-orange-500 p-1 rounded-md border border-orange-500/20">
                                                                    <Paintbrush size={12} />
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest mt-0.5">
                                                            {getStudioName(sale.figuras)}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {sale.quantidade > 1 ? (
                                                            <span className="bg-orange-500/10 text-orange-500 px-2 py-1 rounded-md text-[10px] font-black uppercase ring-1 ring-orange-500/20">
                                                                {sale.quantidade}x
                                                            </span>
                                                        ) : (
                                                            <span className="text-[var(--text-muted)]/50 font-bold">1</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-[var(--foreground)] font-medium">
                                                        {sale.cliente_nome}
                                                        {sale.observacao && (
                                                            <div className="text-[10px] text-[var(--text-muted)] mt-0.5 italic max-w-[150px] truncate font-medium" title={sale.observacao}>
                                                                {sale.observacao}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        {sale.vendedor ? (
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-[var(--foreground)] truncate max-w-[120px]" title={sale.vendedor}>
                                                                    {sale.vendedor_nome || sale.vendedor?.split('@')[0] || 'Franguinha'}
                                                                </span>
                                                                {(sale.comissao_vendedor ?? 0) > 0 && (
                                                                    <span className="text-[10px] text-[var(--accent-fuchsia)] font-black mt-0.5 flex items-center gap-0.5">
                                                                        <DollarSign size={10} /> {(sale.comissao_vendedor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (15%)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-[var(--text-muted)] italic font-bold uppercase tracking-widest">Loja Direta</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right font-black text-[var(--foreground)] text-base tracking-tighter">
                                                        R$ {sale.valor_venda_final.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    {hasRole('admin') || hasRole('finance') ? (
                                                        <>
                                                            <td className="p-4 text-right text-[var(--text-muted)] font-mono text-xs" title="Custo do material (Resina + Impressão)">
                                                                - R$ {(sale.custo_producao_snapshot || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </td>
                                                            <td className="p-4 text-right text-[var(--accent-emerald)] font-black text-xs" title="Já descontado material, extras e comissões">
                                                                R$ {sale.lucro_real?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </td>
                                                        </>
                                                    ) : null}
                                                    <td className="p-4 pr-6">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {sale.status === 'Concluída' && (
                                                                <button
                                                                    onClick={() => handleSendToKanban(sale.id)}
                                                                    className="p-2.5 bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--card-border)] rounded-lg hover:text-orange-500 hover:border-orange-500/30 transition-all shadow-sm"
                                                                    title="Reativar no Kanban (Fila de Impressão)"
                                                                >
                                                                    <RotateCcw size={16} />
                                                                </button>
                                                            )}
                                                            <Link
                                                                href={`/api/admin/receipt/${sale.id}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-2.5 bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--card-border)] rounded-lg hover:text-blue-500 hover:border-blue-500/30 transition-all shadow-sm"
                                                                title="Gerar Recibo de Venda"
                                                            >
                                                                <Receipt size={16} />
                                                            </Link>
                                                            {hasRole('admin') && (
                                                                <button
                                                                    onClick={() => handleDelete(sale.id)}
                                                                    className="p-2.5 bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--card-border)] rounded-lg hover:text-red-500 hover:border-red-500/30 transition-all shadow-sm"
                                                                    title="Excluir Venda"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
