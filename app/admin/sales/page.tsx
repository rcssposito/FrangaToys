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
                                    <table className="hidden md:table w-full min-w-full text-left whitespace-nowrap">
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
                                                                href={`/api/admin/kanban/os/${sale.id}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-2.5 bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--card-border)] rounded-lg hover:text-blue-500 hover:border-blue-500/30 transition-all shadow-sm"
                                                                title="Gerar OS & Comprovante de Pagamento"
                                                            >
                                                                <Receipt size={16} />
                                                            </Link>
                                                            {hasRole('admin') && (
                                                                <>
                                                                    <button
                                                                        onClick={() => setEditingSale(sale)}
                                                                        className="p-2.5 bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--card-border)] rounded-lg hover:text-orange-500 hover:border-orange-500/30 transition-all shadow-sm"
                                                                        title="Editar Dados da Venda"
                                                                    >
                                                                        <Edit3 size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(sale.id)}
                                                                        className="p-2.5 bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--card-border)] rounded-lg hover:text-red-500 hover:border-red-500/30 transition-all shadow-sm"
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
                                <div className="md:hidden flex flex-col divide-y divide-[var(--card-border)]">
                                    {group.sales.map(sale => (
                                        <div key={`mobile-${sale.id}`} className="p-4 flex flex-col gap-3 hover:bg-[var(--input-bg)] transition-colors relative">
                                            {/* Header do Cartão: Modelo e Status Canto */}
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col flex-1 pr-2">
                                                    <div className="font-black text-[var(--foreground)] text-sm flex gap-2 tracking-tight leading-tight">
                                                        <span>{sale.figuras?.nome || 'Desconhecida'}</span>
                                                        {sale.pintura_freelancer && (
                                                            <span title="Pintura Terceirizada (Freelancer)" className="text-orange-500 shrinks-0">
                                                                <Paintbrush size={14} />
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest mt-0.5">
                                                        {getStudioName(sale.figuras)}
                                                    </div>
                                                </div>
                                                {sale.quantidade > 1 && (
                                                    <span className="bg-orange-500/10 text-orange-500 px-2 py-1 rounded-md text-[10px] font-black uppercase ring-1 ring-orange-500/20 shrink-0">
                                                        {sale.quantidade}x
                                                    </span>
                                                )}
                                            </div>

                                            {/* Detalhes de Cliente e Vendedor */}
                                            <div className="flex justify-between items-end gap-2 text-xs">
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-[var(--text-muted)] flex items-center gap-1.5">
                                                        <span className="font-bold">Em:</span> {new Date(sale.data_venda).toLocaleDateString('pt-BR')}
                                                    </div>
                                                    <div className="text-[var(--foreground)] font-medium flex items-center gap-1.5">
                                                        <span className="font-bold text-[var(--text-muted)]">Cli:</span> {sale.cliente_nome}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="text-[var(--foreground)] font-medium flex items-center gap-1.5 truncate max-w-[150px]">
                                                            <span className="font-bold text-[var(--text-muted)]">Ven:</span> {sale.vendedor ? (sale.vendedor_nome || sale.vendedor?.split('@')[0]) : 'Loja Direta'}
                                                        </div>
                                                        {sale.vendedor && (sale.comissao_vendedor ?? 0) > 0 && (
                                                            <span className="text-[10px] text-[var(--accent-fuchsia)] font-black mt-0.5 ml-6 flex items-center gap-0.5">
                                                                (+ R$ {(sale.comissao_vendedor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Preço e Lucro */}
                                                <div className="flex flex-col items-end justify-end text-right">
                                                    <div className="font-black text-[var(--foreground)] text-base tracking-tighter">
                                                        R$ {sale.valor_venda_final.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </div>
                                                    {(hasRole('admin') || hasRole('finance')) && (
                                                        <div className="text-[var(--accent-emerald)] font-black text-[11px] mt-0.5" title="Lucro Líquido">
                                                            L: R$ {sale.lucro_real?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Ações Mobile */}
                                            <div className="flex items-center justify-end gap-2 pt-3 mt-1 border-t border-[var(--card-border)]/50">
                                                {sale.status === 'Concluída' && (
                                                    <button onClick={() => handleSendToKanban(sale.id)} className="p-2 bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--card-border)] rounded-lg hover:text-orange-500 shadow-sm">
                                                        <RotateCcw size={16} />
                                                    </button>
                                                )}
                                                <Link href={`/api/admin/kanban/os/${sale.id}`} target="_blank" className="p-2 bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--card-border)] rounded-lg hover:text-blue-500 shadow-sm" title="Gerar OS & Comprovante de Pagamento">
                                                    <Receipt size={16} />
                                                </Link>
                                                {hasRole('admin') && (
                                                    <>
                                                        <button onClick={() => setEditingSale(sale)} className="p-2 bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--card-border)] rounded-lg hover:text-orange-500 shadow-sm">
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button onClick={() => handleDelete(sale.id)} className="p-2 bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--card-border)] rounded-lg hover:text-red-500 shadow-sm">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[var(--card-border)] flex justify-between items-center bg-[var(--background)]/50">
                            <h2 className="text-xl font-black flex items-center gap-3 italic">
                                <Edit3 size={24} className="text-orange-500" />
                                Editar Venda #{editingSale.id}
                            </h2>
                            <button onClick={() => setEditingSale(null)} className="p-2 hover:bg-[var(--input-bg)] rounded-xl transition-colors text-[var(--text-muted)]">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest ml-1">Cliente</label>
                                    <input
                                        type="text"
                                        value={editingSale.cliente_nome || ''}
                                        onChange={e => setEditingSale({ ...editingSale, cliente_nome: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-sm focus:border-orange-500/50 outline-none transition-all font-bold"
                                        placeholder="Nome do Cliente"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest ml-1">Vendedor</label>
                                    <select
                                        value={editingSale.vendedor || ''}
                                        onChange={e => setEditingSale({ ...editingSale, vendedor: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-sm focus:border-orange-500/50 outline-none transition-all font-black appearance-none cursor-pointer"
                                    >
                                        <option value="">Loja Direta</option>
                                        {vendedores.map(v => (
                                            <option key={v.email} value={v.email}>{v.nome || v.email}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest ml-1">Status Logístico</label>
                                    <select
                                        value={editingSale.status || 'Aguardando Pagamento'}
                                        onChange={e => setEditingSale({ ...editingSale, status: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-sm focus:border-orange-500/50 outline-none transition-all font-black appearance-none cursor-pointer"
                                    >
                                        <option value="Aguardando Pagamento">Aguardando Pagamento (PDV)</option>
                                        <option value="Fila de Impressão">Fila de Impressão</option>
                                        <option value="Imprimindo">Imprimindo</option>
                                        <option value="Lavagem e Cura">Cura e Limpeza</option>
                                        <option value="Pintura Secagem">Pintura</option>
                                        <option value="Pronto p/ Entrega">Pronto p/ Entrega</option>
                                        <option value="Concluída">Pedido Concluído</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest ml-1">Canal</label>
                                    <input
                                        type="text"
                                        value={editingSale.canal_venda || ''}
                                        // @ts-ignore
                                        onChange={e => setEditingSale({ ...editingSale, canal_venda: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-sm focus:border-orange-500/50 outline-none transition-all font-bold"
                                        placeholder="Ex: WhatsApp, Instagram"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                                <div className="flex items-center gap-3 h-full">
                                    <input
                                        type="checkbox"
                                        id="edit_pintura_freelancer"
                                        checked={editingSale.pintura_freelancer || false}
                                        onChange={e => setEditingSale({ ...editingSale, pintura_freelancer: e.target.checked })}
                                        className="w-5 h-5 rounded border-[var(--card-border)] bg-[var(--input-bg)] text-orange-500 focus:ring-orange-500"
                                    />
                                    <label htmlFor="edit_pintura_freelancer" className="text-sm font-black text-[var(--foreground)] cursor-pointer flex items-center gap-2">
                                        <Paintbrush size={16} className="text-orange-500" />
                                        Pintura Freelancer
                                    </label>
                                </div>
                                {editingSale.pintura_freelancer && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest ml-1">Pintor Responsável</label>
                                        <select
                                            value={editingSale.pintor_nome || ''}
                                            onChange={e => setEditingSale({ ...editingSale, pintor_nome: e.target.value })}
                                            className="w-full bg-[var(--input-bg)] border border-orange-500/30 rounded-xl px-4 py-3 text-sm outline-none transition-all font-black appearance-none cursor-pointer"
                                        >
                                            <option value="">Selecione um Pintor</option>
                                            {vendedores
                                                .filter(v =>
                                                    (v.roles && v.roles.includes('painter')) ||
                                                    v.nome === editingSale.pintor_nome ||
                                                    v.email === editingSale.pintor_nome
                                                )
                                                .map(v => (
                                                    <option key={v.email} value={v.nome || v.email}>{v.nome || v.email}</option>
                                                ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest ml-1">Observações</label>
                                <textarea
                                    value={editingSale.observacao || ''}
                                    onChange={e => setEditingSale({ ...editingSale, observacao: e.target.value })}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-sm focus:border-orange-500/50 outline-none transition-all font-medium min-h-[100px] resize-none"
                                    placeholder="Observações internas..."
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingSale(null)}
                                    className="flex-1 bg-[var(--background)] border border-[var(--card-border)] hover:bg-[var(--input-bg)] text-[var(--foreground)] font-bold py-4 rounded-2xl transition-all active:scale-95"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-orange-500/20 active:scale- scale-100 disabled:opacity-50 disabled:active:scale-100"
                                >
                                    {isUpdating ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                    SALVAR ALTERAÇÕES
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )
            }
        </div >
    );
}
