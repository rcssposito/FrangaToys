'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Save, Loader2, ArrowLeft, Search, DollarSign, Package, Calendar, Trash2, Plus, Minus, AlertTriangle, CheckCircle2, User } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/hooks/usePermission';

interface CatalogItem {
    id: number;
    Figura: string;
    codigo?: string;
    studio: string;
    "Básico (R$)": number;
    "Premium (R$)": number;
    resina_kg: number;
    horas_pintura: number;
    custo_producao: number;
}

interface CartItem extends CatalogItem {
    quantidade: number;
    valor_final: number;
}

export default function NewSalePage() {
    const router = useRouter();
    const { user } = usePermission();
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [estoqueResina, setEstoqueResina] = useState(0);

    const [vendedores, setVendedores] = useState<{ email: string; nome?: string }[]>([]);
    const [vendedorSelecionado, setVendedorSelecionado] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Cart and Form
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cliente, setCliente] = useState('');
    const [dataVenda, setDataVenda] = useState(new Date().toISOString().split('T')[0]);
    const [canal, setCanal] = useState('Whatsapp');
    const [pinturaFreelancer, setPinturaFreelancer] = useState(false);
    const [observacao, setObservacao] = useState('');

    const [showPaymentOptions, setShowPaymentOptions] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit'>('pix');
    const [completedSaleId, setCompletedSaleId] = useState<number | null>(null);

    const isFinanceOrAdmin = user?.roles?.some(r => r === 'admin' || r === 'finance');

    useEffect(() => {
        fetchSettings();
        if (isFinanceOrAdmin) {
            fetchVendedores();
        }
    }, [user]);

    useEffect(() => {
        if (user?.email && !vendedorSelecionado) {
            setVendedorSelecionado(user.email);
        }
    }, [user, vendedorSelecionado]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCatalog(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings');
            const data = await res.json();
            if (res.ok) setEstoqueResina(data.estoque_resina_kg || 0);
        } catch (err) {
            console.error('Erro ao buscar estoque:', err);
        }
    };

    const fetchVendedores = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setVendedores(data);
            }
        } catch (err) {
            console.error('Erro ao buscar vendedores:', err);
        }
    };

    const fetchCatalog = async (query = '') => {
        setLoading(true);
        try {
            const url = query ? `/api/admin/catalog-prices?search=${encodeURIComponent(query)}` : '/api/admin/catalog-prices';
            const res = await fetch(url);
            const data = await res.json();
            if (res.ok) setItems(data);
        } catch (err) {
            toast.error('Erro ao carregar catálogo');
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (item: CatalogItem) => {
        const existing = cart.find(i => i.id === item.id);
        if (existing) {
            updateItemQuantity(item.id, existing.quantidade + 1);
        } else {
            setCart([...cart, { ...item, quantidade: 1, valor_final: item['Básico (R$)'] || 0 }]);
        }
        setSearch('');
        toast.success(`${item.Figura} adicionado ao carrinho`);
    };

    const removeFromCart = (id: number) => {
        setCart(cart.filter(i => i.id !== id));
    };

    const updateItemQuantity = (id: number, qty: number) => {
        if (qty < 1) return;
        setCart(cart.map(i => {
            if (i.id === id) {
                const unitPrice = i['Básico (R$)'] || 0;
                return { ...i, quantidade: qty, valor_final: unitPrice * qty };
            }
            return i;
        }));
    };

    const updateItemPrice = (id: number, price: number) => {
        setCart(cart.map(i => i.id === id ? { ...i, valor_final: price } : i));
    };

    const totalVenda = cart.reduce((acc, i) => acc + (i.valor_final || 0), 0);
    const totalResinaNecessaria = cart.reduce((acc, i) => acc + (i.resina_kg * i.quantidade), 0);
    const temEstoqueSuficiente = totalResinaNecessaria <= estoqueResina;

    // Novos cálculos dinâmicos de lucro e custos
    const totalCustoProducao = cart.reduce((acc, i) => acc + ((i.custo_producao || 0) * i.quantidade), 0);
    const totalFreelancer = pinturaFreelancer ? cart.reduce((acc, i) => acc + (Math.ceil((i.horas_pintura || 0) * 50) * i.quantidade), 0) : 0;
    const OWNER_EMAIL = 'rcssposito@gmail.com';
    const emailComissao = vendedorSelecionado || user?.email;
    const nomeVendedorComissao = vendedores.find(v => v.email === emailComissao)?.nome || emailComissao;
    const totalComissao = (emailComissao && emailComissao.toLowerCase() !== OWNER_EMAIL.toLowerCase()) ? Math.round(totalVenda * 0.15) : 0;
    const lucroEstimado = totalVenda - totalCustoProducao - totalFreelancer - totalComissao;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cart.length === 0) {
            toast.error('O carrinho está vazio');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/admin/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    carrinho: cart.map(i => ({
                        id: i.id,
                        nome: i.Figura,
                        quantidade: i.quantidade,
                        valor_final: i.valor_final,
                        resina_kg: i.resina_kg
                    })),
                    cliente_nome: cliente,
                    canal_venda: canal,
                    data_venda: dataVenda,
                    pintura_freelancer: pinturaFreelancer,
                    vendedor: vendedorSelecionado || user?.email || '',
                    observacao
                }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Erro ao registrar');
            }

            const insertedSales = await res.json();
            const firstSaleId = insertedSales[0]?.id;

            toast.success('Venda registrada com sucesso!');

            // Gerar Link do WhatsApp para notificar a nova venda
            const numeroDestino = '5511959737551'; // O número da loja/dono
            let msg = `*🚀 NOVA VENDA REGISTRADA E ENVIADA PARA A FILA (KANBAN) 🚀*\n\n`;
            msg += `*Vendedor:* ${vendedorSelecionado || user?.email}\n`;
            msg += `*Cliente:* ${cliente}\n`;
            msg += `*Data:* ${dataVenda.split('-').reverse().join('/')}\n`;
            msg += `*Canal:* ${canal}\n`;
            msg += `*Pintura:* ${pinturaFreelancer ? 'Terceirizada' : 'Interna'}\n`;
            if (observacao) msg += `*Obs:* ${observacao}\n`;
            msg += `\n*📦 ITENS VENDIDOS:*\n`;

            cart.forEach(item => {
                msg += `👉 ${item.quantidade}x ${item.Figura} - R$ ${item.valor_final.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            });

            msg += `\n*💰 RESUMO FINANCEIRO:*\n`;
            msg += `Bruto: R$ ${totalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            msg += `Custo Estimado: R$ ${totalCustoProducao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            if (totalFreelancer > 0) msg += `Pintor: R$ ${totalFreelancer.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            if (totalComissao > 0) msg += `Comissão: R$ ${totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            msg += `\n*✅ LUCRO LÍQUIDO:* R$ ${lucroEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;

            const waLink = `https://wa.me/${numeroDestino}?text=${encodeURIComponent(msg)}`;

            // Tenta abrir numa nova aba
            window.open(waLink, '_blank');

            // Exibe a UI de sucesso localmente com botão do recibo em vez de forçar redirect:
            setCompletedSaleId(firstSaleId);

        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar venda');
        } finally {
            setSubmitting(false);
        }
    };

    if (completedSaleId) {
        return (
            <div className="min-h-screen bg-black text-white p-4 md:p-8 flex items-center justify-center">
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md w-full text-center space-y-6">
                    <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={32} />
                    </div>
                    <h2 className="text-2xl font-bold">Venda Registrada!</h2>
                    <p className="text-zinc-400 text-sm">O pedido foi enviado para o Kanban (Aguardando Pagamento).</p>

                    <div className="pt-4 flex flex-col gap-3">
                        <a
                            href={`/api/admin/receipt/${completedSaleId}`}
                            target="_blank"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                            <DollarSign size={20} />
                            Ver Cartão de Cobrança
                        </a>
                        <Link
                            href="/admin/kanban"
                            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl flex items-center justify-center transition-colors"
                        >
                            Ir para o Kanban
                        </Link>
                        <button
                            onClick={() => {
                                setCompletedSaleId(null);
                                setCart([]);
                                setCliente('');
                                setObservacao('');
                                setShowPaymentOptions(false);
                            }}
                            className="w-full bg-transparent hover:bg-zinc-800 text-zinc-400 font-bold py-3 rounded-xl flex items-center justify-center transition-colors mt-2"
                        >
                            Nova Venda
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/admin/sales" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-3xl font-bold">PDV / Nova Venda</h1>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">

                    {/* COLUNA 1: Seleção de Produtos */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-zinc-300">
                                <Search size={20} className="text-orange-500" /> 1. Buscar Modelos
                            </h2>
                            <div className="relative mb-4">
                                <input
                                    type="text"
                                    placeholder="Nome da figura..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 pl-4 outline-none focus:border-orange-500 transition-all text-sm"
                                />
                                {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-zinc-600" size={18} />}
                            </div>

                            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {items.length === 0 && !loading && <div className="text-center py-8 text-zinc-600 italic">Nenhum resultado</div>}
                                {items.slice(0, 30).map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => addToCart(item)}
                                        className="w-full text-left p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-700 flex justify-between items-center group transition-all"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm group-hover:text-white transition-colors">{item.Figura}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-zinc-400 font-mono bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">{item.codigo || '--'}</span>
                                                <span className="text-zinc-800 text-[8px]">•</span>
                                                <span className="text-[10px] text-orange-500/80 font-medium tracking-tight whitespace-nowrap">{item.studio}</span>
                                                <span className="text-zinc-800 text-[8px]">•</span>
                                                <span className="text-[10px] text-zinc-500">{(item.resina_kg || 0).toFixed(3)}kg resina</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-emerald-500 text-xs font-mono font-bold">R$ {item['Básico (R$)']}</span>
                                            <Plus size={14} className="text-zinc-700 group-hover:text-orange-500" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* COLUNA 2 & 3: Carrinho e Dados */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Status de Resina */}
                        <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${temEstoqueSuficiente ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse'}`}>
                            <div className="flex items-center gap-3">
                                {temEstoqueSuficiente ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                                <div>
                                    <div className="text-[10px] uppercase font-bold tracking-wider opacity-70">Status de Resina</div>
                                    <div className="text-sm font-semibold">
                                        Consumo: {totalResinaNecessaria.toFixed(3)}kg / Disponível: {estoqueResina.toFixed(3)}kg
                                    </div>
                                </div>
                            </div>
                            {!temEstoqueSuficiente && (
                                <div className="text-xs font-bold bg-red-500 text-white px-2 py-1 rounded">ESTOQUE INSUFICIENTE</div>
                            )}
                        </div>

                        {/* Carrinho */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
                            <div className="p-4 border-b border-zinc-800 bg-zinc-950/30 flex justify-between items-center">
                                <h3 className="font-bold flex items-center gap-2">
                                    <Package size={18} className="text-emerald-500" /> Carrinho ({cart.length})
                                </h3>
                                {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">Limpar Tudo</button>}
                            </div>

                            <div className="min-h-[200px] max-h-[400px] overflow-auto divide-y divide-zinc-800">
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-12 text-zinc-600 grayscale opacity-50">
                                        <Package size={40} className="mb-2" />
                                        <p className="text-sm">Carrinho vazio</p>
                                    </div>
                                ) : (
                                    cart.map((item) => (
                                        <div key={item.id} className="p-4 hover:bg-zinc-950/30 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-bold text-zinc-100">{item.Figura}</div>
                                                <button onClick={() => removeFromCart(item.id)} className="text-zinc-600 hover:text-red-500 p-1">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded border border-zinc-800 w-fit">
                                                    <button onClick={() => updateItemQuantity(item.id, item.quantidade - 1)} className="p-1 hover:text-orange-500"><Minus size={14} /></button>
                                                    <span className="w-8 text-center font-bold text-sm">{item.quantidade}</span>
                                                    <button onClick={() => updateItemQuantity(item.id, item.quantidade + 1)} className="p-1 hover:text-orange-500"><Plus size={14} /></button>
                                                </div>
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-600 text-[10px] font-bold">R$</span>
                                                    <input
                                                        type="text"
                                                        value={item.valor_final}
                                                        onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                                                        className="w-full bg-zinc-950 border border-zinc-800 rounded py-1 pl-7 pr-2 text-right text-sm font-bold text-emerald-400 outline-none focus:border-emerald-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {cart.length > 0 && (
                                <div className="p-4 bg-zinc-950/80 border-t border-zinc-800 flex flex-col gap-2 text-sm shadow-inner">
                                    <div className="flex justify-between items-center text-zinc-400 font-medium">
                                        <span>Valor Bruto (Subtotal):</span>
                                        <span>R$ {totalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-red-400/90 font-mono text-xs">
                                        <span title="Resina gasta + Horas rodando a impressora">(-) Custo Produção (Material):</span>
                                        <span>- R$ {totalCustoProducao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    {pinturaFreelancer && totalFreelancer > 0 && (
                                        <div className="flex justify-between items-center text-orange-400/90 font-mono text-xs">
                                            <span title="Pagamento de terceiros">(-) Pintura Freelancer:</span>
                                            <span>- R$ {totalFreelancer.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    {totalComissao > 0 && (
                                        <div className="flex justify-between items-center text-fuchsia-400/90 font-mono text-xs">
                                            <span title="Comissão do vendedor">(-) Comissão {nomeVendedorComissao} (15%):</span>
                                            <span>- R$ {totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center pt-3 border-t border-zinc-800/50 mt-1">
                                        <span className="text-zinc-300 font-bold uppercase tracking-wide text-xs">Lucro Líquido Real:</span>
                                        <span className="font-black text-emerald-500 tracking-tight text-xl">R$ {lucroEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Dados da Venda */}
                        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4 shadow-lg">
                            {isFinanceOrAdmin && vendedores.length > 0 ? (
                                <div className="space-y-1 mb-4">
                                    <label className="block text-[10px] text-zinc-500 uppercase font-black ml-1">Selecionar Vendedor</label>
                                    <div className="flex items-center gap-2 p-1 bg-zinc-950/50 border border-zinc-800/50 rounded-lg">
                                        <div className="p-2 bg-zinc-900 rounded-md text-zinc-400">
                                            <User size={16} />
                                        </div>
                                        <select
                                            value={vendedorSelecionado}
                                            onChange={e => setVendedorSelecionado(e.target.value)}
                                            className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-zinc-100 py-2 pr-4 cursor-pointer"
                                        >
                                            <option value="" disabled className="bg-zinc-900">Selecione o vendedor</option>
                                            {vendedores.map(v => (
                                                <option key={v.email} value={v.email} className="bg-zinc-900">
                                                    {v.nome || v.email}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ) : user?.email && (
                                <div className="flex items-center gap-2 mb-4 p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-lg text-sm text-zinc-400">
                                    <User size={16} className="text-zinc-500" />
                                    <span>Vendedor Atual:</span>
                                    <span className="font-semibold text-zinc-200">{user.email}</span>
                                </div>
                            )}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Cliente</label>
                                    <input
                                        required
                                        value={cliente}
                                        onChange={e => setCliente(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 outline-none focus:border-orange-500 text-sm"
                                        placeholder="Nome do Cliente"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Data</label>
                                        <input
                                            type="date"
                                            required
                                            value={dataVenda}
                                            onChange={e => setDataVenda(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 outline-none focus:border-orange-500 text-xs scheme-dark"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Canal</label>
                                        <select
                                            value={canal}
                                            onChange={e => setCanal(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 outline-none focus:border-orange-500 text-xs"
                                        >
                                            <option>Whatsapp</option>
                                            <option>Instagram</option>
                                            <option>Indicação</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 p-3 rounded-lg">
                                <input
                                    type="checkbox"
                                    id="freelancer"
                                    checked={pinturaFreelancer}
                                    onChange={(e) => setPinturaFreelancer(e.target.checked)}
                                    className="w-4 h-4 rounded border-zinc-700 text-orange-500 focus:ring-orange-500 bg-zinc-900"
                                />
                                <label htmlFor="freelancer" className="text-sm font-medium text-zinc-300 cursor-pointer select-none flex-1">
                                    Pintura será feita por Freelancer? (-R$ 50/h)
                                </label>
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Observações (Opcional)</label>
                                <textarea
                                    value={observacao}
                                    onChange={e => setObservacao(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 outline-none focus:border-orange-500 h-16 resize-none text-sm"
                                    placeholder="Ex: Pagamento via Pix..."
                                />
                            </div>

                            <div className="pt-4 flex flex-col gap-3">
                                {!showPaymentOptions ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowPaymentOptions(true)}
                                        disabled={submitting || cart.length === 0}
                                        className="w-full font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed"
                                    >
                                        GERAR COBRANÇA
                                    </button>
                                ) : (
                                    <div className="bg-zinc-950 border border-emerald-500/30 p-4 rounded-xl space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-sm text-zinc-300 flex items-center gap-2"><DollarSign size={16} className="text-emerald-500" /> Formas de Pagamento</span>
                                            <button type="button" onClick={() => setShowPaymentOptions(false)} className="text-xs text-zinc-500 hover:text-white">Cancelar</button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('pix')}
                                                className={`p-3 rounded-lg border font-bold text-xs flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'pix' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                                            >
                                                <svg viewBox="0 0 512 512" className="w-6 h-6 fill-current"><path d="M119.2 386.5L34.6 302c-15.6-15.6-15.6-40.9 0-56.6l84.6-84.5c15.6-15.6 40.9-15.6 56.6 0l212.1 212.1c15.6 15.6 15.6 40.9 0 56.6l-84.6 84.5c-15.6 15.6-40.9 15.6-56.6 0L119.2 386.5zm358.2-141.1l-84.6-84.5c-15.6-15.6-40.9-15.6-56.6 0L124.1 373c-15.6 15.6-15.6 40.9 0 56.6l84.6 84.5c15.6 15.6 40.9 15.6 56.6 0l212.1-212.1c15.6-15.6 15.6-40.8 0-56.6zM256 312c-30.9 0-56-25.1-56-56s25.1-56 56-56 56 25.1 56 56-25.1 56-56 56z" /></svg>
                                                PIX (QR Code)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('credit')}
                                                className={`p-3 rounded-lg border font-bold text-xs flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'credit' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                                            >
                                                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                                                Cartão / MP
                                            </button>
                                        </div>

                                        {paymentMethod === 'pix' && (
                                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex flex-col justify-center items-center gap-2 text-center">
                                                <p className="text-sm font-semibold text-emerald-400">Gere o cartão de cobrança</p>
                                                <p className="text-xs text-zinc-500 mb-2">(que é a imagem de recibo que geramos no painel Kanban da venda)</p>
                                            </div>
                                        )}

                                        {paymentMethod === 'credit' && (
                                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex flex-col justify-center items-center gap-2 text-center">
                                                <p className="text-sm font-semibold text-blue-400">Pagamento pelo Mercado Pago</p>
                                                <p className="text-xs text-zinc-500 mb-2">Gere um link de cobrança no seu app do M.P ou passe na maquininha.</p>
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="w-full font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-black shadow-lg shadow-white/10 active:scale-[0.98] mt-2"
                                        >
                                            {submitting ? <Loader2 className="animate-spin" /> : 'CONFIRMAR VENDA'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
}
