'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2, ArrowLeft, TrendingUp, Calendar, Trash2, Package, Paintbrush, DollarSign, RotateCcw, Receipt, Edit3, X, Save } from 'lucide-react';
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
    observacao?: string;
    status?: string;
    canal_venda?: string;
    pintura_freelancer?: boolean;
    pintor_nome?: string;
    figuras: {
        nome: string;
        studios: { nome: string } | { nome: string }[];
    };
    link_pagamento?: string;
    checkout_id?: string;
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
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [vendedores, setVendedores] = useState<any[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const { hasRole } = usePermission();

    useEffect(() => {
        fetchSales();
        fetchVendedores();
    }, []);

    const fetchVendedores = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) setVendedores(await res.json());
        } catch (err) {
            console.error('Erro ao buscar vendedores');
        }
    };

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

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSale) return;

        setIsUpdating(true);
        try {
            const res = await fetch('/api/admin/sales', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingSale)
            });

            if (!res.ok) throw new Error('Erro ao atualizar');

            toast.success('Venda atualizada com sucesso!');
            setEditingSale(null);
            fetchSales();
        } catch (err) {
            toast.error('Erro ao salvar alterações');
        } finally {
            setIsUpdating(false);
        }
    };

    const getStudioName = (figura: Sale['figuras']) => {
        if (!figura?.studios) return '-';
        if (Array.isArray(figura.studios)) return figura.studios[0]?.nome || '-';
        // @ts-ignore
        return figura.studios.nome || '-';
    };

    return (
        <div className="min-h-screen bg-black text-zinc-200 p-4 md:p-8 relative overflow-x-hidden selection:bg-orange-500/30 selection:text-orange-200">
            {/* Sci-fi Background Blobs - Subdued */}
            <div className="fixed top-[0%] right-[0%] w-[40%] h-[40%] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[0%] left-[0%] w-[40%] h-[40%] bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10 transition-colors duration-300">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 mt-2">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-400 rounded-2xl transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] text-zinc-500 group">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </Link>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Vendas Históricas</h1>
                            <p className="text-zinc-500 text-sm font-medium mt-1 uppercase tracking-widest text-[10px]">Livro Caixa Tático de Receitas.</p>
                        </div>
                    </div>

                    <Link href="/admin/sales/new" className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3.5 rounded-2xl font-black flex items-center gap-2 transition-all shadow-sm active:scale-95 uppercase tracking-widest text-xs">
                        <Plus size={18} strokeWidth={3} /> LANÇAR NOVA VENDA
                    </Link>
                </div>

                {/* Lista Agrupada */}
                {loading ? (
                    <div className="p-24 flex justify-center"><Loader2 className="animate-spin text-cyan-500 w-12 h-12" /></div>
                ) : groups.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500 bg-zinc-950/60 backdrop-blur-2xl rounded-3xl border border-zinc-800/80 shadow-2xl font-black tracking-widest uppercase text-sm">
                        NENHUMA VENDA REGISTRADA AINDA.
                    </div>
                ) : (
                    <div className="space-y-8">
                        {groups.map((group) => (
                            <div key={group.label} className="bg-zinc-950/60 backdrop-blur-sm border border-zinc-800/80 rounded-2xl overflow-hidden shadow-lg relative">
                                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
                                {/* Group Header */}
                                <div className="bg-zinc-900/80 px-6 py-5 flex justify-between items-center border-b border-zinc-800/80">
                                    <h2 className="text-xl font-black text-cyan-400 flex items-center gap-3">
                                        <Calendar size={22} className="text-cyan-500/70" />
                                        {group.label}
                                    </h2>
                                    <div className="flex gap-8 text-sm">
                                        <div className="flex flex-col items-end">
                                            <span className="text-zinc-500 text-[10px] uppercase font-black tracking-[0.1em]">Total Vendas</span>
                                            <span className="font-black text-cyan-500 text-lg tracking-tighter">R$ {group.totalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        {(hasRole('admin') || hasRole('finance')) && (
                                            <div className="flex flex-col items-end border-l border-zinc-800/80 pl-8 relative">
                                                <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent"></div>
                                                <span className="text-zinc-500 text-[10px] uppercase font-black tracking-[0.1em]">Lucro Real</span>
                                                <span className="font-black text-emerald-400 text-lg tracking-tighter">R$ {group.totalLucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto">
                                    <table className="hidden md:table w-full min-w-full text-left whitespace-nowrap">
                                        <thead className="bg-zinc-950/80 border-b border-zinc-800/80">
                                            <tr className="text-zinc-500 text-[9px] uppercase font-bold tracking-widest">
                                                <th className="p-5 pl-6">Data</th>
                                                <th className="p-5 w-full">Figura / Estúdio</th>
                                                <th className="p-5 text-center">Qtd</th>
                                                <th className="p-5">Cliente</th>
                                                <th className="p-5">Vendedor / Opcionais</th>
                                                <th className="p-5 text-right">Valor</th>
                                                {hasRole('admin') || hasRole('finance') ? (
                                                    <>
                                                        <th className="p-5 text-right text-zinc-500" title="Custo de Resina e Tempo Máquina">Custo Base</th>
                                                        <th className="p-5 text-right text-emerald-400/80">Lucro Líquido</th>
                                                    </>
                                                ) : null}
                                                <th className="p-5 pr-6 w-10 text-right">AÇÕES</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/50 text-sm">
                                            {group.sales.map(sale => (
                                                <tr key={sale.id} className="hover:bg-zinc-900/50 transition-colors group">
                                                    <td className="p-5 pl-6 text-zinc-500 font-mono text-xs">
                                                        {new Date(sale.data_venda).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="p-5 w-full">
                                                        <div className="font-black text-zinc-200 flex items-center gap-2 text-base tracking-tight">
                                                            {sale.figuras?.nome || 'Desconhecida'}
                                                            {sale.pintura_freelancer && (
                                                                <span title="Pintura Terceirizada (Freelancer)" className="bg-orange-900/30 text-orange-400 p-1.5 rounded-md border border-orange-500/20">
                                                                    <Paintbrush size={12} strokeWidth={2.5} />
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-0.5">
                                                            {getStudioName(sale.figuras)}
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        {sale.quantidade > 1 ? (
                                                            <span className="bg-cyan-950/60 text-cyan-400 px-2.5 py-1 rounded-md text-[10px] font-black uppercase ring-1 ring-cyan-500/30 shadow-none">
                                                                {sale.quantidade}x
                                                            </span>
                                                        ) : (
                                                            <span className="text-zinc-600 font-bold">1</span>
                                                        )}
                                                    </td>
                                                    <td className="p-5 text-zinc-300 font-bold">
                                                        {sale.cliente_nome}
                                                        {sale.observacao && (
                                                            <div className="text-[10px] text-zinc-500 mt-0.5 font-medium max-w-[150px] truncate" title={sale.observacao}>
                                                                {sale.observacao}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-5">
                                                        {sale.vendedor ? (
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-zinc-300 truncate max-w-[120px]" title={sale.vendedor}>
                                                                    {sale.vendedor_nome || sale.vendedor?.split('@')[0] || 'Franguinha'}
                                                                </span>
                                                                {(sale.comissao_vendedor ?? 0) > 0 && (
                                                                    <span className="text-[10px] text-zinc-400 font-bold mt-0.5 flex items-center gap-0.5">
                                                                        <DollarSign size={10} /> {(sale.comissao_vendedor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-zinc-500 italic font-black uppercase tracking-widest">Loja Direta</span>
                                                        )}
                                                    </td>
                                                    <td className="p-5 text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-black text-zinc-100 text-base tracking-tighter">
                                                                R$ {sale.valor_venda_final.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </span>
                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider mt-1 ${sale.link_pagamento ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-500/30' : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'}`}>
                                                                {sale.link_pagamento ? 'Cartão' : 'PIX'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    {hasRole('admin') || hasRole('finance') ? (
                                                        <>
                                                            <td className="p-5 text-right text-zinc-500 font-mono text-xs opacity-70" title="Custo do material (Resina + Impressão)">
                                                                - R$ {(sale.custo_producao_snapshot || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </td>
                                                            <td className="p-5 text-right text-emerald-400 font-black text-sm" title="Já descontado material, extras e comissões">
                                                                R$ {sale.lucro_real?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </td>
                                                        </>
                                                    ) : null}
                                                    <td className="p-5 pr-6">
                                                        <div className="flex items-center justify-end gap-1.5 opacity-30 group-hover:opacity-100 transition-opacity">
                                                            {sale.status === 'Concluída' && (
                                                                <button
                                                                    onClick={() => handleSendToKanban(sale.id)}
                                                                    className="p-2.5 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-xl hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all shadow-sm"
                                                                    title="Reativar no Kanban (Fila de Impressão)"
                                                                >
                                                                    <RotateCcw size={16} />
                                                                </button>
                                                            )}
                                                            <Link
                                                                href={`/api/admin/kanban/os/${sale.id}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-2.5 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-xl hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all shadow-sm"
                                                                title="Gerar OS & Comprovante de Pagamento"
                                                            >
                                                                <Receipt size={16} />
                                                            </Link>
                                                            {hasRole('admin') && (
                                                                <>
                                                                    <button
                                                                        onClick={() => setEditingSale(sale)}
                                                                        className="p-2.5 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-xl hover:text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/10 transition-all shadow-sm"
                                                                        title="Editar Dados da Venda"
                                                                    >
                                                                        <Edit3 size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(sale.id)}
                                                                        className="p-2.5 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-xl hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 transition-all shadow-sm"
                                                                        title="Excluir Venda"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Cards (Visível apenas em telas pequenas) */}
                                <div className="md:hidden flex flex-col divide-y divide-zinc-800/80">
                                    {group.sales.map(sale => (
                                        <div key={`mobile-${sale.id}`} className="p-4 flex flex-col gap-3 hover:bg-zinc-900/50 transition-colors relative">
                                            {/* Header do Cartão: Modelo e Status Canto */}
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col flex-1 pr-2">
                                                    <div className="font-black text-zinc-200 text-sm flex gap-2 tracking-tight leading-tight">
                                                        <span>{sale.figuras?.nome || 'Desconhecida'}</span>
                                                        {sale.pintura_freelancer && (
                                                            <span title="Pintura Terceirizada (Freelancer)" className="text-orange-400 shrink-0">
                                                                <Paintbrush size={14} />
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-0.5">
                                                        {getStudioName(sale.figuras)}
                                                    </div>
                                                </div>
                                                {sale.quantidade > 1 && (
                                                    <span className="bg-cyan-950/60 text-cyan-400 px-2.5 py-1 rounded-md text-[10px] font-black uppercase ring-1 ring-cyan-500/30 shrink-0">
                                                        {sale.quantidade}x
                                                    </span>
                                                )}
                                            </div>

                                            {/* Detalhes de Cliente e Vendedor */}
                                            <div className="flex justify-between items-end gap-2 text-xs">
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-zinc-500 flex items-center gap-1.5">
                                                        <span className="font-bold">Em:</span> {new Date(sale.data_venda).toLocaleDateString('pt-BR')}
                                                    </div>
                                                    <div className="text-zinc-300 font-bold flex items-center gap-1.5">
                                                        <span className="font-bold text-zinc-500">Cli:</span> {sale.cliente_nome}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="text-zinc-300 font-bold flex items-center gap-1.5 truncate max-w-[150px]">
                                                            <span className="font-bold text-zinc-500">Ven:</span> {sale.vendedor ? (sale.vendedor_nome || sale.vendedor?.split('@')[0]) : 'Loja Direta'}
                                                        </div>
                                                        {sale.vendedor && (sale.comissao_vendedor ?? 0) > 0 && (
                                                            <span className="text-[10px] text-emerald-400/80 font-black mt-0.5 ml-6 flex items-center gap-0.5">
                                                                (+ R$ {(sale.comissao_vendedor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Preço e Lucro */}
                                                <div className="flex flex-col items-end justify-end text-right">
                                                    <div className="font-black text-zinc-100 text-base tracking-tighter">
                                                        R$ {sale.valor_venda_final.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${sale.link_pagamento ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-500/30' : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'}`}>
                                                            {sale.link_pagamento ? 'Cartão' : 'PIX'}
                                                        </span>
                                                        {(hasRole('admin') || hasRole('finance')) && (
                                                            <div className="text-emerald-400 font-black text-[11px]" title="Lucro Líquido">
                                                                L: R$ {sale.lucro_real?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Ações Mobile */}
                                            <div className="flex items-center justify-end gap-2 pt-3 mt-1 border-t border-zinc-800/80">
                                                {sale.status === 'Concluída' && (
                                                    <button onClick={() => handleSendToKanban(sale.id)} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-cyan-400 transition-colors shadow-sm">
                                                        <RotateCcw size={16} />
                                                    </button>
                                                )}
                                                <Link href={`/api/admin/kanban/os/${sale.id}`} target="_blank" className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-indigo-400 transition-colors shadow-sm" title="Gerar OS & Comprovante de Pagamento">
                                                    <Receipt size={16} />
                                                </Link>
                                                {hasRole('admin') && (
                                                    <>
                                                        <button onClick={() => setEditingSale(sale)} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-amber-400 transition-colors shadow-sm">
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button onClick={() => handleDelete(sale.id)} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-red-400 transition-colors shadow-sm">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de Edição */}
            {editingSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-zinc-950 border border-zinc-800/80 w-full max-w-lg rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                            <h2 className="text-xl font-black flex items-center gap-3 text-cyan-400">
                                <Edit3 size={24} className="opacity-80" />
                                Editar Venda #{editingSale.id}
                            </h2>
                            <button onClick={() => setEditingSale(null)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Cliente</label>
                                    <input
                                        type="text"
                                        value={editingSale.cliente_nome || ''}
                                        onChange={e => setEditingSale({ ...editingSale, cliente_nome: e.target.value })}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-cyan-500/50 outline-none transition-all font-bold text-zinc-200"
                                        placeholder="Nome do Cliente"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Vendedor</label>
                                    <select
                                        value={editingSale.vendedor || ''}
                                        onChange={e => setEditingSale({ ...editingSale, vendedor: e.target.value })}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-cyan-500/50 outline-none transition-all font-black text-zinc-200 appearance-none cursor-pointer"
                                    >
                                        <option value="">Loja Direta</option>
                                        {vendedores.map(v => (
                                            <option key={v.email} value={v.email} className="bg-zinc-900">{v.nome || v.email}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Status Logístico</label>
                                    <select
                                        value={editingSale.status || 'Aguardando Pagamento'}
                                        onChange={e => setEditingSale({ ...editingSale, status: e.target.value })}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-cyan-500/50 outline-none transition-all font-black text-zinc-200 appearance-none cursor-pointer"
                                    >
                                        <option value="Aguardando Pagamento" className="bg-zinc-900">Aguardando Pagamento (PDV)</option>
                                        <option value="Fila de Impressão" className="bg-zinc-900">Fila de Impressão</option>
                                        <option value="Imprimindo" className="bg-zinc-900">Imprimindo</option>
                                        <option value="Lavagem e Cura" className="bg-zinc-900">Cura e Limpeza</option>
                                        <option value="Pintura Secagem" className="bg-zinc-900">Pintura</option>
                                        <option value="Pronto p/ Entrega" className="bg-zinc-900">Pronto p/ Entrega</option>
                                        <option value="Concluída" className="bg-zinc-900">Pedido Concluído</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Canal</label>
                                    <input
                                        type="text"
                                        value={editingSale.canal_venda || ''}
                                        onChange={e => setEditingSale({ ...editingSale, canal_venda: e.target.value })}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-cyan-500/50 outline-none transition-all font-bold text-zinc-200"
                                        placeholder="Ex: WhatsApp, Instagram"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-zinc-900/50 rounded-2xl border border-zinc-800 relative">
                                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-orange-500 rounded-l-2xl opacity-50"></div>
                                <div className="flex items-center gap-3 h-full cursor-pointer" onClick={() => setEditingSale({ ...editingSale, pintura_freelancer: !editingSale.pintura_freelancer })}>
                                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${editingSale.pintura_freelancer ? 'bg-orange-500 border-orange-500 text-black' : 'bg-zinc-950 border-zinc-700'}`}>
                                        {editingSale.pintura_freelancer && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                    </div>
                                    <label className="text-sm font-black text-zinc-200 cursor-pointer flex items-center gap-2 pointer-events-none">
                                        <Paintbrush size={16} className={editingSale.pintura_freelancer ? 'text-orange-400' : 'text-zinc-600'} />
                                        Pintura Freelancer
                                    </label>
                                </div>
                                {editingSale.pintura_freelancer && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Pintor Responsável</label>
                                        <select
                                            value={editingSale.pintor_nome || ''}
                                            onChange={e => setEditingSale({ ...editingSale, pintor_nome: e.target.value })}
                                            className="w-full bg-zinc-950 border border-orange-500/30 rounded-xl px-4 py-3 text-sm outline-none transition-all font-black appearance-none cursor-pointer text-orange-200"
                                        >
                                            <option value="" className="bg-zinc-900">Selecione um Pintor</option>
                                            {vendedores
                                                .filter(v =>
                                                    (v.roles && v.roles.includes('painter')) ||
                                                    v.nome === editingSale.pintor_nome ||
                                                    v.email === editingSale.pintor_nome
                                                )
                                                .map(v => (
                                                    <option key={v.email} value={v.nome || v.email} className="bg-zinc-900">{v.nome || v.email}</option>
                                                ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Observações</label>
                                <textarea
                                    value={editingSale.observacao || ''}
                                    onChange={e => setEditingSale({ ...editingSale, observacao: e.target.value })}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-cyan-500/50 outline-none transition-all font-medium min-h-[100px] resize-none text-zinc-200"
                                    placeholder="Observações internas..."
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingSale(null)}
                                    className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 font-black py-4 rounded-2xl transition-all active:scale-[0.98] uppercase text-xs"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="flex-[2] bg-cyan-600 hover:bg-cyan-500 text-black font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 uppercase text-xs"
                                >
                                    {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    SALVAR ALTERAÇÕES
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
