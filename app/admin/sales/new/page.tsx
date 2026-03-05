'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Save, Loader2, ArrowLeft, Search, DollarSign, Package, Calendar, Trash2, Plus, Minus, AlertTriangle, CheckCircle2, User, Copy } from 'lucide-react';
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
    altura_cm?: number;
    largura_cm?: number;
    profundidade_cm?: number;
}

export default function NewSalePage() {
    const router = useRouter();
    const { user } = usePermission();
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [estoqueResina, setEstoqueResina] = useState(0);
    const [settings, setSettings] = useState<any>(null);

    const [vendedores, setVendedores] = useState<{ email: string; nome?: string; roles?: string[] }[]>([]);
    const [vendedorSelecionado, setVendedorSelecionado] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Cart and Form
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cliente, setCliente] = useState('');
    const [clienteContato, setClienteContato] = useState('');
    const [dataVenda, setDataVenda] = useState(new Date().toISOString().split('T')[0]);
    const [canal, setCanal] = useState('Whatsapp');
    const [pinturaFreelancer, setPinturaFreelancer] = useState(false);
    const [pintorNome, setPintorNome] = useState('');
    const [observacao, setObservacao] = useState('');

    // Entrega/Frete
    const [metodoEntrega, setMetodoEntrega] = useState<'retirada' | 'envio'>('retirada');
    const [valorFrete, setValorFrete] = useState<string>('');
    const [cepDestino, setCepDestino] = useState('');
    const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
    const [shippingQuotes, setShippingQuotes] = useState<any[]>([]);

    const [showPaymentOptions, setShowPaymentOptions] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit'>('pix');
    const [completedSaleData, setCompletedSaleData] = useState<{ id: number, link_pagamento: string | null, total: number, method: 'pix' | 'credit' } | null>(null);

    // PIX Payload Generator for Client-Side Copy
    const generatePixPayload = (key: string, name: string, amount: number) => {
        name = name.substring(0, 25).normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase();
        const city = "SAO PAULO";
        const amountStr = amount.toFixed(2);
        let payload = "00020126330014br.gov.bcb.pix" + `01${key.length.toString().padStart(2, '0')}${key}` + "520400005303986" + `54${amountStr.length.toString().padStart(2, '0')}${amountStr}` + "5802BR" + `59${name.length.toString().padStart(2, '0')}${name}` + `60${city.length.toString().padStart(2, '0')}${city}` + "62070503***6304";
        let crc = 0xFFFF;
        for (let i = 0; i < payload.length; i++) {
            crc ^= payload.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
                else crc = crc << 1;
            }
        }
        return payload + (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    };

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
            if (res.ok) {
                setSettings(data);
                setEstoqueResina(data.estoque_resina_kg || 0);
            }
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
            setCart([...cart, { ...item, quantidade: 1, valor_final: Number(((item['Básico (R$)'] || 0) * (settings?.taxa_cartao || 1.15)).toFixed(2)) }]);
        }
        setSearch('');
        setShippingQuotes([]); // Limpa as as cotações se o peso mudou
        toast.success(`${item.Figura} adicionado ao carrinho`);
    };

    const removeFromCart = (id: number) => {
        setCart(cart.filter(i => i.id !== id));
        setShippingQuotes([]);
    };

    const updateItemQuantity = (id: number, qty: number) => {
        if (qty < 1) return;
        setCart(cart.map(i => {
            if (i.id === id) {
                const unitPriceCard = Number(((i['Básico (R$)'] || 0) * (settings?.taxa_cartao || 1.15)).toFixed(2));
                return { ...i, quantidade: qty, valor_final: Number((unitPriceCard * qty).toFixed(2)) };
            }
            return i;
        }));
        setShippingQuotes([]);
    };

    const updateItemPrice = (id: number, price: number) => {
        setCart(cart.map(i => i.id === id ? { ...i, valor_final: price } : i));
    };

    const totalVendaCartao = cart.reduce((acc, i) => acc + (i.valor_final || 0), 0);
    const taxaMarkup = settings?.taxa_cartao || 1.15;
    const totalVendaBase = totalVendaCartao / taxaMarkup;
    const freteSomar = metodoEntrega === 'envio' ? (Number(valorFrete.replace(',', '.')) || 0) : 0;
    const totalVenda = (paymentMethod === 'credit' ? totalVendaCartao : totalVendaBase) + freteSomar;

    const totalResinaNecessaria = cart.reduce((acc, i) => acc + (i.resina_kg * i.quantidade), 0);
    const temEstoqueSuficiente = totalResinaNecessaria <= estoqueResina;

    // Novos cálculos dinâmicos de lucro e custos
    const totalCustoProducao = cart.reduce((acc, i) => acc + ((i.custo_producao || 0) * i.quantidade), 0);
    const totalFreelancer = pinturaFreelancer ? cart.reduce((acc, i) => acc + (Math.ceil((i.horas_pintura || 0) * 50) * i.quantidade), 0) : 0;
    const OWNER_EMAIL = 'rcssposito@gmail.com';
    const emailComissao = vendedorSelecionado || user?.email;
    const nomeVendedorComissao = vendedores.find(v => v.email === emailComissao)?.nome || emailComissao;
    const totalComissao = (emailComissao && emailComissao.toLowerCase() !== OWNER_EMAIL.toLowerCase()) ? Math.round(totalVendaBase * 0.15) : 0;
    const lucroEstimado = (paymentMethod === 'credit' ? totalVendaCartao : totalVendaBase) - totalCustoProducao - totalFreelancer - totalComissao;

    const fetchShippingQuotes = async () => {
        if (!cepDestino || cepDestino.replace(/\D/g, '').length !== 8) {
            toast.error('Informe um CEP válido');
            return;
        }
        if (cart.length === 0) {
            toast.error('Carrinho vazio');
            return;
        }

        setIsCalculatingShipping(true);
        try {
            // Volume Simples (Somando cubagem simulada)
            const nVlPeso = cart.reduce((acc, i) => acc + ((i.resina_kg || 0.1) * i.quantidade), 0);
            const nVlComprimento = Math.max(...cart.map(i => i.profundidade_cm || 15));
            const nVlAltura = cart.reduce((acc, i) => acc + ((i.altura_cm || 2) * i.quantidade), 0);
            const nVlLargura = Math.max(...cart.map(i => i.largura_cm || 10));

            const res = await fetch('/api/admin/shipping/quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sCepDestino: cepDestino,
                    nVlPeso,
                    nVlComprimento,
                    nVlAltura,
                    nVlLargura
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Falha ao cotar');

            setShippingQuotes(data);
            toast.success('Cotações recebidas!');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsCalculatingShipping(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cart.length === 0) {
            toast.error('O carrinho está vazio');
            return;
        }

        setSubmitting(true);
        try {
            const checkoutId = crypto.randomUUID();
            let mpLink = '';

            // Se for crédito, primeiro criamos a Sessão no Mercado Pago
            if (paymentMethod === 'credit') {
                const mpRes = await fetch('/api/admin/checkout/mp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        carrinho: cart.map(i => ({
                            ...i,
                            valor_final: i.valor_final
                        })),
                        cliente_nome: cliente,
                        reference_id: checkoutId,
                        valor_frete: freteSomar
                    })
                });

                if (mpRes.ok) {
                    const mpData = await mpRes.json();
                    mpLink = mpData.init_point || '';
                } else {
                    toast.error('Não foi possível gerar o link de cartão no MP, mas a venda será registrada.');
                }
            }

            const res = await fetch('/api/admin/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    carrinho: cart.map(i => ({
                        id: i.id,
                        nome: i.Figura,
                        quantidade: i.quantidade,
                        valor_final: paymentMethod === 'credit' ? i.valor_final : i.valor_final / taxaMarkup,
                        resina_kg: i.resina_kg
                    })),
                    cliente_nome: cliente,
                    cliente_contato: clienteContato,
                    canal_venda: canal,
                    data_venda: dataVenda,
                    pintura_freelancer: pinturaFreelancer,
                    pintor_nome: pintorNome || null,
                    metodo_entrega: metodoEntrega,
                    valor_frete: freteSomar,
                    vendedor: vendedorSelecionado || user?.email || '',
                    observacao,
                    link_pagamento: mpLink,
                    checkout_id: checkoutId
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
            msg += `*Cliente:* ${cliente} ${clienteContato ? `(${clienteContato})` : ''}\n`;
            msg += `*Data:* ${dataVenda.split('-').reverse().join('/')}\n`;
            msg += `*Canal:* ${canal}\n`;
            msg += `*Pintura:* ${pinturaFreelancer && pintorNome ? `Terceirizada (${pintorNome.split(' ')[0]})` : 'Interna'}\n`;
            msg += `*Entrega:* ${metodoEntrega === 'retirada' ? 'Retirada na Loja/Ateliê' : `Frete (Valor: R$ ${freteSomar.toFixed(2)})`}\n`;
            if (observacao) msg += `*Obs:* ${observacao}\n`;
            msg += `\n*📦 ITENS VENDIDOS:*\n`;

            cart.forEach(item => {
                const precoItem = paymentMethod === 'credit' ? item.valor_final : item.valor_final / 1.10;
                msg += `👉 ${item.quantidade}x ${item.Figura} - R$ ${precoItem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            });

            msg += `\n*💰 RESUMO FINANCEIRO:*\n`;
            msg += `Bruto (${paymentMethod === 'credit' ? 'Cartão' : 'PIX'}): R$ ${totalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            msg += `Custo Estimado: R$ ${totalCustoProducao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            if (totalFreelancer > 0) msg += `Pintor: R$ ${totalFreelancer.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            if (totalComissao > 0) msg += `Comissão: R$ ${totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
            msg += `\n*✅ LUCRO LÍQUIDO:* R$ ${lucroEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;

            const waLink = `https://wa.me/${numeroDestino}?text=${encodeURIComponent(msg)}`;

            // Tenta abrir numa nova aba
            window.open(waLink, '_blank');

            // Exibe a UI de sucesso localmente com botão do recibo:
            setCompletedSaleData({
                id: firstSaleId,
                link_pagamento: mpLink || null,
                total: totalVenda,
                method: paymentMethod
            });

        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar venda');
        } finally {
            setSubmitting(false);
        }
    };

    if (completedSaleData) {
        const pixCode = completedSaleData.method === 'pix' ? generatePixPayload("43687871886", "Renan C S Sposito", completedSaleData.total) : null;

        const handleCopy = (text: string, type: 'PIX' | 'Link') => {
            navigator.clipboard.writeText(text);
            toast.success(`${type} copiado para a área de transferência!`);
        };

        return (
            <div className="min-h-screen bg-black text-white p-4 md:p-8 flex items-center justify-center">
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md w-full text-center space-y-6">
                    <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={32} />
                    </div>
                    <h2 className="text-2xl font-bold">Venda Registrada!</h2>
                    <p className="text-zinc-400 text-sm">O pedido foi enviado para o Kanban (Aguardando Pagamento).</p>

                    {completedSaleData.method === 'pix' && pixCode && (
                        <div className="bg-black/50 border border-emerald-500/20 p-4 rounded-xl text-left space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-emerald-500 tracking-wider">PIX COPIA E COLA</label>
                                <span className="text-sm font-black text-white">R$ {completedSaleData.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={pixCode}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 outline-none"
                                />
                                <button
                                    onClick={() => handleCopy(pixCode, 'PIX')}
                                    className="bg-emerald-600 hover:bg-emerald-500 p-2 rounded text-white transition-colors flex-shrink-0"
                                    title="Copiar PIX"
                                >
                                    <Copy size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {completedSaleData.method === 'credit' && completedSaleData.link_pagamento && (
                        <div className="bg-black/50 border border-blue-500/20 p-4 rounded-xl text-left space-y-2">
                            <label className="text-xs font-bold text-blue-400 tracking-wider">LINK MERCADO PAGO</label>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={completedSaleData.link_pagamento}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 outline-none"
                                />
                                <button
                                    onClick={() => handleCopy(completedSaleData.link_pagamento as string, 'Link')}
                                    className="bg-blue-600 hover:bg-blue-500 p-2 rounded text-white transition-colors flex-shrink-0"
                                    title="Copiar Link"
                                >
                                    <Copy size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 flex flex-col gap-3">
                        <a
                            href={`/api/admin/receipt/${completedSaleData.id}`}
                            target="_blank"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors uppercase tracking-tight"
                        >
                            <DollarSign size={20} />
                            Ver Imagem do Cartão
                        </a>
                        <Link
                            href="/admin/kanban"
                            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl flex items-center justify-center transition-colors uppercase tracking-tight"
                        >
                            Ir para o Kanban
                        </Link>
                        <button
                            onClick={() => {
                                setCompletedSaleData(null);
                                setCart([]);
                                setCliente('');
                                setClienteContato('');
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
                                                <div className="flex flex-col gap-1 items-end w-full">
                                                    <div className="relative w-full">
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-500/80 text-[10px] font-black tracking-wider w-[50px]">CARTÃO</span>
                                                        <input
                                                            type="text"
                                                            value={item.valor_final}
                                                            onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                                                            className="w-full bg-zinc-950 border border-zinc-800 rounded py-1 pl-16 pr-2 text-right text-sm font-bold text-blue-400 outline-none focus:border-blue-500"
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-emerald-500 font-medium tracking-tight">PIX: R$ {(item.valor_final / taxaMarkup).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {cart.length > 0 && (
                                <div className="p-4 bg-zinc-950/80 border-t border-zinc-800 flex flex-col gap-2 text-sm shadow-inner">
                                    <div className="flex justify-between items-center text-zinc-400 font-medium">
                                        <div className="flex flex-col">
                                            <span>Valor Bruto (Subtotal):</span>
                                            {paymentMethod === 'pix' && <span className="text-[10px] text-emerald-400">- {Math.round((1 - (1 / taxaMarkup)) * 100)}% de Desconto (PIX)</span>}
                                        </div>
                                        <span>R$ {Number((paymentMethod === 'credit' ? totalVendaCartao : totalVendaBase).toFixed(2)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    {metodoEntrega === 'envio' && freteSomar > 0 && (
                                        <div className="flex justify-between items-center text-cyan-400 font-medium text-xs border-b border-zinc-800/50 pb-2 mb-1">
                                            <span title="Custo de Envio (Correios/Transportadora)">(+) Valor do Frete (Envio):</span>
                                            <span>+ R$ {freteSomar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-red-400/90 font-mono text-xs pt-1">
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
                                    <div className="flex justify-between items-center pt-2 border-t border-zinc-900 mt-2 pb-3">
                                        <span className="text-zinc-500 font-bold uppercase tracking-wide text-[10px]">Lucro Líquido Real:</span>
                                        <span className="font-black text-emerald-500 tracking-tight text-sm">R$ {Number(lucroEstimado.toFixed(2)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                            ) : (
                                user?.email && (
                                    <div className="flex items-center gap-2 mb-4 p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-lg text-sm text-zinc-400">
                                        <User size={16} className="text-zinc-500" />
                                        <span>Vendedor Atual:</span>
                                        <span className="font-semibold text-zinc-200">{user.email}</span>
                                    </div>
                                )
                            )}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-1">
                                        <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Cliente</label>
                                        <input
                                            required
                                            value={cliente}
                                            onChange={e => setCliente(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 outline-none focus:border-orange-500 text-sm"
                                            placeholder="Nome do Cliente"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Telefone (Opcional)</label>
                                        <input
                                            value={clienteContato}
                                            onChange={e => setClienteContato(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 outline-none focus:border-orange-500 text-sm"
                                            placeholder="(11) 99999-9999"
                                        />
                                    </div>
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

                            <div className="flex flex-col gap-1 bg-zinc-950 border border-zinc-800 p-3 rounded-lg">
                                <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                    Mão de Obra de Pintura (Opcional)
                                </label>
                                <select
                                    className="w-full bg-transparent outline-none text-sm font-semibold text-zinc-200 py-1 cursor-pointer"
                                    value={pintorNome}
                                    onChange={(e) => {
                                        const valor = e.target.value;
                                        setPintorNome(valor);
                                        setPinturaFreelancer(valor !== '');
                                    }}
                                >
                                    <option value="" className="bg-zinc-900 text-zinc-400">Pintura Interna (Própria da Loja)</option>
                                    <optgroup label="Freelancers Disponíveis" className="bg-zinc-900">
                                        {vendedores.filter(v => v.roles?.includes('painter')).map(pintor => (
                                            <option key={pintor.email} value={pintor.nome || pintor.email} className="text-orange-400 font-bold">
                                                {pintor.nome || pintor.email} (-R$ 50/h)
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>

                            <div className="flex flex-col gap-3 bg-zinc-950 border border-zinc-800 p-3 rounded-lg mt-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                    MÉTODO DE ENTREGA
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setMetodoEntrega('retirada'); setValorFrete(''); }}
                                        className={`py-2 px-3 items-center justify-center text-xs font-bold rounded-lg transition-all border ${metodoEntrega === 'retirada' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                                    >
                                        📍 Retirada na Loja
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMetodoEntrega('envio')}
                                        className={`py-2 px-3 items-center justify-center text-xs font-bold rounded-lg transition-all border ${metodoEntrega === 'envio' ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                                    >
                                        📦 Frete (Melhor Envio)
                                    </button>
                                </div>
                                {metodoEntrega === 'envio' && (
                                    <div className="mt-2 animate-in fade-in slide-in-from-top-2 border-t border-zinc-900 pt-3">
                                        <div className="flex items-end gap-2 mb-3">
                                            <div className="flex-1">
                                                <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 ml-1">CEP de Destino:</label>
                                                <input
                                                    type="text"
                                                    value={cepDestino}
                                                    onChange={(e) => setCepDestino(e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9))}
                                                    placeholder="00000-000"
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 outline-none focus:border-cyan-500 text-sm transition-all"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={fetchShippingQuotes}
                                                disabled={isCalculatingShipping || cepDestino.length < 8}
                                                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 p-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                                            >
                                                {isCalculatingShipping ? <Loader2 size={18} className="animate-spin" /> : 'Cotar'}
                                            </button>
                                        </div>

                                        {shippingQuotes.length > 0 && (
                                            <div className="grid grid-cols-2 gap-2 mb-3">
                                                {shippingQuotes.map((quote: any, idx: number) => {
                                                    const isSedex = quote.Codigo === '04014';
                                                    const isPac = quote.Codigo === '04510';
                                                    const displayName = quote.Nome || (isSedex ? 'SEDEX' : isPac ? 'PAC' : `Serviço ${quote.Codigo}`);
                                                    const displayCompany = quote.Empresa || 'Correios';
                                                    const color = isSedex ? 'text-amber-500' : isPac ? 'text-blue-500' : 'text-cyan-500';

                                                    return (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => setValorFrete(String(quote.Valor).replace('.', ','))}
                                                            className="flex flex-col items-center justify-center p-2 rounded bg-zinc-900 border border-zinc-800 hover:border-cyan-500 transition-colors gap-1 text-center"
                                                        >
                                                            <span className={`text-[9px] uppercase font-black tracking-wide ${color}`}>
                                                                {displayCompany} {displayName}
                                                            </span>
                                                            <span className="text-[10px] text-zinc-500 font-medium">({quote.PrazoEntrega} dias)</span>
                                                            <span className="text-sm font-bold text-zinc-200">R$ {quote.Valor}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <label className="block text-[10px] text-cyan-500 uppercase font-black mb-1.5 ml-1">Valor Final do Frete (R$):</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600 font-black text-sm">R$</span>
                                            <input
                                                type="text"
                                                value={valorFrete}
                                                onChange={(e) => setValorFrete(e.target.value.replace(/[^0-9,.]/g, ''))}
                                                placeholder="0,00"
                                                className="w-full bg-zinc-950/50 border border-cyan-500/30 rounded-lg p-2.5 pl-9 outline-none focus:border-cyan-500 text-sm font-bold transition-all text-cyan-400"
                                            />
                                        </div>
                                    </div>
                                )}
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
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setShowPaymentOptions(true)}
                                            disabled={submitting || cart.length === 0}
                                            className="w-full font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed"
                                        >
                                            GERAR COBRANÇA
                                        </button>
                                    </>
                                ) : (
                                    <>
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
                                                    Cartão (3x S/ Juros)
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
                                                    <p className="text-sm font-semibold text-blue-400">Checkout Mercado Pago</p>
                                                    <p className="text-xs text-zinc-500 mb-2">O cliente poderá pagar em até 3x sem juros (absorvido pela loja) ou em até 12x com juros a partir da 4ª parcela.</p>
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
                                    </>
                                )}
                            </div>
                        </form>

                        {/* Total a Pagar em Destaque (Sempre Visível no Final, Grande) */}
                        {cart.length > 0 && (
                            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg border-t-cyan-500/30">
                                <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-zinc-300 font-black uppercase tracking-tight text-xs">Total a Pagar</span>
                                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{paymentMethod === 'credit' ? 'Cartão (s/ juros)' : 'PIX (c/ desconto)'}</span>
                                    </div>
                                    <div className="flex items-baseline gap-1 text-cyan-400">
                                        <span className="text-sm font-bold opacity-50">R$</span>
                                        <span className="text-3xl font-black tracking-tighter drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]">
                                            {Number(totalVenda.toFixed(2)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
