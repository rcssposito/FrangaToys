'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
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
    ChevronDown,
    ChevronUp,
    Filter,
    CreditCard,
    QrCode,
    Copy,
    ExternalLink,
    MessageCircle,
    CheckCircle2,
    RotateCw
} from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { usePermission } from '@/hooks/usePermission';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { generatePixPayload } from '@/lib/pix';

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
    valor_pago_pintor?: number;
    status_pagamento?: string;
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
    access_token?: string;
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
    const [editPaymentMethod, setEditPaymentMethod] = useState<'pix' | 'credit'>('pix');
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
    const [settings, setSettings] = useState<any>(null);
    const [postEditResult, setPostEditResult] = useState<{
        id: number;
        type: 'pix' | 'credit';
        link?: string | null;
        pixCode?: string | null;
        amount: number;
        clientName?: string;
        clientPhone?: string;
        tokenOrId: string;
    } | null>(null);
    const [vendedores, setVendedores] = useState<any[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();
    const customerFilter = searchParams.get('cliente_id');
    const [viewTab, setViewTab] = useState<'vendas' | 'comissoes'>(searchParams.get('tab') === 'comissoes' ? 'comissoes' : 'vendas');

    // Comissões States
    const [comissaoMonth, setComissaoMonth] = useState<string>(new Date().getMonth().toString());
    const [comissaoYear, setComissaoYear] = useState<string>(new Date().getFullYear().toString());
    const [comissaoVendedorId, setComissaoVendedorId] = useState<string>('all');
    const [expandedSeller, setExpandedSeller] = useState<string | null>(null);

    const months = [
        { value: '0', label: 'Janeiro' },
        { value: '1', label: 'Fevereiro' },
        { value: '2', label: 'Março' },
        { value: '3', label: 'Abril' },
        { value: '4', label: 'Maio' },
        { value: '5', label: 'Junho' },
        { value: '6', label: 'Julho' },
        { value: '7', label: 'Agosto' },
        { value: '8', label: 'Setembro' },
        { value: '9', label: 'Outubro' },
        { value: '10', label: 'Novembro' },
        { value: '11', label: 'Dezembro' },
    ];

    const commissionsBySeller = useMemo(() => {
        let filtered = allSales.filter(s => {
            const d = new Date(s.data_venda);
            return d.getMonth().toString() === comissaoMonth && d.getFullYear().toString() === comissaoYear;
        });

        if (comissaoVendedorId !== 'all') {
            filtered = filtered.filter(s => s.vendedor === comissaoVendedorId);
        }

        const acc: Record<string, any> = {};

        const processAllocation = (userName: string, displayName: string, amount: number, type: 'venda' | 'pintura', sale: Sale) => {
            if (amount <= 0) return;

            const key = userName.toLowerCase();
            if (!acc[key]) {
                acc[key] = {
                    email: userName,
                    nome: displayName || userName,
                    totalVendas: 0,
                    totalBruto: 0,
                    totalComissao: 0,
                    totalPintura: 0,
                    vendas: []
                };
            }

            if (type === 'venda') {
                acc[key].totalVendas += 1;
                acc[key].totalBruto += (sale.valor_venda_final || 0);
                acc[key].totalComissao += amount;
            } else {
                acc[key].totalPintura += amount;
            }

            acc[key].vendas.push({
                id: sale.id,
                data: sale.data_venda,
                cliente: sale.cliente_nome || 'Não informado',
                produto: sale.figuras?.nome || `Item ID: ${sale.figura_id}`,
                valor: sale.valor_venda_final || 0,
                ganho: amount,
                tipo: type,
                status: sale.status_pagamento || sale.status
            });
        };

        filtered.forEach(sale => {
            // 1. Comissão de Vendedor (15% ou comissao_vendedor)
            processAllocation(
                sale.vendedor || 'Loja',
                sale.vendedor_nome || (sale.vendedor ? sale.vendedor.split('@')[0] : 'Loja'),
                sale.comissao_vendedor || 0,
                'venda',
                sale
            );

            // 2. Pagamento de Pintura (Freelancer)
            if (sale.pintura_freelancer && (sale.valor_pago_pintor || 0) > 0 && sale.pintor_nome) {
                processAllocation(
                    sale.pintor_nome,
                    sale.pintor_nome.split('@')[0],
                    sale.valor_pago_pintor || 0,
                    'pintura',
                    sale
                );
            }
        });

        return acc;
    }, [allSales, comissaoMonth, comissaoYear, comissaoVendedorId]);

    const totalComissoesGeral = useMemo(() => {
        return Object.values(commissionsBySeller).reduce((sum: number, item: any) => {
            return sum + (item.totalComissao || 0) + (item.totalPintura || 0);
        }, 0);
    }, [commissionsBySeller]);

    const totalVendasComissionadas = useMemo(() => {
        return Object.values(commissionsBySeller).reduce((sum: number, item: any) => {
            return sum + (item.totalVendas || 0);
        }, 0);
    }, [commissionsBySeller]);

    const handleSendWhatsAppComissao = (sellerData: any) => {
        const foundUser = vendedores.find(v => (v.email || '').toLowerCase() === (sellerData.email || '').toLowerCase());
        const phone = (foundUser?.telefone || '').replace(/\D/g, '');
        const mesNome = months.find(m => m.value === comissaoMonth)?.label || 'Mês';
        const totalVendaFmt = sellerData.totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const totalPinturaFmt = sellerData.totalPintura.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const totalGeralFmt = (sellerData.totalComissao + sellerData.totalPintura).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

        const msg = `💰 *Extrato de Fechamento - Franga Toys (${mesNome}/${comissaoYear})*\n\n` +
            `Olá, *${sellerData.nome}*!\n\n` +
            `Aqui está o resumo dos seus repasses deste mês:\n` +
            `📦 *Vendas Realizadas:* ${sellerData.totalVendas}\n` +
            `💵 *Comissão de Vendas:* R$ ${totalVendaFmt}\n` +
            (sellerData.totalPintura > 0 ? `🎨 *Serviços de Pintura:* R$ ${totalPinturaFmt}\n` : '') +
            `✨ *Total Líquido a Receber:* R$ ${totalGeralFmt}\n\n` +
            `Qualquer dúvida ou conferência de pedidos, me avise por aqui!`;

        if (phone) {
            const phoneWithCountry = phone.startsWith('55') ? phone : `55${phone}`;
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const baseUrl = isMobile ? 'https://wa.me' : 'https://web.whatsapp.com/send';
            window.open(`${baseUrl}/${phoneWithCountry}?text=${encodeURIComponent(msg)}`, '_blank');
        } else {
            navigator.clipboard.writeText(msg);
            toast.success(`Extrato de ${sellerData.nome} copiado para envio no WhatsApp!`);
        }
    };

    // CRM States for Editing
    const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
    const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);

    // Catalog States for Editing
    const [catalogItems, setCatalogItems] = useState<any[]>([]);
    const [figureSearch, setFigureSearch] = useState('');

    const { hasRole } = usePermission();
    const canSeeValues = hasRole('finance');

    useEffect(() => {
        fetchSales();
        fetchVendedores();
        fetchCatalogItems();
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings');
            if (res.ok) setSettings(await res.json());
        } catch (err) {
            console.error('Erro ao buscar configurações:', err);
        }
    };

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

    const handleStartEdit = (sale: Sale) => {
        setEditingSale({ ...sale });
        setEditPaymentMethod(sale.link_pagamento ? 'credit' : 'pix');
    };

    const handleSwitchPaymentMethod = (newMethod: 'pix' | 'credit') => {
        if (!editingSale || newMethod === editPaymentMethod) return;

        const taxa = Number(settings?.taxa_cartao || 1.15);

        if (newMethod === 'credit') {
            // PIX -> Crédito: adiciona taxa de cartão
            const newPrice = Number((editingSale.valor_venda_final * taxa).toFixed(2));
            setEditingSale({
                ...editingSale,
                valor_venda_final: newPrice
            });
            setEditPaymentMethod('credit');
            toast.info(`Forma alterada para Crédito (+${((taxa - 1) * 100).toFixed(0)}% taxa aplicada)`);
        } else {
            // Crédito -> PIX: remove taxa de cartão
            const newPrice = Number((editingSale.valor_venda_final / taxa).toFixed(2));
            setEditingSale({
                ...editingSale,
                valor_venda_final: newPrice,
                link_pagamento: undefined
            });
            setEditPaymentMethod('pix');
            toast.info('Forma alterada para PIX (taxa de cartão removida)');
        }
    };

    const handleGenerateMpLink = async (targetSale = editingSale) => {
        if (!targetSale) return null;
        setIsGeneratingLink(true);
        try {
            const checkoutId = targetSale.checkout_id || crypto.randomUUID();
            const res = await fetch('/api/admin/checkout/mp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    carrinho: [{
                        id: String(targetSale.figura_id || targetSale.id),
                        nome: targetSale.figuras?.nome || 'Action Figure Sob Encomenda',
                        quantidade: targetSale.quantidade || 1,
                        valor_final: targetSale.valor_venda_final
                    }],
                    cliente_nome: targetSale.cliente_nome || 'Cliente Franga Toys',
                    reference_id: checkoutId,
                    valor_frete: 0
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Erro ao gerar link no Mercado Pago');
            }

            const data = await res.json();
            const newLink = data.init_point;
            setEditingSale(prev => prev ? ({ ...prev, link_pagamento: newLink, checkout_id: checkoutId }) : null);
            toast.success('Novo link Mercado Pago gerado com sucesso!');
            return { newLink, checkoutId };
        } catch (err: any) {
            toast.error(err.message || 'Erro ao gerar link no Mercado Pago');
            return null;
        } finally {
            setIsGeneratingLink(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSale) return;

        setIsUpdating(true);
        try {
            let updatedSale = { ...editingSale };

            // Se for crédito e não tiver link de pagamento ainda gerado, gera agora
            if (editPaymentMethod === 'credit' && !updatedSale.link_pagamento) {
                const genResult = await handleGenerateMpLink(updatedSale);
                if (!genResult?.newLink) {
                    setIsUpdating(false);
                    return;
                }
                updatedSale.link_pagamento = genResult.newLink;
                updatedSale.checkout_id = genResult.checkoutId;
            } else if (editPaymentMethod === 'pix') {
                // Ao salvar como PIX, desvincula o link do Mercado Pago
                updatedSale.link_pagamento = null as any;
            }

            const res = await fetch('/api/admin/sales', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedSale)
            });

            if (!res.ok) throw new Error('Erro ao atualizar venda');

            toast.success('Venda atualizada com sucesso!');

            const tokenOrId = updatedSale.access_token || (updatedSale.cliente_contato ? updatedSale.cliente_contato.replace(/\D/g, '') : String(updatedSale.id));
            const pixCode = editPaymentMethod === 'pix'
                ? generatePixPayload(
                    "contato@frangatoys.com.br",
                    "Bianca Machado Mastrocollo",
                    updatedSale.valor_venda_final,
                    updatedSale.checkout_id || String(updatedSale.id)
                )
                : undefined;

            setPostEditResult({
                id: updatedSale.id,
                type: editPaymentMethod,
                link: updatedSale.link_pagamento || null,
                pixCode: pixCode || null,
                amount: updatedSale.valor_venda_final,
                clientName: updatedSale.cliente_nome,
                clientPhone: updatedSale.cliente_contato,
                tokenOrId
            });

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
        <div className="w-full text-zinc-200 relative overflow-x-hidden selection:bg-orange-500/30 selection:text-orange-200">
            {/* Sci-fi Background Blobs - Subdued */}
            <div className="fixed top-[0%] right-[0%] w-[40%] h-[40%] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[0%] left-[0%] w-[40%] h-[40%] bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full relative z-10 transition-colors duration-300">

                {/* Header */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8 mt-2">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-400 rounded-2xl transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] text-zinc-500 group">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </Link>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                                {viewTab === 'comissoes' ? 'Acertos & Comissões' : (customerFilter ? 'Vendas do Cliente' : 'Vendas & Livro Caixa')}
                                {customerFilter && (
                                    <button 
                                        onClick={() => router.push('/admin/sales')}
                                        className="text-[10px] bg-orange-500/10 border border-orange-500/50 text-orange-500 px-3 py-1 rounded-full flex items-center gap-2 hover:bg-orange-500 hover:text-white transition-all"
                                    >
                                        <X size={10} /> REMOVER FILTRO
                                    </button>
                                )}
                            </h1>
                            <p className="text-zinc-500 text-sm font-medium mt-1 uppercase tracking-widest text-[10px]">
                                {viewTab === 'comissoes' ? 'Fechamentos mensais e repasses para vendedores e pintores' : 'Livro Caixa Tático de Receitas e Pedidos.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-between xl:justify-end">
                        {/* Tab Switcher: Vendas vs Comissões */}
                        <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-800">
                            <button
                                onClick={() => {
                                    setViewTab('vendas');
                                    const url = new URL(window.location.href);
                                    url.searchParams.delete('tab');
                                    window.history.replaceState({}, '', url.toString());
                                }}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                                    viewTab === 'vendas'
                                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                <ShoppingCart size={15} />
                                Pedidos & Vendas ({allSales.length})
                            </button>
                            <button
                                onClick={() => {
                                    setViewTab('comissoes');
                                    const url = new URL(window.location.href);
                                    url.searchParams.set('tab', 'comissoes');
                                    window.history.replaceState({}, '', url.toString());
                                }}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                                    viewTab === 'comissoes'
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                <DollarSign size={15} />
                                Acertos & Comissões
                            </button>
                        </div>

                        {viewTab === 'vendas' && (
                            <Link href="/admin/sales/new" className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 transition-all shadow-sm active:scale-95 uppercase tracking-widest text-xs">
                                <Plus size={16} strokeWidth={3} /> NOVA VENDA
                            </Link>
                        )}
                    </div>
                </div>

                {/* ABA 1: LISTA AGRUPADA DE VENDAS */}
                {viewTab === 'vendas' && (
                    loading ? (
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
                                    {canSeeValues && (
                                        <div className="flex gap-8 text-sm">
                                            <div className="flex flex-col items-end">
                                                <span className="text-zinc-500 text-[10px] uppercase font-black tracking-[0.1em]">Total Vendas</span>
                                                <span className="font-black text-cyan-500 text-lg tracking-tighter">R$ {group.totalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="flex flex-col items-end border-l border-zinc-800/80 pl-8 relative">
                                                <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent"></div>
                                                <span className="text-zinc-500 text-[10px] uppercase font-black tracking-[0.1em]">Lucro Real</span>
                                                <span className="font-black text-emerald-400 text-lg tracking-tighter">R$ {group.totalLucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Grid de Vendas */}
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
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
                                                        R$ {canSeeValues ? sale.valor_venda_final.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '***'}
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
                                                        {sale.link_pagamento ? (
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(sale.link_pagamento!);
                                                                    toast.success('Link Mercado Pago copiado!');
                                                                }}
                                                                className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-blue-400 transition-colors shadow-sm"
                                                                title="Copiar Link Mercado Pago (Cartão)"
                                                            >
                                                                <CreditCard size={16} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    const pix = generatePixPayload(
                                                                        "contato@frangatoys.com.br",
                                                                        "Bianca Machado Mastrocollo",
                                                                        sale.valor_venda_final,
                                                                        sale.checkout_id || String(sale.id)
                                                                    );
                                                                    navigator.clipboard.writeText(pix);
                                                                    toast.success('Código PIX copiado!');
                                                                }}
                                                                className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-emerald-400 transition-colors shadow-sm"
                                                                title="Copiar PIX Copia e Cola"
                                                            >
                                                                <QrCode size={16} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleStartEdit(sale)} className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-amber-400 transition-colors shadow-sm" title="Editar Venda">
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
                    )
                )}

                {/* ABA 2: ACERTOS & COMISSÕES */}
                {viewTab === 'comissoes' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Barra de Filtros de Comissões & Métricas Rápidas */}
                        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-6 space-y-6 shadow-xl">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                                        <DollarSign className="text-emerald-500" size={22} />
                                        Fechamento de Comissões e Repasses
                                    </h2>
                                    <p className="text-xs text-zinc-400 mt-1">
                                        Cálculo automático de comissões para vendedores e valores de pintura freelancer terceirizada.
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 bg-zinc-900/90 p-2 rounded-2xl border border-zinc-800">
                                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs px-2 font-bold">
                                        <Filter size={14} /> Filtros:
                                    </div>

                                    {vendedores.length > 0 && (
                                        <select
                                            value={comissaoVendedorId}
                                            onChange={(e) => setComissaoVendedorId(e.target.value)}
                                            className="bg-zinc-950 border border-zinc-800 text-white text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-emerald-500 cursor-pointer"
                                        >
                                            <option value="all">Todos os Vendedores</option>
                                            {vendedores.map(v => (
                                                <option key={v.email} value={v.email}>{v.nome || v.email}</option>
                                            ))}
                                        </select>
                                    )}

                                    <select
                                        value={comissaoMonth}
                                        onChange={(e) => setComissaoMonth(e.target.value)}
                                        className="bg-zinc-950 border border-zinc-800 text-white text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-emerald-500 cursor-pointer"
                                    >
                                        {months.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={comissaoYear}
                                        onChange={(e) => setComissaoYear(e.target.value)}
                                        className="bg-zinc-950 border border-zinc-800 text-white text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-emerald-500 cursor-pointer"
                                    >
                                        <option value="2024">2024</option>
                                        <option value="2025">2025</option>
                                        <option value="2026">2026</option>
                                        <option value="2027">2027</option>
                                    </select>
                                </div>
                            </div>

                            {/* Cards de Resumo */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl">
                                    <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block mb-1">
                                        Total a Pagar no Período
                                    </span>
                                    <span className="text-2xl font-black text-emerald-400">
                                        R$ {totalComissoesGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl">
                                    <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block mb-1">
                                        Profissionais com Repasse
                                    </span>
                                    <span className="text-2xl font-black text-white">
                                        {Object.keys(commissionsBySeller).length}
                                    </span>
                                </div>
                                <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl">
                                    <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block mb-1">
                                        Vendas Comissionadas
                                    </span>
                                    <span className="text-2xl font-black text-cyan-400">
                                        {totalVendasComissionadas}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Lista de Vendedores e Pintores */}
                        {loading ? (
                            <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-emerald-500 w-10 h-10" /></div>
                        ) : Object.keys(commissionsBySeller).length === 0 ? (
                            <div className="text-center py-20 bg-zinc-950/60 border border-zinc-800/80 rounded-3xl space-y-3">
                                <Calendar size={48} className="mx-auto text-zinc-700" />
                                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">
                                    Nenhuma comissão ou repasse registrado em {months.find(m => m.value === comissaoMonth)?.label} de {comissaoYear}.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(commissionsBySeller).map(([emailKey, data]: any) => {
                                    const isExpanded = expandedSeller === emailKey;
                                    const totalSeller = data.totalComissao + data.totalPintura;

                                    return (
                                        <div key={emailKey} className="bg-zinc-950/70 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-lg transition-all">
                                            {/* Header do Vendedor */}
                                            <div
                                                onClick={() => setExpandedSeller(isExpanded ? null : emailKey)}
                                                className="p-6 cursor-pointer hover:bg-zinc-900/40 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-xl border border-emerald-500/20 shadow-inner">
                                                        {data.nome.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                                                            {data.nome}
                                                        </h3>
                                                        <p className="text-xs text-zinc-500 font-medium">
                                                            {data.totalVendas} {data.totalVendas === 1 ? 'venda' : 'vendas'} registradas no mês
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-6 self-stretch md:self-auto justify-between md:justify-end">
                                                    <div className="text-right">
                                                        <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Comissão Venda</p>
                                                        <p className="text-base font-bold text-emerald-400">
                                                            R$ {data.totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>

                                                    {data.totalPintura > 0 && (
                                                        <div className="text-right border-l border-zinc-800 pl-6">
                                                            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Pintura Freelancer</p>
                                                            <p className="text-base font-bold text-fuchsia-400">
                                                                R$ {data.totalPintura.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div className="text-right border-l border-zinc-800 pl-6">
                                                        <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Total a Pagar</p>
                                                        <p className="text-xl font-black text-white">
                                                            R$ {totalSeller.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSendWhatsAppComissao(data);
                                                            }}
                                                            className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl transition-all cursor-pointer"
                                                            title="Enviar Extrato no WhatsApp"
                                                        >
                                                            <MessageCircle size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedSeller(isExpanded ? null : emailKey);
                                                            }}
                                                            className="p-2.5 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                                                        >
                                                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tabela de Vendas do Vendedor (Accordion) */}
                                            {isExpanded && (
                                                <div className="border-t border-zinc-800/80 bg-black/40 p-6 animate-in slide-in-from-top-2 duration-200">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left text-xs whitespace-nowrap">
                                                            <thead className="text-[10px] uppercase font-black tracking-widest text-zinc-500 border-b border-zinc-800 pb-3">
                                                                <tr>
                                                                    <th className="pb-3 px-4">Data</th>
                                                                    <th className="pb-3 px-4">Cliente</th>
                                                                    <th className="pb-3 px-4">Produto</th>
                                                                    <th className="pb-3 px-4">Status</th>
                                                                    <th className="pb-3 px-4 text-center">Tipo</th>
                                                                    <th className="pb-3 px-4 text-right">Valor Venda</th>
                                                                    <th className="pb-3 px-4 text-right">Repasse / Ganho</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-zinc-800/60">
                                                                {data.vendas.map((v: any) => (
                                                                    <tr key={v.id} className="hover:bg-zinc-900/30 transition-colors">
                                                                        <td className="py-3 px-4 font-mono text-zinc-400">
                                                                            {new Date(v.data).toLocaleDateString('pt-BR')}
                                                                        </td>
                                                                        <td className="py-3 px-4 font-bold text-white">
                                                                            {v.cliente}
                                                                        </td>
                                                                        <td className="py-3 px-4 text-zinc-300 font-medium">
                                                                            {v.produto}
                                                                        </td>
                                                                        <td className="py-3 px-4">
                                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                                                                                v.status === 'Concluída' || v.status === 'Pago'
                                                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                                            }`}>
                                                                                {v.status || 'Pendente'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-3 px-4 text-center">
                                                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                                                                v.tipo === 'venda'
                                                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                                                    : 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20'
                                                                            }`}>
                                                                                {v.tipo}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-3 px-4 text-right font-medium text-zinc-400">
                                                                            R$ {v.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                        </td>
                                                                        <td className={`py-3 px-4 text-right font-black ${
                                                                            v.tipo === 'venda' ? 'text-emerald-400' : 'text-fuchsia-400'
                                                                        }`}>
                                                                            R$ {v.ganho.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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
                                {/* Seletor de Forma de Pagamento */}
                                <div className="space-y-3 p-4 bg-zinc-900/70 border border-zinc-800/80 rounded-2xl">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] uppercase font-black text-zinc-400 tracking-widest flex items-center gap-2">
                                            Forma de Pagamento
                                        </label>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wider ${editPaymentMethod === 'credit' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                            {editPaymentMethod === 'credit' ? `Taxa Cartão: ${(((Number(settings?.taxa_cartao || 1.15)) - 1) * 100).toFixed(0)}%` : 'À Vista / Sem Taxa'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => handleSwitchPaymentMethod('pix')}
                                            className={`p-3.5 rounded-xl border font-black text-xs flex items-center justify-center gap-2.5 transition-all ${
                                                editPaymentMethod === 'pix'
                                                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                                                    : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                                            }`}
                                        >
                                            <QrCode size={16} />
                                            PIX
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleSwitchPaymentMethod('credit')}
                                            className={`p-3.5 rounded-xl border font-black text-xs flex items-center justify-center gap-2.5 transition-all ${
                                                editPaymentMethod === 'credit'
                                                    ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                                                    : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                                            }`}
                                        >
                                            <CreditCard size={16} />
                                            CRÉDITO (MP)
                                        </button>
                                    </div>

                                    {/* Seletor Crédito - Informações de Link */}
                                    {editPaymentMethod === 'credit' && (
                                        <div className="space-y-2 pt-2 border-t border-zinc-800/60 animate-in fade-in duration-200">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase text-blue-400/80 tracking-widest">
                                                    Link Mercado Pago
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleGenerateMpLink()}
                                                    disabled={isGeneratingLink}
                                                    className="text-[10px] font-black uppercase flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                                                >
                                                    <RotateCw size={11} className={isGeneratingLink ? 'animate-spin' : ''} />
                                                    {editingSale.link_pagamento ? 'Regerar Novo Link' : 'Gerar Link'}
                                                </button>
                                            </div>

                                            {editingSale.link_pagamento ? (
                                                <div className="flex gap-2 items-center">
                                                    <input
                                                        readOnly
                                                        value={editingSale.link_pagamento}
                                                        className="w-full bg-zinc-950 border border-blue-500/30 rounded-xl px-3 py-2 text-xs text-blue-400 font-mono outline-none truncate"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(editingSale.link_pagamento!);
                                                            toast.success('Link do Mercado Pago copiado!');
                                                        }}
                                                        className="p-2.5 bg-blue-600 hover:bg-blue-500 text-black rounded-xl transition-all shrink-0 active:scale-95"
                                                        title="Copiar Link"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                    <a
                                                        href={editingSale.link_pagamento}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-2.5 bg-zinc-950 border border-zinc-800 hover:border-blue-500/50 text-blue-400 rounded-xl transition-all shrink-0 active:scale-95"
                                                        title="Abrir Link"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between p-2.5 bg-zinc-950/80 border border-dashed border-blue-500/30 rounded-xl text-xs">
                                                    <span className="text-zinc-500 text-[11px]">Nenhum link ativo gerado ainda.</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleGenerateMpLink()}
                                                        disabled={isGeneratingLink}
                                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-black font-black text-[10px] uppercase rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                                                    >
                                                        {isGeneratingLink ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                        Gerar Link Agora
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Seletor PIX - Informações de PIX Copia e Cola */}
                                    {editPaymentMethod === 'pix' && (
                                        <div className="space-y-2 pt-2 border-t border-zinc-800/60 animate-in fade-in duration-200">
                                            <span className="text-[10px] font-black uppercase text-emerald-400/80 tracking-widest block">
                                                PIX Copia e Cola (Atualizado)
                                            </span>
                                            {(() => {
                                                const pix = generatePixPayload(
                                                    "contato@frangatoys.com.br",
                                                    "Bianca Machado Mastrocollo",
                                                    editingSale.valor_venda_final,
                                                    editingSale.checkout_id || String(editingSale.id)
                                                );
                                                return (
                                                    <div className="flex gap-2 items-center">
                                                        <input
                                                            readOnly
                                                            value={pix}
                                                            className="w-full bg-zinc-950 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono outline-none truncate"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(pix);
                                                                toast.success('Código PIX copiado!');
                                                            }}
                                                            className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-black rounded-xl transition-all shrink-0 active:scale-95"
                                                            title="Copiar PIX"
                                                        >
                                                            <Copy size={16} />
                                                        </button>
                                                    </div>
                                                );
                                            })()}
                                            {editingSale.link_pagamento && (
                                                <p className="text-[10px] text-amber-500/80 font-medium">
                                                    ⚠️ Ao salvar como PIX, o link anterior do Mercado Pago será desvinculado.
                                                </p>
                                            )}
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

            {/* Modal de Conclusão / Compartilhamento de Pagamento */}
            {postEditResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 p-6 md:p-8 rounded-3xl text-center space-y-5 shadow-2xl">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border ${postEditResult.type === 'credit' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                            <CheckCircle2 size={36} />
                        </div>

                        <div>
                            <h3 className="text-xl font-black text-white">Venda #{postEditResult.id} Atualizada!</h3>
                            <p className="text-zinc-500 text-xs mt-1">Forma de pagamento atualizada para <strong className={postEditResult.type === 'credit' ? 'text-blue-400' : 'text-emerald-400'}>{postEditResult.type === 'credit' ? 'Crédito (Mercado Pago)' : 'PIX'}</strong>.</p>
                            <div className="mt-2 text-2xl font-black text-white">
                                R$ {postEditResult.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>

                        {postEditResult.type === 'credit' && postEditResult.link && (
                            <div className="bg-black/60 border border-blue-500/30 p-4 rounded-2xl text-left space-y-2">
                                <label className="text-[10px] font-black text-blue-400 tracking-widest uppercase">Link Mercado Pago</label>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        value={postEditResult.link}
                                        className="w-full bg-zinc-950 border border-blue-500/20 rounded-xl px-3 py-2.5 text-xs text-blue-400 font-mono outline-none"
                                    />
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(postEditResult.link!);
                                            toast.success('Link copiado!');
                                        }}
                                        className="bg-blue-600 hover:bg-blue-500 p-2.5 rounded-xl text-black transition-colors shrink-0 active:scale-95"
                                        title="Copiar Link"
                                    >
                                        <Copy size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {postEditResult.type === 'pix' && postEditResult.pixCode && (
                            <div className="bg-black/60 border border-emerald-500/30 p-4 rounded-2xl text-left space-y-2">
                                <label className="text-[10px] font-black text-emerald-400 tracking-widest uppercase">PIX Copia e Cola</label>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        value={postEditResult.pixCode}
                                        className="w-full bg-zinc-950 border border-emerald-500/20 rounded-xl px-3 py-2.5 text-xs text-emerald-400 font-mono outline-none"
                                    />
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(postEditResult.pixCode!);
                                            toast.success('PIX copiado!');
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-500 p-2.5 rounded-xl text-black transition-colors shrink-0 active:scale-95"
                                        title="Copiar PIX"
                                    >
                                        <Copy size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="pt-2 flex flex-col gap-2.5">
                            <button
                                onClick={() => {
                                    const cleanPhone = (postEditResult.clientPhone || '').replace(/\D/g, '');
                                    if (!cleanPhone || cleanPhone.length < 10) {
                                        toast.error('Telefone do cliente não cadastrado ou inválido');
                                        return;
                                    }
                                    const firstName = postEditResult.clientName ? postEditResult.clientName.trim().split(' ')[0] : 'Cliente';
                                    let msg = `Olá ${firstName}, tudo bem? Aqui é da Franga Toys! 🚀\n\n`;
                                    if (postEditResult.type === 'credit' && postEditResult.link) {
                                        msg += `Segue o link atualizado para pagamento via Cartão de Crédito:\n${postEditResult.link}\n\n`;
                                    } else if (postEditResult.type === 'pix' && postEditResult.pixCode) {
                                        msg += `Segue a chave PIX atualizada para pagamento:\n${postEditResult.pixCode}\n\n`;
                                    }
                                    msg += `Valor Total: R$ ${postEditResult.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
                                    msg += `Acompanhe seu pedido pelo painel:\n${window.location.origin}/rastreio/${postEditResult.tokenOrId}`;

                                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                                    const baseUrl = isMobile ? 'https://api.whatsapp.com/send' : 'https://web.whatsapp.com/send';
                                    window.open(`${baseUrl}?phone=55${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
                                }}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm uppercase tracking-widest text-xs active:scale-95"
                            >
                                <MessageCircle size={18} />
                                Enviar WhatsApp para Cliente
                            </button>

                            <button
                                onClick={() => setPostEditResult(null)}
                                className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold py-3 rounded-2xl transition-all text-xs uppercase tracking-widest"
                            >
                                Concluir e Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
