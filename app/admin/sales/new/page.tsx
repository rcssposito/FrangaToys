'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Save, Loader2, ArrowLeft, Search, DollarSign, Package, Calendar, Trash2, Plus, Minus, AlertTriangle, CheckCircle2, User, Copy, RefreshCw, UserCheck, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/hooks/usePermission';

interface CatalogItem {
    id: number;
    Figura: string;
    codigo?: string;
    studio: string;
    "Estilizado (R$)": number;
    "Colorido (R$)": number;
    "2D (R$)": number;
    resina_kg: number;
    horas_pintura: number;
    custo_producao: number;
}

interface CartItem extends CatalogItem {
    quantidade: number;
    valor_final: number; // Valor Unitário selecionado (já com markup se for crédito)
    selectedTier: 'estilizado' | 'colorido' | '2D';
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

    const [isMounted, setIsMounted] = useState(false);

    // CRM / Clientes States
    const [clienteId, setClienteId] = useState<string | null>(null);
    const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
    const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);

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
        setIsMounted(true);
        fetchSettings();
        if (isFinanceOrAdmin) {
            fetchVendedores();
        }
    }, [user, isFinanceOrAdmin]);

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

    const fetchCustomerSuggestions = async (query: string) => {
        setIsSearchingCustomers(true);
        try {
            const res = await fetch(`/api/admin/customers?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            setCustomerSuggestions(data);
        } catch (err) {
            console.error('Erro ao buscar sugestões de clientes:', err);
        } finally {
            setIsSearchingCustomers(false);
        }
    };

    useEffect(() => {
        if (cliente.length > 2 && !clienteId) {
            const delayDebounceFn = setTimeout(() => {
                fetchCustomerSuggestions(cliente);
            }, 300);
            return () => clearTimeout(delayDebounceFn);
        } else {
            setCustomerSuggestions([]);
        }
    }, [cliente, clienteId]);

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
        if (cart.find(i => i.id === item.id)) {
            updateItemQuantity(item.id, cart.find(i => i.id === item.id)!.quantidade + 1);
        } else {
            const taxaCard = settings?.taxa_cartao || 1.15;
            const basePrice = item["Estilizado (R$)"] || 0;
            const unitPrice = paymentMethod === 'credit' ? Number((basePrice * taxaCard).toFixed(2)) : basePrice;
            
            setCart([...cart, { 
                ...item, 
                quantidade: 1, 
                selectedTier: 'estilizado',
                valor_final: Number((unitPrice * 1).toFixed(2)) 
            }]);
        }
        setSearch('');
        setShippingQuotes([]);
        toast.success(`${item.Figura} adicionado ao carrinho`);
    };

    // Efeito para sincronizar todos os itens do carrinho quando mudar o método global de pagamento
    useEffect(() => {
        if (cart.length === 0) return;
        const taxaCard = settings?.taxa_cartao || 1.15;
        
        setCart(prev => prev.map(i => {
            const tierPrice = i.selectedTier === 'estilizado' ? i["Estilizado (R$)"] : 
                             i.selectedTier === 'colorido' ? i["Colorido (R$)"] : i["2D (R$)"];
            const unitPrice = paymentMethod === 'credit' ? Number(((tierPrice || 0) * taxaCard).toFixed(2)) : (tierPrice || 0);
            return { ...i, valor_final: Number((unitPrice * i.quantidade).toFixed(2)) };
        }));
    }, [paymentMethod, settings?.taxa_cartao]);

    const removeFromCart = (id: number) => {
        setCart(cart.filter(i => i.id !== id));
        setShippingQuotes([]);
    };

    const updateItemQuantity = (id: number, qty: number) => {
        if (qty < 1) return;
        setCart(cart.map(i => {
            if (i.id === id) {
                const taxaCard = settings?.taxa_cartao || 1.15;
                const tierPrice = i.selectedTier === 'estilizado' ? i["Estilizado (R$)"] : 
                                 i.selectedTier === 'colorido' ? i["Colorido (R$)"] : i["2D (R$)"];
                const unitPrice = paymentMethod === 'credit' ? Number(((tierPrice || 0) * taxaCard).toFixed(2)) : (tierPrice || 0);
                return { ...i, quantidade: qty, valor_final: Number((unitPrice * qty).toFixed(2)) };
            }
            return i;
        }));
        setShippingQuotes([]);
    };

    const updateItemTier = (id: number, tier: 'estilizado' | 'colorido' | '2D') => {
        setCart(cart.map(i => {
            if (i.id === id) {
                const taxaCard = settings?.taxa_cartao || 1.15;
                const tierPrice = tier === 'estilizado' ? i["Estilizado (R$)"] : 
                                 tier === 'colorido' ? i["Colorido (R$)"] : i["2D (R$)"];
                const unitPrice = paymentMethod === 'credit' ? Number(((tierPrice || 0) * taxaCard).toFixed(2)) : (tierPrice || 0);
                return { ...i, selectedTier: tier, valor_final: Number((unitPrice * i.quantidade).toFixed(2)) };
            }
            return i;
        }));
    };

    const updateItemPrice = (id: number, price: number) => {
        setCart(cart.map(i => i.id === id ? { ...i, valor_final: price } : i));
    };

    const totalCartSum = cart.reduce((acc, i) => acc + (i.valor_final || 0), 0);
    const taxaMarkup = settings?.taxa_cartao || 1.15;
    
    // Para fins de comissão e lucro real, se for crédito, removemos a taxa do cartão do montante
    const totalVendaBase = paymentMethod === 'credit' ? (totalCartSum / taxaMarkup) : totalCartSum;

    const freteSomar = metodoEntrega === 'envio' ? (Number(valorFrete.replace(',', '.')) || 0) : 0;
    const totalVenda = totalCartSum + freteSomar;

    const totalResinaNecessaria = cart.reduce((acc, i) => acc + (i.resina_kg * i.quantidade), 0);
    const temEstoqueSuficiente = totalResinaNecessaria <= estoqueResina;

    // Novos cálculos dinâmicos de lucro e custos
    const totalCustoProducao = cart.reduce((acc, i) => acc + ((i.custo_producao || 0) * i.quantidade), 0);
    const totalFreelancer = pinturaFreelancer ? cart.reduce((acc, i) => {
        const hPinturaEfetiva = i.selectedTier === 'estilizado' ? 0.33 : (i.horas_pintura || 0);
        return acc + (Math.ceil(hPinturaEfetiva * (settings?.custo_h_pintura || 50)) * i.quantidade);
    }, 0) : 0;
    const OWNER_EMAIL = 'rcssposito@gmail.com';
    const emailComissao = vendedorSelecionado || user?.email;
    const nomeVendedorComissao = vendedores.find(v => v.email === emailComissao)?.nome || emailComissao;
    const totalComissao = (emailComissao && emailComissao.toLowerCase() !== OWNER_EMAIL.toLowerCase()) ? Math.round(totalVendaBase * 0.15) : 0;
    const lucroEstimado = totalVendaBase - totalCustoProducao - totalFreelancer - totalComissao;

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
            let mpLink = null;

            let finalClienteId = clienteId;

            // Se o cliente não existe (não tem ID vinculado), criamos um novo cadastro automático
            if (!finalClienteId && cliente && clienteContato) {
                try {
                    const customerRes = await fetch('/api/admin/customers', {
                        method: 'POST',
                        body: JSON.stringify({
                            nome: cliente,
                            telefone: clienteContato
                        })
                    });
                    const customerData = await customerRes.json();
                    if (customerData.id) {
                        finalClienteId = customerData.id;
                        setClienteId(finalClienteId);
                    }
                } catch (err) {
                    console.error('Falha ao registrar novo cliente no CRM:', err);
                }
            }

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
                    carrinho: cart.map(i => {
                        const isOutros = i.studio === 'Outros';
                        const valorFinalItem = i.valor_final;
                        
                        return {
                            id: i.id,
                            nome: i.Figura,
                            quantidade: i.quantidade,
                            valor_final: valorFinalItem,
                            resina_kg: i.resina_kg
                        };
                    }),
                    cliente_nome: cliente,
                    cliente_contato: clienteContato,
                    canal_venda: canal,
                    data_venda: dataVenda,
                    pintura_freelancer: pinturaFreelancer,
                    pintor_nome: pintorNome || null,
                    valor_frete: freteSomar,
                    vendedor: vendedorSelecionado || user?.email || '',
                    observacao,
                    link_pagamento: mpLink,
                    checkout_id: checkoutId,
                    cliente_id: finalClienteId
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
                const isOutros = item.studio === 'Outros';
                const precoItem = item.valor_final;
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
            <div className="min-h-screen bg-black text-white p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-emerald-900/10 rounded-full blur-[200px]" />
                </div>
                
                <div className="relative z-10 bg-zinc-950/80 backdrop-blur-md border border-emerald-500/30 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-xl">
                    <div className="w-20 h-20 bg-zinc-900 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30 shadow-sm">
                        <CheckCircle2 size={40} />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black tracking-tight text-emerald-400">Venda Registrada!</h2>
                        <p className="text-emerald-500/70 text-sm font-medium">Enviada ao Kanban (Aguardando Pagamento).</p>
                    </div>

                    {completedSaleData?.method === 'pix' && pixCode && (
                        <div className="bg-black/60 border border-emerald-500/30 p-5 rounded-2xl text-left space-y-3 shadow-inner">
                            <div className="flex justify-between items-center">
                                <label className="text-[11px] font-black text-emerald-500 tracking-widest uppercase">PIX COPIA E COLA</label>
                                <span className="text-base font-black text-white tracking-tight">R$ {(completedSaleData?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={pixCode}
                                    className="w-full bg-zinc-950 border border-emerald-500/20 rounded-xl px-4 py-3 text-xs text-emerald-400 font-mono outline-none shadow-inner cursor-text"
                                />
                                <button
                                    onClick={() => handleCopy(pixCode, 'PIX')}
                                    className="bg-emerald-600 hover:bg-emerald-500 p-3 rounded-xl text-black transition-colors flex-shrink-0 shadow-sm active:scale-95"
                                    title="Copiar PIX"
                                >
                                    <Copy size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {completedSaleData?.method === 'credit' && completedSaleData?.link_pagamento && (
                        <div className="bg-black/60 border border-blue-500/30 p-5 rounded-2xl text-left space-y-3 shadow-inner">
                            <label className="text-[11px] font-black text-blue-400 tracking-widest uppercase">LINK MERCADO PAGO</label>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={completedSaleData?.link_pagamento}
                                    className="w-full bg-zinc-950 border border-blue-500/20 rounded-xl px-4 py-3 text-xs text-blue-400 font-mono outline-none shadow-inner"
                                />
                                <button
                                    onClick={() => handleCopy(completedSaleData?.link_pagamento as string, 'Link')}
                                    className="bg-blue-600 hover:bg-blue-500 p-3 rounded-xl text-black transition-colors flex-shrink-0 shadow-sm active:scale-95"
                                    title="Copiar Link"
                                >
                                    <Copy size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="pt-6 flex flex-col gap-3">
                        <a
                            href={`/api/admin/receipt/${completedSaleData?.id}`}
                            target="_blank"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black py-4 rounded-full flex items-center justify-center gap-2 transition-all shadow-sm uppercase tracking-widest active:scale-95"
                        >
                            <DollarSign size={22} className="opacity-80" />
                            Ver Imagem (Cartão)
                        </a>
                        <Link
                            href="/admin/kanban"
                            className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-bold py-4 rounded-full flex items-center justify-center transition-all uppercase tracking-widest active:scale-95"
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
                            className="w-full bg-transparent hover:text-white text-zinc-500 font-bold py-3 mt-2 flex items-center justify-center transition-colors uppercase text-xs"
                        >
                            <ArrowLeft size={14} className="mr-2" /> Vender Novamente
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-10 relative overflow-hidden">
            {/* Background UV/Money Blobs for Scifi Theme */}
            <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[200px]" />
                <div className="absolute top-[40%] right-[-10%] w-[40%] h-[40%] bg-emerald-900/10 rounded-full blur-[200px]" />
            </div>

            <div className="max-w-6xl mx-auto relative z-10">
                <div className="flex items-center gap-5 mb-10">
                    <Link href="/admin/sales" className="p-3 bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 hover:bg-zinc-800 rounded-2xl transition-all shadow-sm">
                        <ArrowLeft size={20} className="text-cyan-500" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-zinc-100 flex items-center gap-3">
                            Check-Out
                            <span className="text-[10px] font-black uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-full">Terminal A</span>
                        </h1>
                        <p className="text-zinc-500 text-sm font-medium mt-1">Gere novos orçamentos, calcule cubagem de caixas e feche as vendas do Ateliê.</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">

                    {/* COLUNA 1: Seleção de Produtos */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-zinc-950/60 backdrop-blur-sm border border-zinc-800/50 rounded-3xl p-6 shadow-lg relative overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
                            <h2 className="text-[13px] font-black uppercase tracking-widest mb-5 flex items-center gap-3 text-cyan-400">
                                <Search size={18} /> 1. Buscar Modelos
                            </h2>
                            <div className="relative mb-6">
                                <input
                                    type="text"
                                    placeholder="Nome da figura..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-3.5 pl-4 outline-none focus:border-cyan-500 transition-all text-sm font-medium"
                                />
                                {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-cyan-500" size={18} />}
                            </div>

                            <div className="max-h-[500px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                                {items.length === 0 && !loading && <div className="text-center py-8 text-zinc-600 font-bold text-xs uppercase tracking-widest">Nenhum resultado</div>}
                                {items.slice(0, 30).map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => addToCart(item)}
                                        className="w-full text-left p-3.5 rounded-2xl bg-zinc-900/30 border border-zinc-800/40 hover:bg-zinc-900/80 hover:border-cyan-500/40 hover:-translate-y-0.5 hover:shadow-lg flex justify-between items-center group transition-all"
                                    >
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-sm text-zinc-300 group-hover:text-cyan-300 transition-colors leading-tight line-clamp-1">{item.Figura}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-zinc-500 font-mono bg-zinc-950 px-1.5 py-0.5 rounded shadow-inner">{item.codigo || '--'}</span>
                                                <span className="text-[10px] text-cyan-500/70 font-black tracking-widest uppercase">{item.studio}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 text-emerald-400 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10 transition-colors shadow-inner flex-shrink-0">
                                            <Plus size={16} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* COLUNA 2 & 3: Carrinho e Dados */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Status de Resina */}
                        <div className={`p-4 rounded-xl border flex items-center justify-between transition-all backdrop-blur-md ${temEstoqueSuficiente ? 'bg-zinc-900/50 border-emerald-500/20 text-emerald-400' : 'bg-zinc-900/50 border-red-500/20 text-red-400'}`}>
                            <div className="flex items-center gap-4">
                                {temEstoqueSuficiente ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} className="text-red-500 animate-pulse" />}
                                <div>
                                    <div className="text-[10px] uppercase font-black tracking-widest opacity-80 mb-0.5">Nível de Resina no Tanque</div>
                                    <div className="text-sm font-bold flex gap-2">
                                        <span>Consumo: {totalResinaNecessaria.toFixed(3)}kg</span>
                                        <span className="opacity-50">/</span>
                                        <span>Disponível: {estoqueResina.toFixed(3)}kg</span>
                                    </div>
                                </div>
                            </div>
                            {!temEstoqueSuficiente && (
                                <div className="text-[10px] font-black tracking-widest bg-red-600 text-white px-3 py-1.5 rounded-lg shadow-sm">ESTOQUE INSUFICIENTE</div>
                            )}
                        </div>

                        {/* Carrinho */}
                        <div className="bg-zinc-950/60 backdrop-blur-sm border border-zinc-800/50 rounded-3xl overflow-hidden shadow-lg relative">
                            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
                            <div className="p-5 border-b border-zinc-800/50 bg-zinc-950/50 flex justify-between items-center">
                                <h3 className="font-black flex items-center gap-3 tracking-wide text-zinc-100 uppercase text-xs">
                                    <Package size={18} className="text-cyan-500" /> Carrinho ({cart.length})
                                </h3>
                                {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs font-bold text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-widest bg-zinc-900/50 px-3 py-1 rounded-lg">Limpar</button>}
                            </div>

                            <div className="min-h-[200px] max-h-[400px] overflow-auto divide-y divide-zinc-800/50 custom-scrollbar">
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-12 text-zinc-700">
                                        <Package size={48} className="mb-4 text-cyan-500/10" />
                                        <p className="text-xs uppercase font-black tracking-widest">Aguardando Produtos</p>
                                    </div>
                                ) : (
                                    cart.map((item) => {
                                        const taxaMarkup = settings?.taxa_cartao || 1.15;
                                        const tierKey = item.selectedTier === 'estilizado' ? "Estilizado (R$)" : 
                                                         item.selectedTier === 'colorido' ? "Colorido (R$)" : "2D (R$)";
                                        const baseTierPrice = item[tierKey] || 0;
                                        const isOutros = item.studio === 'Outros';
                                        
                                        // Cálculo sugerido (Baseado no Tier selecionado e Método de Pagto)
                                        const suggestedUnit = paymentMethod === 'credit' ? (isOutros ? baseTierPrice : baseTierPrice * taxaMarkup) : baseTierPrice;
                                        const suggestedTotal = Number((suggestedUnit * item.quantidade).toFixed(2));
                                        const isSynced = Math.abs((item.valor_final || 0) - suggestedTotal) < 0.1;

                                        return (
                                            <div key={item.id} className="p-5 hover:bg-zinc-900/40 transition-colors group">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex flex-col">
                                                        <div className="font-black text-sm text-zinc-200 group-hover:text-cyan-400 transition-colors">{item.Figura}</div>
                                                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">{item.studio}</div>
                                                    </div>
                                                    <button onClick={() => removeFromCart(item.id)} className="text-zinc-600 hover:text-red-500 p-1.5 bg-zinc-900 rounded border border-zinc-800 transition-colors shadow-sm">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                
                                                {/* Tier Selector */}
                                                <div className="flex bg-zinc-950/50 p-1 rounded-xl border border-zinc-800/50 mb-3 w-full">
                                                    {(['estilizado', 'colorido', '2D'] as const).map((tier) => (
                                                        <button
                                                            key={tier}
                                                            onClick={() => updateItemTier(item.id, tier)}
                                                            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-tighter rounded-lg transition-all ${
                                                                item.selectedTier === tier 
                                                                ? 'bg-zinc-800 text-cyan-400 shadow-sm border border-cyan-500/20' 
                                                                : 'text-zinc-600 hover:text-zinc-400'
                                                            }`}
                                                        >
                                                            {tier}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 items-center">
                                                    <div className="flex items-center gap-1 bg-zinc-950 p-1.5 rounded-lg border border-zinc-800 w-fit shadow-inner">
                                                        <button onClick={() => updateItemQuantity(item.id, item.quantidade - 1)} className="p-1.5 rounded bg-zinc-900 text-zinc-400 hover:text-cyan-400 transition-colors"><Minus size={14} /></button>
                                                        <span className="w-10 text-center font-black text-sm text-zinc-200">{item.quantidade}</span>
                                                        <button onClick={() => updateItemQuantity(item.id, item.quantidade + 1)} className="p-1.5 rounded bg-zinc-900 text-zinc-400 hover:text-cyan-400 transition-colors"><Plus size={14} /></button>
                                                    </div>

                                                    <div className="flex flex-col gap-1.5 items-end w-full">
                                                        <div className="relative w-full">
                                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                                <span className="text-cyan-600 font-black tracking-widest text-[10px]">TOTAL</span>
                                                                {isSynced ? (
                                                                    <CheckCircle2 size={12} className="text-emerald-500" />
                                                                ) : (
                                                                    <div className="flex items-center gap-1">
                                                                        <AlertTriangle size={12} className="text-orange-500" />
                                                                        <button 
                                                                            onClick={() => updateItemPrice(item.id, suggestedTotal)}
                                                                            className="p-1 bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
                                                                            title="Restaurar Preço Sugerido"
                                                                        >
                                                                            <RefreshCw size={10} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={item.valor_final}
                                                                onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                                                                className={`w-full bg-zinc-950 border ${isSynced ? 'border-zinc-800' : 'border-orange-500/30'} rounded-xl py-2 pl-16 pr-3 text-right text-sm font-bold text-white focus:border-cyan-500 outline-none transition-all shadow-inner`}
                                                            />
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">
                                                                Sugerido: R$ {suggestedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </span>
                                                            <span className="text-[9px] text-emerald-500/80 font-black tracking-tight uppercase">
                                                                Base PIX: R$ {(baseTierPrice * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })

                                )}
                            </div>

                            {cart.length > 0 && (
                                <div className="p-5 bg-zinc-950/80 border-t border-zinc-800/80 flex flex-col gap-2.5 text-sm shadow-inner relative">
                                    <div className="flex justify-between items-center text-zinc-400 font-bold border-b border-zinc-800/50 pb-2 mb-1">
                                        <span>Valor Bruto:</span>
                                        <span className="text-zinc-200 uppercase text-[10px] tracking-widest bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">R$ {totalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    {metodoEntrega === 'envio' && freteSomar > 0 && (
                                        <div className="flex justify-between items-center text-cyan-400 font-bold text-xs border-b border-zinc-800/50 pb-2 mb-1">
                                            <span title="Custo de Envio (Correios/Transportadora)">(+) Valor do Frete (Envio):</span>
                                            <span>+ R$ {freteSomar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-red-500/90 font-mono text-xs pt-1">
                                        <span title="Resina gasta + Horas rodando a impressora">(-) Custo Produção (Material):</span>
                                        <span>- R$ {totalCustoProducao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    {pinturaFreelancer && totalFreelancer > 0 && (
                                        <div className="flex justify-between items-center text-orange-500/90 font-mono text-xs">
                                            <span title="Pagamento de terceiros">(-) Pintura Freelancer:</span>
                                            <span>- R$ {totalFreelancer.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    {totalComissao > 0 && (
                                        <div className="flex justify-between items-center text-purple-400/90 font-mono text-xs">
                                            <span title="Comissão do vendedor">(-) Comissão {nomeVendedorComissao} (15%):</span>
                                            <span>- R$ {totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center pt-3 border-t border-zinc-800/80 mt-2 pb-1 relative">
                                        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
                                        <span className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">Lucro Líquido Real</span>
                                        <span className="font-black text-emerald-400 tracking-tight text-sm">R$ {Number(lucroEstimado.toFixed(2)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Dados da Venda */}
                        <div className="bg-zinc-950/60 backdrop-blur-sm border border-zinc-800/50 rounded-3xl p-8 space-y-5 shadow-lg relative overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
                            <div className="mb-5">
                                <label className="block text-[10px] text-zinc-500 uppercase font-black mb-3 tracking-widest">Método de Pagamento</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('pix')}
                                        className={`p-4 rounded-2xl border font-black text-xs flex items-center justify-center gap-3 transition-all ${paymentMethod === 'pix' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900'}`}
                                    >
                                        <svg viewBox="0 0 512 512" className="w-4 h-4 fill-current"><path d="M119.2 386.5L34.6 302c-15.6-15.6-15.6-40.9 0-56.6l84.6-84.5c15.6-15.6 40.9-15.6 56.6 0l212.1 212.1c15.6 15.6 15.6 40.9 0 56.6l-84.6 84.5c-15.6 15.6-40.9 15.6-56.6 0L119.2 386.5zm358.2-141.1l-84.6-84.5c-15.6-15.6-40.9-15.6-56.6 0L124.1 373c-15.6 15.6-15.6 40.9 0 56.6l84.6 84.5c15.6 15.6 40.9 15.6 56.6 0l212.1-212.1c15.6-15.6 15.6-40.8 0-56.6zM256 312c-30.9 0-56-25.1-56-56s25.1-56 56-56 56 25.1 56 56-25.1 56-56 56z" /></svg>
                                        PIX
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('credit')}
                                        className={`p-4 rounded-2xl border font-black text-xs flex items-center justify-center gap-3 transition-all ${paymentMethod === 'credit' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900'}`}
                                    >
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                                        CARTÃO
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
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
                            <div className="grid md:grid-cols-2 gap-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-1 relative">
                                        <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Cliente {clienteId && <span className="text-emerald-500">● CRM</span>}</label>
                                        <input
                                            required
                                            autoComplete="new-password"
                                            value={cliente}
                                            onChange={e => {
                                                setCliente(e.target.value);
                                                if (clienteId) setClienteId(null);
                                            }}
                                            className={`w-full bg-zinc-900 border rounded-xl p-3.5 outline-none transition-all text-sm ${clienteId ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-zinc-800 text-zinc-200 focus:border-cyan-500'}`}
                                            placeholder="Digite o nome..."
                                        />
                                        
                                        {/* Suggestions Dropdown */}
                                        {customerSuggestions.length > 0 && (
                                            <div className="absolute left-0 right-0 mt-3 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="px-4 py-2 bg-zinc-900/80 border-b border-zinc-800/50 flex justify-between items-center">
                                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Encontrados no CRM</span>
                                                    <Sparkles size={10} className="text-cyan-500 animate-pulse" />
                                                </div>
                                                <div className="max-h-60 overflow-auto divide-y divide-zinc-900">
                                                    {customerSuggestions.map((c) => (
                                                        <button
                                                            key={c.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setCliente(c.nome);
                                                                setClienteContato(c.telefone);
                                                                setClienteId(c.id);
                                                                setCustomerSuggestions([]);
                                                                toast.success(`Perfil de ${c.nome.split(' ')[0]} vinculado!`, {
                                                                    icon: <UserCheck size={16} className="text-emerald-500" />
                                                                });
                                                            }}
                                                            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-zinc-800/60 transition-all text-left group"
                                                        >
                                                            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 font-bold group-hover:border-cyan-500/50 group-hover:text-cyan-400 transition-all shrink-0">
                                                                {c.nome[0].toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col flex-1 truncate">
                                                                <span className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">{c.nome}</span>
                                                                <span className="text-[10px] text-zinc-500 font-mono tracking-tighter truncate opacity-70">
                                                                    {c.telefone} {c.instagram ? `• @${c.instagram}` : ''}
                                                                </span>
                                                            </div>
                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                                                                <ArrowRight size={14} className="text-cyan-500" />
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Telefone / Whats</label>
                                        <input
                                            value={clienteContato}
                                            onChange={e => setClienteContato(e.target.value)}
                                            className="w-full bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/80 rounded-xl p-3.5 outline-none focus:border-cyan-500 text-sm transition-all text-zinc-300"
                                            placeholder="(11) 99999-9999"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Data</label>
                                        <input
                                            type="date"
                                            required
                                            value={dataVenda}
                                            onChange={e => setDataVenda(e.target.value)}
                                            className="w-full bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/80 rounded-xl p-3.5 outline-none focus:border-cyan-500 text-xs transition-all scheme-dark font-mono text-zinc-300"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Canal</label>
                                        <select
                                            value={canal}
                                            onChange={e => setCanal(e.target.value)}
                                            className="w-full bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/80 rounded-xl p-3.5 outline-none focus:border-cyan-500 text-xs transition-all text-zinc-300"
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
                                <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Anotações / Notas / Endereço</label>
                                <textarea
                                    value={observacao}
                                    onChange={e => setObservacao(e.target.value)}
                                    className="w-full bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/80 rounded-xl p-3.5 outline-none focus:border-cyan-500 h-20 resize-none text-sm transition-all text-zinc-200"
                                    placeholder="Ex: Pagamento via Pix. O cliente pediu pra envernizar extra forte."
                                />
                            </div>

                            <div className="pt-6 flex flex-col gap-4">
                                {!showPaymentOptions ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setShowPaymentOptions(true)}
                                            disabled={!isMounted || submitting || (isMounted && cart.length === 0)}
                                            className="w-full font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none disabled:cursor-not-allowed uppercase tracking-widest"
                                        >
                                            {paymentMethod === 'pix' ? 'Confirmar e Gerar PIX' : 'Confirmar e Gerar Link MP'}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="bg-zinc-950/80 backdrop-blur-md border border-emerald-500/50 p-6 rounded-3xl space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-md relative">
                                            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-black text-sm text-emerald-400 flex items-center gap-2 uppercase tracking-widest">Atenção</span>
                                                <button type="button" onClick={() => setShowPaymentOptions(false)} className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded-lg">Voltar</button>
                                            </div>

                                            {paymentMethod === 'pix' ? (
                                                <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl flex flex-col justify-center items-center gap-2 text-center">
                                                    <p className="text-sm font-black text-emerald-400 tracking-widest">PAGAMENTO VIA PIX</p>
                                                    <p className="text-xs text-zinc-400 font-medium">Você irá visualizar o QRCode/Cartão na próxima tela.</p>
                                                </div>
                                            ) : (
                                                <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-2xl flex flex-col justify-center items-center gap-2 text-center">
                                                    <p className="text-sm font-black text-blue-400 tracking-widest">MERCADO PAGO CARTÃO</p>
                                                    <p className="text-xs text-zinc-400 font-medium">Link será gerado na próxima tela (3x s/ Juros).</p>
                                                </div>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className="w-full font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-[0.98] mt-2 uppercase tracking-widest"
                                            >
                                                {submitting ? <Loader2 className="animate-spin" /> : 'CONFIRMAR VENDA OFICIAL'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </form>
                    </div>

                        {/* Total a Pagar em Destaque (Sempre Visível no Final, Grande) */}
                        {cart.length > 0 && (
                            <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-3xl shadow-lg relative overflow-hidden group">
                                <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${paymentMethod === 'credit' ? 'from-transparent via-blue-500 to-transparent' : 'from-transparent via-emerald-500 to-transparent'}`}></div>
                                
                                <div className="flex justify-between items-center relative z-10">
                                    <div className="flex flex-col">
                                        <span className="text-zinc-400 font-black uppercase tracking-widest text-[11px] mb-1">Fechar Total do Pedido</span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded w-fit ${paymentMethod === 'credit' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                            {paymentMethod === 'credit' ? 'Mercado Pago (Cartão)' : 'PAGAMENTO VIA PIX'}
                                        </span>
                                    </div>
                                    <div className={`flex items-baseline gap-1.5 ${paymentMethod === 'credit' ? 'text-blue-400' : 'text-emerald-400'}`}>
                                        <span className="text-sm font-black opacity-60">R$</span>
                                        <span className="text-4xl lg:text-5xl font-black tracking-tighter">
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
