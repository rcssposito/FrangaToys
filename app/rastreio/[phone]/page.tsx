
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { 
    ArrowLeft, Loader2, Package, Calendar, Award, ExternalLink, RefreshCw, 
    ShoppingBag, Copy, QrCode, Check, Camera, X, Eye, FileText, CheckCircle2, 
    AlertCircle, Edit3, MapPin, ShieldCheck, Heart, Coffee, Sparkles, Paintbrush,
    ChevronDown, ChevronUp, Trash2, Share2, ArrowRight, Clock
} from 'lucide-react';
import { OrderTracker } from '@/components/OrderTracker';
import Image from 'next/image';
import imageKitLoader from '@/lib/image-loader';
import Link from 'next/link';
import { toast } from 'sonner';
import { generatePixPayload } from '@/lib/pix';
import { isValidCpfOrCnpj, isValidFullName, VALID_UFS_SET, BRAZILIAN_UFS } from '@/lib/fiscal-validation';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';

function PixPaymentWidget({ order }: { order: any }) {
    const [copied, setCopied] = useState(false);
    const [pixPayload, setPixPayload] = useState('');

    const finalVal = Number(order.valor_venda_final) || 0;
    const freteVal = Number(order.valor_frete) || 0;
    const pagoVal = Number(order.valor_pago_parcial) || 0;
    const total = finalVal + freteVal;
    const remaining = Math.max(0, total - pagoVal);

    const checkoutId = order.checkout_id || order.id;

    useEffect(() => {
        if (remaining > 0 && !order.link_pagamento) {
            // Chave E-mail da loja, nome Bianca Machado Mastrocollo
            const payload = generatePixPayload("contato@frangatoys.com.br", "Bianca Machado Mastrocollo", remaining, checkoutId);
            setPixPayload(payload);

            if (checkoutId) {
                fetch('/api/public/orders/notify-pix-copied', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ checkout_id: checkoutId, action: 'view' })
                }).catch(err => console.error('Erro ao notificar visualização Pix:', err));
            }
        }
    }, [remaining, order.link_pagamento, checkoutId]);

    const copyPix = () => {
        if (!pixPayload) return;
        navigator.clipboard.writeText(pixPayload);
        setCopied(true);
        toast.success('Chave PIX copiada!');
        setTimeout(() => setCopied(false), 3000);

        if (checkoutId) {
            fetch('/api/public/orders/notify-pix-copied', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ checkout_id: checkoutId, action: 'copy' })
            }).catch(err => console.error('Erro ao notificar cópia Pix:', err));
        }
    };

    if (remaining <= 0) return null;

    const isCard = !!order.link_pagamento;

    return (
        <div className="mt-6 bg-zinc-950/80 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-lg backdrop-blur-sm relative overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                        {isCard ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                        ) : (
                            <QrCode size={20} />
                        )}
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                            {isCard ? 'EFETUAR PAGAMENTO (CARTÃO)' : 'EFETUAR PAGAMENTO (PIX)'}
                        </h4>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                            {isCard ? 'Realize o pagamento via Mercado Pago para liberar a produção e o envio da sua figura' : 'Realize o pagamento via PIX para liberar a produção e o envio da sua figura'}
                        </p>
                    </div>
                </div>
                
                <div className="text-right">
                    <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                        {order.status_pagamento === 'Parcial' ? 'PAGAMENTO PARCIAL' : 'AGUARDANDO PAGAMENTO'}
                    </span>
                </div>
            </div>

            {/* Financial summary and Payment Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* QR Code/Link Area */}
                <div className="lg:col-span-7 flex flex-col sm:flex-row items-center gap-6 w-full min-w-0">
                    {isCard ? (
                        <div className="w-full space-y-4">
                            <p className="text-[10.5px] text-zinc-400 font-medium">
                                Clique no botão abaixo para efetuar o pagamento com cartão de crédito via Mercado Pago:
                            </p>
                            <a 
                                href={order.link_pagamento}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-orange-500 hover:bg-orange-400 text-black text-[10px] font-black py-4 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-widest shadow-lg shadow-orange-500/10"
                            >
                                <ExternalLink size={14} strokeWidth={3} />
                                Pagar Agora (Mercado Pago)
                            </a>
                        </div>
                    ) : (
                        <>
                            <div className="bg-white p-3 rounded-2xl shrink-0 shadow-xl border border-white/10">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixPayload)}`} 
                                    alt="PIX QR Code" 
                                    className="w-32 h-32"
                                />
                            </div>
                            
                            <div className="space-y-3 w-full min-w-0">
                                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-wider text-center sm:text-left">
                                    Escaneie o QR Code ao lado ou copie a chave Pix abaixo:
                                </p>
                                
                                <div className="w-full bg-zinc-900/60 border border-zinc-800 p-3 rounded-2xl overflow-hidden text-ellipsis whitespace-nowrap text-[9px] font-mono text-zinc-500 shadow-inner">
                                    {pixPayload}
                                </div>

                                <button 
                                    onClick={copyPix}
                                    className="w-full bg-orange-500 hover:bg-orange-400 text-black text-[10px] font-black py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-widest shadow-lg shadow-orange-500/10"
                                >
                                    {copied ? (
                                        <>
                                            <Check size={14} strokeWidth={3} />
                                            Código Copiado!
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={14} />
                                            Copiar Código Pix
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Values Summary Card */}
                <div className="lg:col-span-5 bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-5 space-y-3 w-full">
                    <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest">
                        <span>Valor do Item:</span>
                        <span>R$ {finalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {freteVal > 0 && (
                        <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest">
                            <span>Frete:</span>
                            <span>R$ {freteVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    )}
                    <div className="h-[1px] bg-zinc-800/80 my-2" />
                    <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest">
                        <span>Custo Total:</span>
                        <span>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {pagoVal > 0 && (
                        <div className="flex justify-between text-xs font-bold text-emerald-400 uppercase tracking-widest">
                            <span>Já Pago (Sinal):</span>
                            <span>R$ {pagoVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-base font-black tracking-tight text-white border-t border-zinc-800/60 pt-3">
                        <span className="uppercase text-xs tracking-wider text-orange-500 self-center">Valor a Pagar:</span>
                        <span className="text-orange-500 text-xl font-black">R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function NfeWidget({ order }: { order: any }) {
    const [copied, setCopied] = useState(false);

    const copyNfe = () => {
        if (!order.chave_nfe) return;
        navigator.clipboard.writeText(order.chave_nfe);
        setCopied(true);
        toast.success('Chave da NF-e copiada!');
        setTimeout(() => setCopied(false), 3000);
    };

    return (
        <div className="mt-4 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-orange-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-orange-500/10 transition-all" />
            <div className="space-y-1 z-10 w-full sm:w-auto min-w-0">
                <div className="text-[10px] uppercase font-black text-zinc-400 tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    Nota Fiscal Eletrônica (NF-e)
                </div>
                <div className="flex items-center gap-2 w-full min-w-0">
                    <div className="text-xs font-mono text-zinc-500 select-all group-hover:text-zinc-300 transition-colors overflow-hidden text-ellipsis whitespace-nowrap">
                        {order.chave_nfe}
                    </div>
                    <button 
                        onClick={copyNfe}
                        className="p-1.5 text-zinc-500 hover:text-orange-500 rounded-lg hover:bg-zinc-850/50 transition-all shrink-0 active:scale-90 flex items-center justify-center"
                        title="Copiar chave de acesso"
                    >
                        {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                </div>
            </div>
            {order.link_danfe && (
                <a 
                    href={order.link_danfe}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-500/10 hover:bg-orange-500 border border-orange-500/20 hover:border-orange-500 text-orange-500 hover:text-black text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 z-10 shrink-0"
                >
                    <ExternalLink size={12} strokeWidth={2.5} />
                    Visualizar DANFE (PDF)
                </a>
            )}
        </div>
    );
}

function ArtistTipWidget({ order }: { order: any }) {
    const [tipAmount, setTipAmount] = useState<number>(10);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [isCustom, setIsCustom] = useState(false);
    const [copied, setCopied] = useState(false);

    const activeAmount = isCustom ? (parseFloat(customAmount.replace(',', '.')) || 0) : tipAmount;
    const checkoutId = order.checkout_id || order.id;

    const tipPayload = useMemo(() => {
        if (activeAmount <= 0) return '';
        // Gera chave Pix com txid dedicado de gorjeta sem alterar o pedido
        return generatePixPayload(
            "contato@frangatoys.com.br",
            "Bianca Machado Mastrocollo",
            activeAmount,
            `TIP${checkoutId}`.slice(0, 25)
        );
    }, [activeAmount, checkoutId]);

    const copyTipPix = () => {
        if (!tipPayload) return;
        navigator.clipboard.writeText(tipPayload);
        setCopied(true);
        toast.success(`Chave Pix de R$ ${activeAmount.toFixed(2)} copiada! A equipe agradece imensamente o carinho! ❤️`);
        setTimeout(() => setCopied(false), 3000);
    };

    const PRESETS = [
        { label: 'R$ 5', val: 5, emoji: '☕', desc: 'Cafezinho' },
        { label: 'R$ 10', val: 10, emoji: '🎨', desc: 'Incentivo' },
        { label: 'R$ 20', val: 20, emoji: '🍕', desc: 'Lanche pro Artista' },
        { label: 'R$ 50', val: 50, emoji: '⭐', desc: 'Apoio Lendário' },
    ];

    return (
        <div className="mt-4 p-5 rounded-3xl bg-gradient-to-br from-amber-950/20 via-zinc-950/70 to-zinc-950/90 border border-amber-500/30 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/10 transition-all" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                        <Heart size={16} className="text-amber-400 fill-amber-400/20" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                            Gorjeta para os Artistas do Ateliê
                            <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                                Voluntário
                            </span>
                        </h4>
                        <p className="text-[10px] text-zinc-400 font-medium">
                            Gostou do colecionável? Envie um café ou incentivo extra para quem modelou e pintou sua peça{order.pintor_display ? ` (${order.pintor_display})` : ''}!
                        </p>
                    </div>
                </div>
            </div>

            <div className="pt-4 space-y-4">
                {/* Presets */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {PRESETS.map(p => (
                        <button
                            key={p.val}
                            type="button"
                            onClick={() => {
                                setIsCustom(false);
                                setTipAmount(p.val);
                            }}
                            className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                                !isCustom && tipAmount === p.val
                                    ? 'bg-amber-500/20 border-amber-500 text-white shadow-md shadow-amber-500/10 scale-[1.02]'
                                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                            }`}
                        >
                            <div className="text-sm">{p.emoji}</div>
                            <div className="text-xs font-black">{p.label}</div>
                            <div className="text-[9px] text-zinc-500 truncate">{p.desc}</div>
                        </button>
                    ))}

                    {/* Botão Outro Valor */}
                    <button
                        type="button"
                        onClick={() => setIsCustom(true)}
                        className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer col-span-2 sm:col-span-1 ${
                            isCustom
                                ? 'bg-amber-500/20 border-amber-500 text-white shadow-md shadow-amber-500/10 scale-[1.02]'
                                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                        }`}
                    >
                        <div className="text-sm">✨</div>
                        <div className="text-xs font-black">Outro</div>
                        <div className="text-[9px] text-zinc-500">Personalizado</div>
                    </button>
                </div>

                {/* Input personalizado se ativo */}
                {isCustom && (
                    <div className="flex items-center gap-2 bg-zinc-900/80 border border-amber-500/40 rounded-2xl p-2 px-3">
                        <span className="text-xs font-bold text-amber-400">R$</span>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            placeholder="Digite o valor (ex: 25)"
                            className="bg-transparent border-none text-xs font-bold text-white outline-none w-full placeholder:text-zinc-600"
                            autoFocus
                        />
                    </div>
                )}

                {/* Área de Pagamento da Gorjeta */}
                {activeAmount > 0 && tipPayload && (
                    <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                        <div className="bg-white p-2.5 rounded-xl shrink-0 shadow-md">
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(tipPayload)}`} 
                                alt="PIX Gorjeta QR Code" 
                                className="w-24 h-24"
                            />
                        </div>

                        <div className="space-y-2.5 w-full min-w-0">
                            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-300">
                                <span className="flex items-center gap-1.5 text-amber-400">
                                    <Sparkles size={13} />
                                    Gorjeta de R$ {activeAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[9px] text-zinc-500 uppercase font-mono">
                                    PIX Direto Ateliê
                                </span>
                            </div>

                            <div className="w-full bg-zinc-900 border border-zinc-850 p-2.5 rounded-xl overflow-hidden text-ellipsis whitespace-nowrap text-[9px] font-mono text-zinc-500">
                                {tipPayload}
                            </div>

                            <button 
                                type="button"
                                onClick={copyTipPix}
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black text-xs font-black py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer"
                            >
                                {copied ? (
                                    <>
                                        <Check size={14} strokeWidth={3} />
                                        Chave Pix Copiada!
                                    </>
                                ) : (
                                    <>
                                        <Copy size={14} />
                                        Copiar Pix da Gorjeta (R$ {activeAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function NfeDataFormWidget({ order, identifier, onSaved }: { order: any; identifier: string; onSaved: () => void }) {
    const client = order.cliente || {};
    const isReady = !!client.is_nfe_ready;
    const [isEditing, setIsEditing] = useState(!isReady);
    const [isSaving, setIsSaving] = useState(false);
    const [isSearchingCep, setIsSearchingCep] = useState(false);

    const [formData, setFormData] = useState({
        nome: client.nome_exibicao || order.cliente_nome || '',
        cpf: '',
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: ''
    });

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            nome: prev.nome || client.nome_exibicao || order.cliente_nome || ''
        }));
        if (client.is_nfe_ready) {
            setIsEditing(false);
        } else {
            setIsEditing(true);
        }
    }, [client.is_nfe_ready, client.nome_exibicao, order.cliente_nome]);

    const formatCpfCnpj = (value: string) => {
        const digits = value.replace(/\D/g, '');
        if (digits.length <= 11) {
            return digits
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            return digits
                .slice(0, 14)
                .replace(/(\d{2})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1/$2')
                .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
        }
    };

    const formatCep = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 8);
        return digits.replace(/(\d{5})(\d)/, '$1-$2');
    };

    const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCep(e.target.value);
        setFormData(prev => ({ ...prev, cep: formatted }));

        const clean = formatted.replace(/\D/g, '');
        if (clean.length === 8) {
            setIsSearchingCep(true);
            try {
                const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
                if (res.ok) {
                    const data = await res.json();
                    if (!data.erro) {
                        setFormData(prev => ({
                            ...prev,
                            logradouro: data.logradouro || prev.logradouro,
                            bairro: data.bairro || prev.bairro,
                            cidade: data.localidade || prev.cidade,
                            uf: data.uf || prev.uf
                        }));
                        toast.success('Endereço localizado via CEP!');
                        const numInput = document.getElementById(`numero-input-${order.id}`);
                        if (numInput) numInput.focus();
                    } else {
                        toast.error('CEP não localizado');
                    }
                }
            } catch {
                toast.error('Erro ao consultar CEP');
            } finally {
                setIsSearchingCep(false);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isValidFullName(formData.nome)) {
            toast.error('Informe seu nome completo (com sobrenome) para a emissão da NF-e.');
            return;
        }

        const cleanCpf = formData.cpf.replace(/\D/g, '');
        if (!isValidCpfOrCnpj(cleanCpf)) {
            toast.error('Informe um CPF ou CNPJ válido com dígitos corretos.');
            return;
        }

        const cleanCep = formData.cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) {
            toast.error('Informe um CEP válido (8 dígitos).');
            return;
        }

        if (!formData.logradouro.trim() || !formData.numero.trim() || !formData.bairro.trim() || !formData.cidade.trim() || !formData.uf.trim()) {
            toast.error('Por favor, preencha todos os campos obrigatórios de endereço.');
            return;
        }

        const cleanUf = formData.uf.trim().toUpperCase();
        if (!VALID_UFS_SET.has(cleanUf)) {
            toast.error('Selecione uma UF (Estado) válida.');
            return;
        }

        setIsSaving(true);
        try {
            const isToken = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
            const res = await fetch('/api/public/orders/nfe-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: isToken ? identifier : (order.token || undefined),
                    phone: isToken ? (order.cliente_contato || undefined) : identifier,
                    sale_id: order.id,
                    ...formData
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao salvar dados');

            toast.success('Dados cadastrais salvos com sucesso!');
            setIsEditing(false);
            onSaved();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar dados cadastrais');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="mt-6 bg-zinc-950/80 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-lg backdrop-blur-sm relative overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">
                            Dados para a Nota Fiscal (NF-e)
                        </h4>
                        <p className="text-[10px] text-zinc-500 font-medium">
                            {isReady 
                                ? 'Dados registrados para emissão da Nota Fiscal e envio da sua peça.' 
                                : 'Complete seus dados para emissão da sua Nota Fiscal e finalizarmos sua entrega.'}
                        </p>
                    </div>
                </div>

                <div className="shrink-0">
                    {isReady ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                            <CheckCircle2 size={13} className="text-emerald-400" />
                            Pronto para a NF-e
                        </span>
                    ) : (
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm animate-pulse">
                            <AlertCircle size={13} className="text-amber-400" />
                            Dados Pendentes
                        </span>
                    )}
                </div>
            </div>

            {/* Visualização Resumida quando já está Pronto (Proteção LGPD) */}
            {isReady && !isEditing ? (
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 text-xs text-zinc-300">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{client.nome_exibicao || 'Cliente'}</span>
                            <span className="text-zinc-600">•</span>
                            <span className="font-mono text-zinc-400 font-bold">{client.cpf_mascarado || 'Documento Registrado'}</span>
                        </div>
                        {client.cidade && client.uf && (
                            <p className="text-zinc-400 text-[11px] flex items-center gap-1.5">
                                <MapPin size={12} className="text-purple-400 shrink-0" />
                                {client.cidade} / {client.uf} {client.cep_mascarado ? `• CEP ${client.cep_mascarado}` : ''}
                            </p>
                        )}
                        <p className="text-[10px] text-emerald-400/80 font-medium flex items-center gap-1.5 pt-0.5">
                            <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                            Dados de faturamento e entrega salvos com segurança (Proteção LGPD).
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="self-start sm:self-center flex items-center gap-2 text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-700/60 text-zinc-300 hover:text-white transition-all cursor-pointer shrink-0"
                    >
                        <Edit3 size={12} />
                        Atualizar Dados
                    </button>
                </div>
            ) : (
                /* Formulário */
                <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                    {!isReady && (
                        <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl text-amber-300 text-xs font-medium flex items-center gap-2.5">
                            <AlertCircle size={16} className="shrink-0 text-amber-400" />
                            <span>Por favor, preencha os dados abaixo para que possamos emitir sua Nota Fiscal e finalizarmos sua entrega.</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] text-zinc-400 uppercase font-black mb-1 tracking-wider">Nome Completo</label>
                            <input
                                type="text"
                                required
                                value={formData.nome}
                                onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                                placeholder="Nome como no documento"
                                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-purple-500 text-xs text-zinc-200 font-bold transition-all shadow-inner"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] text-zinc-400 uppercase font-black mb-1 tracking-wider">CPF ou CNPJ</label>
                            <input
                                type="text"
                                required
                                value={formData.cpf}
                                onChange={e => setFormData(prev => ({ ...prev, cpf: formatCpfCnpj(e.target.value) }))}
                                placeholder="000.000.000-00"
                                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-purple-500 text-xs text-zinc-200 font-bold transition-all shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-[10px] text-zinc-400 uppercase font-black tracking-wider">CEP</label>
                                {isSearchingCep && (
                                    <span className="text-[9px] font-bold text-purple-400 flex items-center gap-1">
                                        <Loader2 size={10} className="animate-spin" /> Buscando...
                                    </span>
                                )}
                            </div>
                            <input
                                type="text"
                                required
                                maxLength={9}
                                value={formData.cep}
                                onChange={handleCepChange}
                                placeholder="00000-000"
                                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-purple-500 text-xs text-zinc-200 font-bold transition-all shadow-inner"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-[10px] text-zinc-400 uppercase font-black mb-1 tracking-wider">Rua / Logradouro</label>
                            <input
                                type="text"
                                required
                                value={formData.logradouro}
                                onChange={e => setFormData(prev => ({ ...prev, logradouro: e.target.value }))}
                                placeholder="Ex: Av. Paulista"
                                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-purple-500 text-xs text-zinc-200 font-bold transition-all shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-[10px] text-zinc-400 uppercase font-black mb-1 tracking-wider">Número</label>
                            <input
                                id={`numero-input-${order.id}`}
                                type="text"
                                required
                                value={formData.numero}
                                onChange={e => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                                placeholder="Ex: 123 ou S/N"
                                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-purple-500 text-xs text-zinc-200 font-bold transition-all shadow-inner"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] text-zinc-400 uppercase font-black mb-1 tracking-wider">Complemento (Opt)</label>
                            <input
                                type="text"
                                value={formData.complemento}
                                onChange={e => setFormData(prev => ({ ...prev, complemento: e.target.value }))}
                                placeholder="Apto 42"
                                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-purple-500 text-xs text-zinc-200 font-bold transition-all shadow-inner"
                            />
                        </div>

                        <div className="col-span-2 sm:col-span-2">
                            <label className="block text-[10px] text-zinc-400 uppercase font-black mb-1 tracking-wider">Bairro</label>
                            <input
                                type="text"
                                required
                                value={formData.bairro}
                                onChange={e => setFormData(prev => ({ ...prev, bairro: e.target.value }))}
                                placeholder="Bairro"
                                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-purple-500 text-xs text-zinc-200 font-bold transition-all shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="block text-[10px] text-zinc-400 uppercase font-black mb-1 tracking-wider">Cidade</label>
                            <input
                                type="text"
                                required
                                value={formData.cidade}
                                onChange={e => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                                placeholder="Cidade"
                                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-purple-500 text-xs text-zinc-200 font-bold transition-all shadow-inner"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] text-zinc-400 uppercase font-black mb-1 tracking-wider">UF (Estado)</label>
                            <select
                                required
                                value={formData.uf}
                                onChange={e => setFormData(prev => ({ ...prev, uf: e.target.value.toUpperCase() }))}
                                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-2.5 outline-none focus:border-purple-500 text-xs text-zinc-200 font-bold uppercase transition-all shadow-inner text-center cursor-pointer appearance-none"
                            >
                                <option value="" disabled className="text-zinc-500">UF</option>
                                {BRAZILIAN_UFS.map(uf => (
                                    <option key={uf} value={uf} className="bg-zinc-900 text-zinc-200 font-bold">
                                        {uf}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        {isReady && (
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Check size={14} />
                                    Salvar Dados da Nota Fiscal
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

function WipGalleryWidget({ photos }: { photos: any[] }) {
    const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);

    if (!photos || photos.length === 0) return null;

    return (
        <div className="mt-6 bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-6 md:p-8 space-y-5 shadow-lg backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                        <Camera size={20} />
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">
                            Bastidores da Produção (Fotos Reais)
                        </h4>
                        <p className="text-[10px] text-zinc-500 font-medium">
                            Acompanhe os bastidores de confecção da sua peça • Baixe suas fotos favoritas (salvas por até 15 dias após a conclusão)
                        </p>
                    </div>
                </div>
                <span className="self-start sm:self-auto bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                    {photos.length} {photos.length === 1 ? 'Foto' : 'Fotos'}
                </span>
            </div>

            {/* Grid de Fotos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map((photo: any, index: number) => (
                    <div
                        key={photo.id || index}
                        onClick={() => setSelectedPhoto(photo)}
                        className="group relative aspect-square rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer shadow-md"
                    >
                        <img
                            src={photo.url}
                            alt={photo.caption || 'Foto dos bastidores'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />
                        
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px]">
                            <span className="p-2 bg-black/70 text-white rounded-full border border-white/20">
                                <Eye size={16} />
                            </span>
                        </div>

                        <div className="absolute bottom-0 inset-x-0 p-2 text-left z-10">
                            {photo.caption && (
                                <p className="text-[10px] font-semibold text-white line-clamp-1 drop-shadow-sm">
                                    {photo.caption}
                                </p>
                            )}
                            {photo.created_at && (
                                <p className="text-[9px] text-zinc-400">
                                    {new Date(photo.created_at).toLocaleDateString('pt-BR')}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Lightbox Modal */}
            {selectedPhoto && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <div
                        className="relative max-w-2xl w-full bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedPhoto(null)}
                            className="absolute top-4 right-4 z-20 w-9 h-9 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white rounded-full flex items-center justify-center transition-all"
                        >
                            <X size={16} />
                        </button>

                        <div className="bg-zinc-900 flex items-center justify-center p-4 max-h-[65vh] overflow-hidden">
                            <img
                                src={selectedPhoto.url}
                                alt={selectedPhoto.caption || 'Foto dos bastidores'}
                                className="max-h-[60vh] w-auto max-w-full object-contain rounded-xl"
                            />
                        </div>

                        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-950 border-t border-zinc-850">
                            <div>
                                {selectedPhoto.caption && (
                                    <h5 className="text-sm font-bold text-white mb-0.5">
                                        {selectedPhoto.caption}
                                    </h5>
                                )}
                                {selectedPhoto.created_at && (
                                    <p className="text-xs text-zinc-400">
                                        Registrado em {new Date(selectedPhoto.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                )}
                            </div>
                            <a
                                href={selectedPhoto.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs font-bold px-3.5 py-2 rounded-xl border border-zinc-700 transition-colors"
                            >
                                <ExternalLink size={13} />
                                Abrir Original
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CustomerDashboard() {
    const params = useParams();
    const router = useRouter();
    const identifier = params?.phone as string; // Pode ser telefone ou token
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pedidos' | 'wishlist'>('pedidos');
    const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
    const [clientProfileName, setClientProfileName] = useState<string>('');

    const { items: wishlistItems, removeFromWishlist, shareOnWhatsApp, syncWithPhone } = useWishlist();
    const { addToCart, setIsCartOpen } = useCart();

    const formatBRL = (val?: number) => {
        if (!val) return 'R$ 0,00';
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const isOrderCompleted = (status: string) => ['Concluída', 'Concluído', 'Entregue'].includes(status);

    const toggleOrderExpanded = (orderId: string | number) => {
        setExpandedOrders(prev => ({
            ...prev,
            [orderId]: !prev[orderId]
        }));
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            // Verifica se o identificador é um UUID ou telefone
            const isToken = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
            const queryParam = isToken ? `token=${identifier}` : `phone=${identifier}`;
            
            const res = await fetch(`/api/public/orders?${queryParam}`);
            const data = await res.json();
            const loadedOrders = data.items || [];
            setOrders(loadedOrders);

            // Se não tem pedidos em andamento, abre direto na aba de Favoritos!
            if (loadedOrders.length === 0) {
                setActiveTab('wishlist');
            }

            // Busca perfil do cliente para saudar pelo nome mesmo com 0 pedidos
            const profileParam = isToken ? `token=${identifier}` : `phone=${identifier}`;
            fetch(`/api/public/client/profile?${profileParam}`)
                .then(r => r.json())
                .then(d => {
                    if (d.client?.nome) {
                        setClientProfileName(d.client.nome);
                    }
                })
                .catch(e => console.error('Perfil client error:', e));

            // Sincroniza wishlist com o telefone do cliente se disponível
            const phone = !isToken ? identifier : loadedOrders[0]?.cliente_contato;
            if (phone) {
                syncWithPhone(phone);
            }
        } catch (err) {
            toast.error('Erro ao carregar seus pedidos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (identifier) fetchOrders();
    }, [identifier]);

    const activeOrders = useMemo(() => {
        return orders.filter(o => !isOrderCompleted(o.status) && o.status !== 'Cancelada');
    }, [orders]);

    const completedOrders = useMemo(() => {
        return orders.filter(o => isOrderCompleted(o.status) || o.status === 'Cancelada');
    }, [orders]);

    const clientName = clientProfileName || orders[0]?.cliente_nome || orders[0]?.nome_cliente || '';

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
                <Loader2 size={40} className="animate-spin text-orange-500" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Sincronizando com o Ateliê...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-10">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Header Nav */}
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => router.push('/rastreio')}
                        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest cursor-pointer"
                    >
                        <ArrowLeft size={16} />
                        Sair / Voltar
                    </button>
                    <div className="flex items-center gap-3">
                         <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full border border-white/5">
                            ACESSO PROTEGIDO
                         </span>
                         <button onClick={fetchOrders} className="p-2 text-zinc-500 hover:text-orange-500 transition-colors cursor-pointer" title="Recarregar">
                            <RefreshCw size={18} />
                         </button>
                    </div>
                </div>

                {/* Área do Cliente Header */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] bg-orange-500/10 border border-orange-500/20 px-3 py-0.5 rounded-full">
                            Painel Exclusivo
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter">
                        ÁREA DO <span className="text-orange-500">CLIENTE</span>
                    </h1>
                    <p className="text-zinc-400 text-sm font-medium">
                        {clientName ? `Olá, ${clientName}! ` : ''}Acompanhe a produção dos seus colecionáveis e gerencie seus Favoritos.
                    </p>
                </div>

                {/* Tabs Switcher */}
                <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
                    <button
                        type="button"
                        onClick={() => setActiveTab('pedidos')}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer touch-manipulation",
                            activeTab === 'pedidos'
                                ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20 scale-[1.02]"
                                : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800"
                        )}
                    >
                        <Package size={15} />
                        Meus Pedidos
                        <span className={clsx(
                            "ml-1 px-2 py-0.5 rounded-full text-[10px] font-black",
                            activeTab === 'pedidos' ? "bg-black/20 text-black" : "bg-zinc-800 text-zinc-300"
                        )}>
                            {orders.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('wishlist')}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer touch-manipulation",
                            activeTab === 'wishlist'
                                ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20 scale-[1.02]"
                                : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800"
                        )}
                    >
                        <Heart size={15} className={clsx(activeTab === 'wishlist' && "fill-black")} />
                        Favoritos
                        {wishlistItems.length > 0 && (
                            <span className={clsx(
                                "ml-1 px-2 py-0.5 rounded-full text-[10px] font-black",
                                activeTab === 'wishlist' ? "bg-black/20 text-black" : "bg-orange-500/20 text-orange-400"
                            )}>
                                {wishlistItems.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* TAB 1: MEUS PEDIDOS */}
                {activeTab === 'pedidos' && (
                    <div className="space-y-8">
                        {/* Pedidos Ativos em Produção */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                    <Clock size={14} className="text-orange-500" />
                                    Em Produção / Ativos ({activeOrders.length})
                                </h3>
                            </div>

                            {activeOrders.length === 0 ? (
                                <div className="bg-zinc-900/20 border border-dashed border-zinc-800/80 rounded-3xl p-10 text-center space-y-3">
                                    <Package size={36} className="mx-auto text-zinc-700" />
                                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">
                                        Nenhum pedido em produção no momento.
                                    </p>
                                    <Link href="/" className="inline-block text-orange-500 font-bold text-xs hover:underline">
                                        Explorar vitrine para encomendar
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {activeOrders.map((order) => (
                                        <div 
                                            key={order.id} 
                                            className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl transition-all hover:bg-zinc-900/60"
                                        >
                                            <div className="p-6 md:p-8 space-y-8">
                                                {/* Order Info Row */}
                                                <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                                                    <div className="flex gap-4 items-center">
                                                        <div className="w-16 h-16 rounded-2xl bg-black border border-zinc-800 overflow-hidden relative shadow-inner shrink-0">
                                                            {order.figura?.imagem ? (
                                                                <Image
                                                                    loader={imageKitLoader}
                                                                    src={order.figura.imagem}
                                                                    alt=""
                                                                    fill
                                                                    className="object-cover opacity-80"
                                                                    sizes="64px"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-zinc-800">
                                                                    <Package size={24} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-black text-white leading-none mb-1">{order.figura?.nome}</h3>
                                                            <div className="flex flex-wrap items-center gap-2.5 text-[10px] uppercase font-bold text-zinc-500 tracking-widest">
                                                                <span>{order.figura?.studio}</span>
                                                                <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                                                                <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(order.data).toLocaleDateString('pt-BR')}</span>
                                                                {(order.pintor_display || order.pintor_nome) && (
                                                                    <>
                                                                        <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                                                                        <span className="flex items-center gap-1 text-purple-400 font-black normal-case">
                                                                            <Paintbrush size={11} className="text-purple-400 shrink-0" />
                                                                            Artista: <strong className="text-purple-300 font-extrabold">{order.pintor_display || order.pintor_nome}</strong>
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <a 
                                                            href={`/verificar/${order.token}`}
                                                            target="_blank"
                                                            className="flex items-center gap-2 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] px-5 py-3 rounded-full hover:bg-emerald-500 hover:text-white transition-all shadow-xl active:scale-95"
                                                        >
                                                            <Award size={14} />
                                                            Visualizar Certificado
                                                        </a>
                                                    </div>
                                                </div>

                                                {/* The Visual Tracker */}
                                                <div className="pt-4 border-t border-zinc-800/50">
                                                    <OrderTracker 
                                                        status={order.status} 
                                                        checklist={order.checklist} 
                                                        pintorNome={order.pintor_display || order.pintor_nome}
                                                    />
                                                </div>

                                                {/* Fotos dos Bastidores / WIP se houver */}
                                                {order.wip_fotos && order.wip_fotos.length > 0 && (
                                                    <WipGalleryWidget photos={order.wip_fotos} />
                                                )}

                                                {/* Seção de Nota Fiscal (NF-e) emitida ou formulário de preenchimento */}
                                                {order.chave_nfe ? (
                                                    <NfeWidget order={order} />
                                                ) : (
                                                    <NfeDataFormWidget order={order} identifier={identifier} onSaved={fetchOrders} />
                                                )}

                                                {/* Seção de Pagamento PIX */}
                                                {((order.status_pagamento === 'Pendente' ||
                                                   order.status_pagamento === 'Pendente/Incompleto' || 
                                                   order.status_pagamento === 'Aguardando Pagamento' || 
                                                   order.status_pagamento === 'Parcial' ||
                                                   order.status === 'Aguardando Pagamento') && 
                                                  order.status !== 'Cancelada') && (
                                                    <PixPaymentWidget order={order} />
                                                )}

                                                {/* Gorjeta para os Artistas */}
                                                {order.status !== 'Cancelada' && (
                                                    <ArtistTipWidget order={order} />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Pedidos Concluídos Colapsados por Padrão */}
                        {completedOrders.length > 0 && (
                            <div className="space-y-4 pt-4 border-t border-zinc-850">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                        Pedidos Concluídos / Histórico ({completedOrders.length})
                                    </h3>
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                        Colapsados
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {completedOrders.map((order) => {
                                        const isExpanded = !!expandedOrders[order.id];
                                        const isCanceled = order.status === 'Cancelada';

                                        return (
                                            <div 
                                                key={order.id}
                                                className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-lg transition-all"
                                            >
                                                {/* Summary Header (Collapsed Row) */}
                                                <div 
                                                    onClick={() => toggleOrderExpanded(order.id)}
                                                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-zinc-900/40 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3.5 min-w-0">
                                                        <div className="w-12 h-12 rounded-xl bg-black border border-zinc-800 overflow-hidden relative shadow-inner shrink-0">
                                                            {order.figura?.imagem ? (
                                                                <Image
                                                                    loader={imageKitLoader}
                                                                    src={order.figura.imagem}
                                                                    alt=""
                                                                    fill
                                                                    className="object-cover opacity-80"
                                                                    sizes="48px"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-zinc-800">
                                                                    <Package size={20} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <h4 className="text-sm font-black text-white truncate">{order.figura?.nome}</h4>
                                                                <span className={clsx(
                                                                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider shrink-0",
                                                                    isCanceled 
                                                                        ? "bg-zinc-800 text-zinc-400 border border-zinc-700" 
                                                                        : "bg-emerald-950/50 text-emerald-400 border border-emerald-500/30"
                                                                )}>
                                                                    {order.status}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-2">
                                                                <span>{order.figura?.studio || 'Studio Indiferente'}</span>
                                                                <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                                                                <span>{new Date(order.data).toLocaleDateString('pt-BR')}</span>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                                        {order.token && !isCanceled && (
                                                            <a
                                                                href={`/verificar/${order.token}`}
                                                                target="_blank"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-emerald-950/60 text-zinc-300 hover:text-emerald-400 border border-zinc-700 transition-colors"
                                                            >
                                                                <Award size={12} />
                                                                Certificado
                                                            </a>
                                                        )}

                                                        <button
                                                            type="button"
                                                            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 transition-colors"
                                                        >
                                                            <span>{isExpanded ? 'Ocultar' : 'Detalhes'}</span>
                                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Expanded Body */}
                                                {isExpanded && (
                                                    <div className="p-6 border-t border-zinc-800/80 bg-zinc-900/30 space-y-6">
                                                        <div className="pt-2">
                                                            <OrderTracker 
                                                                status={order.status} 
                                                                checklist={order.checklist} 
                                                                pintorNome={order.pintor_display || order.pintor_nome}
                                                            />
                                                        </div>

                                                        {order.wip_fotos && order.wip_fotos.length > 0 && (
                                                            <WipGalleryWidget photos={order.wip_fotos} />
                                                        )}

                                                        {order.chave_nfe && (
                                                            <NfeWidget order={order} />
                                                        )}

                                                        {!isCanceled && (
                                                            <ArtistTipWidget order={order} />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: FAVORITOS */}
                {activeTab === 'wishlist' && (
                    <div className="space-y-6">
                        {/* Wishlist Header & Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950/80 border border-zinc-800 rounded-3xl p-6">
                            <div className="space-y-1">
                                <h3 className="text-base font-black text-white flex items-center gap-2">
                                    <Heart size={18} className="fill-orange-500 text-orange-500" />
                                    Favoritos Sincronizados
                                </h3>
                                <p className="text-xs text-zinc-400">
                                    {wishlistItems.length} peça(s) salva(s) vinculada(s) ao seu número.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={shareOnWhatsApp}
                                    disabled={wishlistItems.length === 0}
                                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-40 cursor-pointer"
                                >
                                    <Share2 size={14} />
                                    Enviar no WhatsApp
                                </button>
                                <Link
                                    href="/"
                                    className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl border border-zinc-700 transition-all cursor-pointer"
                                >
                                    Explorar Catálogo
                                    <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>

                        {/* Wishlist Items List / Grid */}
                        {wishlistItems.length === 0 ? (
                            <div className="bg-zinc-900/20 border-2 border-dashed border-zinc-800 rounded-3xl p-16 text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mx-auto">
                                    <Heart size={28} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-black uppercase tracking-wider text-zinc-300">
                                        Sua Lista de Favoritos está Vazia
                                    </h4>
                                    <p className="text-xs text-zinc-500 max-w-md mx-auto">
                                        Navegue pelo nosso catálogo e clique no ícone de coração nos cards para salvar suas figuras favoritas na sua lista.
                                    </p>
                                </div>
                                <Link
                                    href="/"
                                    className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-black text-xs font-black uppercase tracking-widest px-6 py-3 rounded-full transition-all shadow-lg active:scale-95"
                                >
                                    Ver Vitrine de Figuras
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                {wishlistItems.map((item) => {
                                    const pixPrice = item.precos?.pix_colorido || item.precos?.pix_estilizado;
                                    const cardPrice = item.preco || item.precos?.colorido || item.precos?.estilizado || 0;

                                    return (
                                        <div
                                            key={item.id}
                                            className="bg-zinc-950/80 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl flex flex-col group hover:border-orange-500/30 transition-all"
                                        >
                                            {/* Image with Direct Link */}
                                            <div className="relative aspect-[4/5] bg-[#09090b] overflow-hidden">
                                                <Link href={`/figura/${item.slug || item.id}?ref=wishlist`} className="absolute inset-0 z-10" />
                                                {item.imagem_url ? (
                                                    <Image
                                                        loader={imageKitLoader}
                                                        src={item.imagem_url}
                                                        alt={item.nome}
                                                        fill
                                                        className="object-contain p-3 group-hover:scale-105 transition-transform duration-500"
                                                        sizes="(max-width: 768px) 100vw, 33vw"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-zinc-800">
                                                        <Package size={32} />
                                                    </div>
                                                )}

                                                {/* Remove Heart Button (Top Right) */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        removeFromWishlist(item.id);
                                                    }}
                                                    className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/70 backdrop-blur-md border border-white/20 hover:border-red-500/50 flex items-center justify-center text-red-400 hover:text-red-300 transition-all cursor-pointer shadow-lg"
                                                    title="Remover dos Favoritos"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>

                                            {/* Details & Actions */}
                                            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3 bg-zinc-900/30">
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5 truncate">
                                                        {item.studio || 'Studio Indiferente'}
                                                    </p>
                                                    <h4 className="text-sm font-black text-white line-clamp-1 leading-snug">
                                                        {item.nome}
                                                    </h4>
                                                    <div className="mt-2 flex items-baseline gap-2">
                                                        <span className="text-sm font-black text-orange-400">
                                                            {formatBRL(cardPrice)}
                                                        </span>
                                                        {pixPrice && (
                                                            <span className="text-[10px] font-bold text-emerald-400">
                                                                PIX: {formatBRL(pixPrice)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/60">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            addToCart(
                                                                {
                                                                    id: item.id,
                                                                    nome: item.nome,
                                                                    imagem_url: item.imagem_url,
                                                                    codigo: item.codigo,
                                                                    precos: item.precos,
                                                                    serie: item.serie,
                                                                    studio: item.studio,
                                                                    slug: item.slug
                                                                } as any,
                                                                'colorido'
                                                            );
                                                            setIsCartOpen(true);
                                                        }}
                                                        className="flex-1 bg-orange-500 hover:bg-orange-400 text-black text-[10px] font-black uppercase tracking-wider py-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                                                    >
                                                        <ShoppingBag size={13} />
                                                        Mover p/ Carrinho
                                                    </button>
                                                    <Link
                                                        href={`/figura/${item.slug || item.id}?ref=wishlist`}
                                                        className="px-3 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider border border-zinc-700 transition-colors"
                                                    >
                                                        Ver
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Help Section */}
                <div className="bg-orange-500/5 border border-orange-500/10 rounded-3xl p-6 text-center">
                    <p className="text-zinc-500 text-xs font-medium">
                        Dúvidas sobre seu pedido, envio ou customizações? 
                        <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ''}`} className="text-orange-500 font-bold ml-1 hover:underline">Fale com o Ateliê no WhatsApp</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
