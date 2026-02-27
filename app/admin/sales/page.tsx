'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2, ArrowLeft, TrendingUp, Calendar, Trash2, Package, Paintbrush, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Sale {
    id: number;
    data_venda: string;
    cliente_nome: string;
    valor_venda_final: number;
    lucro_real: number;
    quantidade: number;
    vendedor?: string;
    comissao_vendedor?: number;
    pintura_freelancer?: boolean;
    observacao?: string;
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

    const getStudioName = (figura: Sale['figuras']) => {
        if (!figura?.studios) return '-';
        if (Array.isArray(figura.studios)) return figura.studios[0]?.nome || '-';
        // @ts-ignore
        return figura.studios.nome || '-';
    };

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-3xl font-bold">Registro de Vendas</h1>
                    </div>

                    <Link href="/admin/sales/new" className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                        <Plus size={20} /> Nova Venda
                    </Link>
                </div>

                {/* Lista Agrupada */}
                {loading ? (
                    <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-orange-500" /></div>
                ) : groups.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500 bg-zinc-900 rounded-xl border border-zinc-800">
                        Nenhuma venda registrada ainda.
                    </div>
                ) : (
                    <div className="space-y-8">
                        {groups.map((group) => (
                            <div key={group.label} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                                {/* Group Header */}
                                <div className="bg-zinc-950 px-6 py-4 flex justify-between items-center border-b border-zinc-800">
                                    <h2 className="text-xl font-bold text-orange-500 flex items-center gap-2">
                                        <Calendar size={20} />
                                        {group.label}
                                    </h2>
                                    <div className="flex gap-6 text-sm">
                                        <div>
                                            <span className="text-zinc-500 block text-xs uppercase">Vendas</span>
                                            <span className="font-bold text-white">R$ {group.totalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div>
                                            <span className="text-zinc-500 block text-xs uppercase">Lucro</span>
                                            <span className="font-bold text-green-500">R$ {group.totalLucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}
                                <table className="w-full text-left">
                                    <thead className="bg-zinc-900/50 text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
                                        <tr>
                                            <th className="p-4 pl-6">Data</th>
                                            <th className="p-4">Figura / Estúdio</th>
                                            <th className="p-4 text-center">Qtd</th>
                                            <th className="p-4">Cliente</th>
                                            <th className="p-4">Vendedor / Opcionais</th>
                                            <th className="p-4 text-right">Valor</th>
                                            <th className="p-4 text-right text-green-600">Lucro Líquido</th>
                                            <th className="p-4 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800 text-sm">
                                        {group.sales.map(sale => (
                                            <tr key={sale.id} className="hover:bg-zinc-800/50 transition-colors">
                                                <td className="p-4 pl-6 text-zinc-400 font-mono">
                                                    {new Date(sale.data_venda).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-medium text-white flex items-center gap-2">
                                                        {sale.figuras?.nome || 'Desconhecida'}
                                                        {sale.pintura_freelancer && (
                                                            <span title="Pintura Terceirizada (Freelancer)" className="bg-orange-500/20 text-orange-400 p-0.5 rounded border border-orange-500/30">
                                                                <Paintbrush size={12} />
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-zinc-500 uppercase tracking-wide mt-0.5">
                                                        {getStudioName(sale.figuras)}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {sale.quantidade > 1 ? (
                                                        <span className="bg-orange-500/10 text-orange-500 px-2 py-1 rounded text-xs font-bold ring-1 ring-orange-500/20">
                                                            {sale.quantidade}x
                                                        </span>
                                                    ) : (
                                                        <span className="text-zinc-600">1</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-zinc-300">
                                                    {sale.cliente_nome}
                                                    {sale.observacao && (
                                                        <div className="text-xs text-zinc-500 mt-0.5 italic max-w-[150px] truncate" title={sale.observacao}>
                                                            {sale.observacao}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    {sale.vendedor ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-semibold text-zinc-300 truncate max-w-[120px]" title={sale.vendedor.split('@')[0]}>
                                                                @{sale.vendedor.split('@')[0]}
                                                            </span>
                                                            {(sale.comissao_vendedor ?? 0) > 0 && (
                                                                <span className="text-[10px] text-fuchsia-400 font-mono mt-0.5 flex items-center gap-0.5">
                                                                    <DollarSign size={10} /> {(sale.comissao_vendedor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (15%)
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-zinc-600 italic">Loja Direta</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right font-medium">
                                                    R$ {sale.valor_venda_final.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="p-4 text-right text-green-500/80 font-mono text-xs" title="Já descontado resina, horas e comissões">
                                                    R$ {sale.lucro_real?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="p-4 pr-6">
                                                    <button
                                                        onClick={() => handleDelete(sale.id)}
                                                        className="p-2 hover:bg-red-500/10 text-zinc-600 hover:text-red-500 rounded transition-colors"
                                                        title="Excluir Venda"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
