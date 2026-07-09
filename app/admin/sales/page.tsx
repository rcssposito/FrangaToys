'use client';

import { useState, useEffect, Suspense } from 'react';
import { toast } from 'sonner';
import { 
    Plus, 
    Loader2, 
    ArrowLeft, 
    TrendingUp, 
    Calendar, 
    Trash2, 
    Package, 
    Paintbrush, 
    DollarSign, 
    RotateCcw, 
    Receipt, 
    Edit3, 
    X, 
    Save, 
    ShoppingCart,
    UserCheck,
    Sparkles,
    ArrowRight,
    Search,
    ChevronDown
} from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { usePermission } from '@/hooks/usePermission';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

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
    figura_id?: number;
    figuras: {
        nome: string;
        studios: { nome: string } | { nome: string }[];
    };
    link_pagamento?: string;
    checkout_id?: string;
    cliente_contato?: string;
    cliente_id?: string;
    metodo_entrega?: string;
}

interface MonthGroup {
    label: string;
    totalVenda: number;
    totalLucro: number;
    sales: Sale[];
}
export default function SalesPage() {
    return (
        <Suspense fallback={
            <div className="p-8 flex flex-col items-center justify-center min-h-screen gap-4">
                <Loader2 className="animate-spin text-orange-500" size={40} />
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Carregando Histórico...</p>
            </div>
        }>
            <SalesContent />
        </Suspense>
    );
}

function SalesContent() {
    const [loading, setLoading] = useState(true);
    const [allSales, setAllSales] = useState<Sale[]>([]);
    const [groups, setGroups] = useState<MonthGroup[]>([]);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [vendedores, setVendedores] = useState<any[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();
    const customerFilter = searchParams.get('cliente_id');

    // CRM States for Editing
    const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
    const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);

    // Catalog States for Editing
    const [catalogItems, setCatalogItems] = useState<any[]>([]);
    const [figureSearch, setFigureSearch] = useState('');

    const { hasRole } = usePermission();

    useEffect(() => {
        fetchSales();
        fetchVendedores();
        fetchCatalogItems();
    }, []);

    const fetchCatalogItems = async () => {
        try {
            const res = await fetch('/api/admin/catalog-prices');
            if (res.ok) setCatalogItems(await res.json());
        } catch (err) {
            console.error('Erro ao buscar catálogo');
        }
    };

    // CRM Search Logic for Edit Modal
    useEffect(() => {
        if (!editingSale || !editingSale.cliente_nome || editingSale.cliente_nome.length <= 2 || editingSale.cliente_id) {
            setCustomerSuggestions([]);
            return;
        }

        const timer = setTimeout(() => {
            fetchCustomerSuggestions(editingSale.cliente_nome);
        }, 400);

        return () => clearTimeout(timer);
    }, [editingSale?.cliente_nome, editingSale?.cliente_id]);

    const fetchCustomerSuggestions = async (query: string) => {
        setIsSearchingCustomers(true);
        try {
            const res = await fetch(`/api/admin/customers?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            setCustomerSuggestions(data);
        } catch (err) {
            console.error('Erro ao buscar sugestões:', err);
        } finally {
            setIsSearchingCustomers(false);
        }
    };

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
                setAllSales(data);
            }
        } catch (err) {
            toast.error('Erro ao carregar vendas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (allSales.length > 0) {
            processGroups(allSales);
        }
    }, [allSales, customerFilter]);

    const processGroups = (data: Sale[]) => {
        const grouped: { [key: string]: MonthGroup } = {};
        const order: string[] = [];

        // Aplicar filtro de cliente se existir
        const filtered = customerFilter 
            ? data.filter(s => s.cliente_id === customerFilter)
            : data;

        filtered.forEach(sale => {
            const date = new Date(sale.data_venda);
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
            grouped[label].totalVenda += (sale.valor_venda_final || 0);
            grouped[label].totalLucro += (sale.lucro_real || 0);
        });

        const result = order.map(key => grouped[key]);
        setGroups(result);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja cancelar esta venda?')) return;

        try {
            const res = await fetch('/api/admin/kanban', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: 'Cancelada' }),
            });

            if (!res.ok) throw new Error('Erro ao cancelar');

            toast.success('Venda cancelada');
            // Refresh list
            fetchSales();
        } catch (err) {
            toast.error('Erro ao cancelar venda');
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
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                                {customerFilter ? 'Vendas do Cliente' : 'Vendas Históricas'}
                                {customerFilter && (
                                    <button 
                                        onClick={() => router.push('/admin/sales')}
                                        className="text-[10px] bg-orange-500/10 border border-orange-500/50 text-orange-500 px-3 py-1 rounded-full flex items-center gap-2 hover:bg-orange-500 hover:text-white transition-all"
                                    >
                                        <X size={10} /> REMOVER FILTRO
                                    </button>
                                )}
                            </h1>
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

                                {/* Grid de Vendas */}
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {group.sales.map(sale => (
                                        <div key={sale.id} className="bg-zinc-950/60 backdrop-blur-sm border border-zinc-800/80 rounded-2xl p-5 shadow-sm flex flex-col relative group transition-colors hover:border-cyan-500/30">
                                            {/* Header do Card */}
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex flex-col">
                                                    <div className="font-black text-zinc-200 text-lg flex items-center gap-2 tracking-tight leading-tight">
                                                        {sale.figuras?.nome || 'Desconhecida'}
                                                        {sale.pintura_freelancer && (
                                                            <span title="Pintura Terceirizada" className="text-orange-400">
                                                                <Paintbrush size={14} />
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">
                                                        {getStudioName(sale.figuras)}
                                                    </div>
                                                </div>
                                                {sale.quantidade > 1 && (
                                                    <span className="bg-cyan-950/60 text-cyan-400 px-2 py-1 rounded-md text-[10px] font-black uppercase ring-1 ring-cyan-500/30 shrink-0 shadow-sm">
                                                        {sale.quantidade}x
                                                    </span>
                                                )}
                                            </div>

                                            {/* Info de Cliente e Data */}
                                            <div className="space-y-1 mb-5 flex-1">
                                                <div className="text-xs text-zinc-400 font-medium">
                                                    <span className="text-zinc-600 font-bold mr-1">Cli:</span> {sale.cliente_nome}
                                                </div>
                                                <div className="text-xs text-zinc-400 font-medium flex justify-between">
                                                    <span><span className="text-zinc-600 font-bold mr-1">Ven:</span> {(() => {
                                                        const raw = sale.vendedor ? (sale.vendedor_nome || sale.vendedor.split('@')[0]) : 'Loja';
                                                        return raw.toLowerCase().includes('rodrigo') ? '@frangatoys' : raw;
                                                    })()}</span>
                                                    <span className="font-mono text-[10px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">{new Date(sale.data_venda).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                            </div>

                                            {/* Financeiro */}
                                            <div className="pt-4 border-t border-zinc-900 flex justify-between items-end">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-zinc-100 text-xl tracking-tighter">
                                                        R$ {sale.valor_venda_final.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                    <span className={`w-fit text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider mt-1 ${sale.link_pagamento ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-500/30' : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'}`}>
                                                        {sale.link_pagamento ? 'Cartão' : 'PIX'}
                                                    </span>
                                                </div>
                                                
                                                {(hasRole('admin') || hasRole('finance')) && (
                                                    <div className="text-right">
                                                        <div className="text-[10px] text-zinc-600 line-through" title="Custo Base - Material e Impressão">
                                                            R$ {(sale.custo_producao_snapshot || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </div>
                                                        <div className="text-emerald-400 font-black text-sm tracking-tight" title="Lucro Líquido Real">
                                                            R$ {sale.lucro_real?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Ações Hover */}
                                            <div className="absolute top-4 right-4 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 bg-zinc-950/80 p-2 rounded-2xl backdrop-blur-md border border-zinc-800/80 shadow-xl">
                                                {sale.status === 'Concluída' && (
                                                    <button onClick={() => handleSendToKanban(sale.id)} className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-cyan-400 transition-colors shadow-sm" title="Reativar no Kanban">
                                                        <RotateCcw size={16} />
                                                    </button>
                                                )}
                                                <Link href={`/api/admin/kanban/os/${sale.id}`} target="_blank" className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-indigo-400 transition-colors shadow-sm" title="Gerar OS">
                                                    <Receipt size={16} />
                                                </Link>
                                                {hasRole('admin') && (
                                                    <>
                                                        <Link 
                                                            href={`/admin/sales/new?cliente_nome=${encodeURIComponent(sale.cliente_nome)}&cliente_contato=${encodeURIComponent(sale.cliente_contato || '')}&cliente_id=${encodeURIComponent(sale.cliente_id || '')}&vendedor=${encodeURIComponent(sale.vendedor || '')}&canal=${encodeURIComponent(sale.canal_venda || '')}&metodo_entrega=${encodeURIComponent(sale.metodo_entrega || '')}&data_venda=${encodeURIComponent(sale.data_venda ? sale.data_venda.split('T')[0] : '')}`}
                                                            className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-emerald-400 transition-colors shadow-sm flex items-center justify-center" 
                                                            title="Adicionar Novo Item (Duplicar dados do Cliente)"
                                                        >
                                                            <Plus size={16} />
                                                        </Link>
                                                        <button onClick={() => setEditingSale(sale)} className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-amber-400 transition-colors shadow-sm" title="Editar Venda">
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button onClick={() => handleDelete(sale.id)} className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-red-400 transition-colors shadow-sm" title="Excluir Venda">
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

            {/* Slide-over Modal de Edição */}
            {editingSale && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingSale(null)}></div>
                    <div className="relative w-full max-w-md bg-zinc-950 border-l border-zinc-800 h-full p-8 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
                        <div className="flex justify-between items-center mb-8 pb-5 border-b border-zinc-800/50">
                            <h2 className="text-xl font-black flex items-center gap-3 text-cyan-400">
                                <Edit3 size={24} className="opacity-80" />
                                Edição Tática #{editingSale.id}
                            </h2>
                            <button onClick={() => setEditingSale(null)} className="text-zinc-500 hover:text-white bg-zinc-900 p-2 rounded-xl transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-1 relative">
                                        <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Cliente {editingSale.cliente_id && <span className="text-emerald-500">● CRM</span>}</label>
                                        <input
                                            type="text"
                                            autoComplete="off"
                                            value={editingSale.cliente_nome || ''}
                                            onChange={e => setEditingSale({ ...editingSale, cliente_nome: e.target.value, cliente_id: undefined })}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-sm focus:border-cyan-500/50 outline-none transition-all font-bold text-zinc-200"
                                            placeholder="Nome do Cliente"
                                            required
                                        />

                                        {/* Suggestions Dropdown */}
                                        {customerSuggestions.length > 0 && (
                                            <div className="absolute left-0 mt-2 w-[320px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 divide-y divide-zinc-900">
                                                {customerSuggestions.map((c) => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingSale({ 
                                                                ...editingSale, 
                                                                cliente_nome: c.nome, 
                                                                cliente_contato: c.telefone,
                                                                cliente_id: c.id 
                                                            });
                                                            setCustomerSuggestions([]);
                                                            toast.success('Cliente vinculado via CRM');
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 transition-all text-left group"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 group-hover:text-cyan-400">
                                                            {c.nome[0].toUpperCase()}
                                                        </div>
                                                        <div className="flex flex-col flex-1 truncate">
                                                            <span className="text-xs font-bold text-zinc-200 group-hover:text-white">{c.nome}</span>
                                                            <span className="text-[10px] text-zinc-500 font-mono">{c.telefone}</span>
                                                        </div>
                                                        <ArrowRight size={12} className="text-zinc-700 group-hover:text-cyan-500" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Telefone / Whats</label>
                                        <input
                                            type="text"
                                            value={editingSale.cliente_contato || ''}
                                            onChange={e => setEditingSale({ ...editingSale, cliente_contato: e.target.value })}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-sm focus:border-cyan-500/50 outline-none transition-all font-bold text-zinc-200"
                                            placeholder="(11) 99999-9999"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Vendedor</label>
                                    <select
                                        value={editingSale.vendedor || ''}
                                        onChange={e => setEditingSale({ ...editingSale, vendedor: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-sm focus:border-cyan-500/50 outline-none transition-all font-black text-zinc-200 appearance-none cursor-pointer"
                                    >
                                        <option value="">Loja Direta</option>
                                        {vendedores.map(v => (
                                            <option key={v.email} value={v.email} className="bg-zinc-900">{v.nome || v.email}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2 relative">
                                    <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Figura / Peça: <span className="text-cyan-400 font-bold">{editingSale.figuras?.nome || 'Desconhecida'}</span></label>
                                    <input
                                        type="text"
                                        value={figureSearch}
                                        onChange={e => setFigureSearch(e.target.value)}
                                        placeholder="Trocar figura do pedido..."
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-sm focus:border-cyan-500/50 outline-none transition-all font-bold text-zinc-200"
                                    />
                                    {figureSearch && (
                                        <div className="absolute left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-zinc-900">
                                            {catalogItems
                                                .filter(item => item.Figura.toLowerCase().includes(figureSearch.toLowerCase()))
                                                .slice(0, 5)
                                                .map(item => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingSale({
                                                                ...editingSale,
                                                                figura_id: item.id,
                                                                figuras: { ...editingSale.figuras, nome: item.Figura }
                                                            });
                                                            setFigureSearch('');
                                                            toast.success(`Peça alterada para: ${item.Figura}`);
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-zinc-900 text-xs font-bold text-zinc-300 block"
                                                    >
                                                        {item.Figura} ({item.studio})
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-1">
                                        <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Quantidade</label>
                                        <input
                                            type="number"
                                            value={editingSale.quantidade}
                                            onChange={e => setEditingSale({ ...editingSale, quantidade: Math.max(1, Number(e.target.value)) })}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-sm focus:border-cyan-500/50 outline-none transition-all font-bold text-zinc-200"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Valor Final Total (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editingSale.valor_venda_final}
                                            onChange={e => setEditingSale({ ...editingSale, valor_venda_final: Number(e.target.value) })}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-sm focus:border-cyan-500/50 outline-none transition-all font-bold text-zinc-200"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Status Logístico</label>
                                    <div className="relative">
                                        <select
                                            value={editingSale.status || 'Aguardando Pagamento'}
                                            onChange={e => setEditingSale({ ...editingSale, status: e.target.value })}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-sm focus:border-cyan-500/50 outline-none transition-all font-black text-zinc-200 appearance-none cursor-pointer"
                                        >
                                            <option value="Aguardando Pagamento">Aguardando Pagamento (PDV)</option>
                                            <option value="Fila de Impressão">Fila de Impressão</option>
                                            <option value="Imprimindo">Imprimindo</option>
                                            <option value="Lavagem e Cura">Cura e Limpeza</option>
                                            <option value="Pintura Secagem">Pintura</option>
                                            <option value="Pronto p/ Entrega">Pronto p/ Entrega</option>
                                            <option value="Concluída">Pedido Concluído</option>
                                            <option value="Cancelada">Pedido Cancelado</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                            <ChevronDown size={14} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Canal</label>
                                    <input
                                        type="text"
                                        value={editingSale.canal_venda || ''}
                                        onChange={e => setEditingSale({ ...editingSale, canal_venda: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-sm focus:border-cyan-500/50 outline-none transition-all font-bold text-zinc-200"
                                        placeholder="Ex: WhatsApp, Instagram"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Método de Entrega</label>
                                    <div className="relative">
                                        <select
                                            value={editingSale.metodo_entrega || 'retirada'}
                                            onChange={e => setEditingSale({ ...editingSale, metodo_entrega: e.target.value })}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-sm focus:border-cyan-500/50 outline-none transition-all font-black text-zinc-200 appearance-none cursor-pointer"
                                        >
                                            <option value="retirada">Retirada no Ateliê</option>
                                            <option value="envio">Envio (Correios/Transportadora)</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                            <ChevronDown size={14} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setEditingSale({ ...editingSale, pintura_freelancer: !editingSale.pintura_freelancer })}>
                                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${editingSale.pintura_freelancer ? 'bg-cyan-500 border-cyan-500 text-black' : 'bg-zinc-950 border-zinc-700'}`}>
                                        {editingSale.pintura_freelancer && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                    </div>
                                    <label className="text-sm font-black text-zinc-200 cursor-pointer pointer-events-none">
                                        Pintura Terc.
                                    </label>
                                </div>
                                {editingSale.pintura_freelancer && (
                                    <div className="space-y-2">
                                        <select
                                            value={editingSale.pintor_nome || ''}
                                            onChange={e => setEditingSale({ ...editingSale, pintor_nome: e.target.value })}
                                            className="w-full bg-zinc-950 border border-cyan-500/30 rounded-xl px-3 py-2 text-sm outline-none font-black appearance-none cursor-pointer text-cyan-200"
                                        >
                                            <option value="">Pintor</option>
                                            {vendedores.filter(v => (v.roles && v.roles.includes('painter')) || v.nome === editingSale.pintor_nome).map(v => (
                                                <option key={v.email} value={v.nome || v.email}>{v.nome || v.email}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Observações Internas</label>
                                <textarea
                                    value={editingSale.observacao || ''}
                                    onChange={e => setEditingSale({ ...editingSale, observacao: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-sm focus:border-cyan-500/50 outline-none transition-all font-medium min-h-[100px] resize-none text-zinc-200"
                                />
                            </div>

                            <div className="pt-4 flex">
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="w-full bg-zinc-200 hover:bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 uppercase text-xs"
                                >
                                    {isUpdating ? <Loader2 size={18} className="animate-spin text-zinc-500" /> : <Save size={18} />}
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
