'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Trash2, Heart, ShoppingBag, ArrowRight, Share2, Sparkles, AlertCircle, Cloud, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import imageKitLoader from '@/lib/image-loader';
import { useWishlist, WishlistItem } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import Link from 'next/link';

export function WishlistDrawer() {
    const {
        wishlistIds,
        items,
        isWishlistOpen,
        setIsWishlistOpen,
        removeFromWishlist,
        clearWishlist,
        shareOnWhatsApp,
        getShareableLink,
        syncWithPhone
    } = useWishlist();

    const { addToCart, isInCart, setIsCartOpen } = useCart();
    const [detailedItems, setDetailedItems] = useState<WishlistItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [savedPhone, setSavedPhone] = useState<string | null>(null);
    const [savedNome, setSavedNome] = useState<string | null>(null);
    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [regNome, setRegNome] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);

    // Fecha ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
                setIsWishlistOpen(false);
            }
        };

        if (isWishlistOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = '';
        };
    }, [isWishlistOpen, setIsWishlistOpen]);

    // Se houver IDs no wishlist mas os itens locais estiverem desatualizados ou vazios, sincroniza com a API
    useEffect(() => {
        if (!isWishlistOpen || wishlistIds.length === 0) return;

        const needsFetch = wishlistIds.some(id => !items.find(i => i.id === id));
        if (needsFetch) {
            setIsLoading(true);
            fetch(`/api/public/wishlist?ids=${wishlistIds.join(',')}`)
                .then(res => res.json())
                .then(data => {
                    if (data.items) {
                        setDetailedItems(data.items);
                    }
                })
                .catch(err => console.error('Erro ao buscar detalhes da wishlist:', err))
                .finally(() => setIsLoading(false));
        } else {
            setDetailedItems(items);
        }
    }, [isWishlistOpen, wishlistIds, items]);

    const activeList = detailedItems.length > 0 ? detailedItems : items;

    // Cálculo do total estimado da coleção
    const totalPix = activeList.reduce((acc, item) => {
        const pix = item.precos?.pix_colorido || item.preco || 0;
        return acc + pix;
    }, 0);

    const handleMoveToCart = (item: WishlistItem) => {
        addToCart(item as any, 'colorido');
        removeFromWishlist(item.id);
        setIsWishlistOpen(false);
        setIsCartOpen(true);
    };

    const handleMoveAllToCart = () => {
        if (activeList.length === 0) return;
        let addedCount = 0;

        activeList.forEach(item => {
            if (!isInCart(item.id)) {
                addToCart(item as any, 'colorido');
                addedCount++;
            }
        });

        clearWishlist();
        setIsWishlistOpen(false);
        setIsCartOpen(true);

        if (addedCount > 0) {
            toast.success(`${addedCount} peças movidas para o seu carrinho!`);
        } else {
            toast.info('As peças selecionadas já estavam no seu carrinho.');
        }
    };

    const copyLink = () => {
        const link = getShareableLink();
        if (!link) return;
        navigator.clipboard.writeText(link);
        toast.success('Link da sua Coleção copiado!');
    };

    // Leitura do telefone/nome salvo no localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const sp = localStorage.getItem('frangatoys_tracking_phone');
            const sn = localStorage.getItem('frangatoys_client_nome');
            setSavedPhone(sp);
            setSavedNome(sn);
        }
    }, [isWishlistOpen]);

    const formatPhone = (val: string) => {
        const digits = val.replace(/\D/g, '');
        if (digits.length <= 11) {
            return digits
                .replace(/^(\d{2})(\d)/g, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1-$2')
                .substring(0, 15);
        }
        return val.substring(0, 15);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanPhone = regPhone.replace(/\D/g, '');
        if (!regNome.trim()) {
            toast.error('Informe seu nome ou apelido');
            return;
        }
        if (cleanPhone.length < 10) {
            toast.error('Informe um WhatsApp válido com DDD');
            return;
        }

        setIsRegistering(true);
        try {
            const visitorId = typeof window !== 'undefined' ? localStorage.getItem('franga_visitor_id') : null;
            const res = await fetch('/api/public/client/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: regNome.trim(),
                    telefone: cleanPhone,
                    wishlist: wishlistIds,
                    visitorId: visitorId || undefined
                })
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Erro ao salvar cadastro');
                return;
            }

            const clientObj = data.cliente || data.client;
            const finalNome = clientObj?.nome || regNome.trim();
            const clienteId = clientObj?.id;

            localStorage.setItem('frangatoys_tracking_phone', cleanPhone);
            localStorage.setItem('frangatoys_client_nome', finalNome);
            if (clienteId) {
                localStorage.setItem('franga_cliente_id', String(clienteId));
            }

            setSavedPhone(cleanPhone);
            setSavedNome(finalNome);
            setShowRegisterForm(false);

            if (typeof window !== 'undefined' && clienteId) {
                try {
                    fetch('/api/analytics/beacon', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            visitorId: visitorId || '',
                            clienteId: String(clienteId),
                            pathname: window.location.pathname
                        }),
                        keepalive: true
                    }).catch(() => {});
                } catch {}
            }

            syncWithPhone(cleanPhone);

            toast.success('Favoritos salvos com sucesso! 🎉', {
                description: 'Agora seus favoritos estão sincronizados na sua Área do Cliente.'
            });
        } catch (err) {
            console.error('Erro ao registrar cliente:', err);
            toast.error('Erro de conexão ao salvar');
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <AnimatePresence>
            {isWishlistOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setIsWishlistOpen(false)}
                    />

                    {/* Drawer Painel */}
                    <motion.div
                        ref={drawerRef}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="absolute inset-y-0 right-0 max-w-full flex pl-10"
                    >
                        <div className="w-screen max-w-md bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl text-white">
                            
                            {/* Header */}
                            <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                                        <Heart size={20} className="fill-orange-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                                            Favoritos
                                        </h2>
                                        <p className="text-xs text-zinc-400 font-medium">
                                            {wishlistIds.length} {wishlistIds.length === 1 ? 'peça desejada' : 'peças desejadas'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsWishlistOpen(false)}
                                    className="p-2 text-zinc-500 hover:text-white rounded-xl hover:bg-zinc-900 transition-colors cursor-pointer"
                                    title="Fechar"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {wishlistIds.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                                        <div className="w-20 h-20 rounded-3xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-center text-zinc-700">
                                            <Heart size={36} className="text-zinc-600" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="font-bold text-zinc-300 text-sm">Sua lista está vazia</h3>
                                            <p className="text-xs text-zinc-500 max-w-xs">
                                                Navegue pelo catálogo e clique no coração das peças que você sonha em ter na sua estante!
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setIsWishlistOpen(false)}
                                            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-95 cursor-pointer"
                                        >
                                            Explorar Figuras
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Card de Identificação / Sincronização WhatsApp */}
                                        {savedPhone ? (
                                            <div className="bg-emerald-950/25 border border-emerald-500/25 rounded-2xl p-3 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                                                        <Cloud size={16} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold text-zinc-200 truncate flex items-center gap-1.5">
                                                            <span>{savedNome || 'Cliente'}</span>
                                                            <span className="text-[10px] text-emerald-400 font-semibold">• Salvo</span>
                                                        </div>
                                                        <div className="text-[10px] text-zinc-400 truncate">
                                                            Favoritos sincronizados
                                                        </div>
                                                    </div>
                                                </div>
                                                <Link
                                                    href={`/rastreio/${savedPhone}`}
                                                    onClick={() => setIsWishlistOpen(false)}
                                                    className="text-[11px] font-black text-orange-400 hover:text-orange-300 flex items-center gap-1 shrink-0 transition-colors"
                                                >
                                                    <span>Área do Cliente</span>
                                                    <ArrowRight size={12} />
                                                </Link>
                                            </div>
                                        ) : (
                                            <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/90 border border-orange-500/20 rounded-2xl p-3.5 space-y-2.5">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                                                            <Sparkles size={14} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-black text-white">Salvar lista no WhatsApp</h4>
                                                            <p className="text-[10px] text-zinc-400">
                                                                Acesse em qualquer lugar e tenha sua Área do Cliente
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowRegisterForm(prev => !prev)}
                                                        className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-black text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shrink-0 cursor-pointer"
                                                    >
                                                        {showRegisterForm ? 'Fechar' : 'Salvar'}
                                                    </button>
                                                </div>

                                                {showRegisterForm && (
                                                    <form
                                                        onSubmit={handleRegister}
                                                        className="space-y-2 pt-2 border-t border-zinc-800"
                                                    >
                                                        <div>
                                                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                                                                Como podemos te chamar?
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={regNome}
                                                                onChange={e => setRegNome(e.target.value)}
                                                                placeholder="Ex: Pedro Henrique"
                                                                required
                                                                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                                                                WhatsApp (com DDD)
                                                            </label>
                                                            <input
                                                                type="tel"
                                                                value={regPhone}
                                                                onChange={e => setRegPhone(formatPhone(e.target.value))}
                                                                placeholder="(11) 99999-9999"
                                                                required
                                                                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                                                            />
                                                        </div>
                                                        <button
                                                            type="submit"
                                                            disabled={isRegistering}
                                                            className="w-full py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-orange-500/20 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                                                        >
                                                            {isRegistering ? (
                                                                <span>Salvando...</span>
                                                            ) : (
                                                                <>
                                                                    <CheckCircle2 size={13} />
                                                                    <span>Salvar Favoritos</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </form>
                                                )}
                                            </div>
                                        )}

                                        {/* Barra de Ação Rápida de Compartilhamento */}
                                        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                                            <div className="text-[11px] text-zinc-400">
                                                <span className="font-bold text-zinc-200">Envie de presente ou indireta:</span> compartilhe sua lista completa!
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    onClick={copyLink}
                                                    className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs transition-colors"
                                                    title="Copiar Link"
                                                >
                                                    <Share2 size={13} />
                                                </button>
                                                <button
                                                    onClick={shareOnWhatsApp}
                                                    className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                                                >
                                                    WhatsApp
                                                </button>
                                            </div>
                                        </div>

                                        {/* Lista de Figuras */}
                                        <div className="space-y-3">
                                            {activeList.map(item => {
                                                const inCart = isInCart(item.id);
                                                const precoPix = item.precos?.pix_colorido || item.preco || 0;

                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3.5 flex gap-3.5 relative group hover:border-orange-500/30 transition-all"
                                                    >
                                                        {/* Imagem */}
                                                        <div className="w-20 h-20 bg-black border border-zinc-800/80 rounded-xl overflow-hidden relative shrink-0">
                                                            {item.imagem_url ? (
                                                                <Image
                                                                    loader={imageKitLoader}
                                                                    src={item.imagem_url}
                                                                    alt={item.nome}
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="80px"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs font-bold">
                                                                    3D
                                                                </div>
                                                            )}
                                                            {item.is_campanha && (
                                                                <span className="absolute top-1 left-1 bg-purple-600 text-[8px] font-black text-white px-1.5 py-0.5 rounded shadow">
                                                                    OFERTA
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                            <div>
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <h4 className="font-bold text-xs text-white truncate" title={item.nome}>
                                                                        {item.nome}
                                                                    </h4>
                                                                    <button
                                                                        onClick={() => removeFromWishlist(item.id)}
                                                                        className="text-zinc-600 hover:text-red-400 p-1 transition-colors"
                                                                        title="Remover"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                                <div className="text-[10px] text-zinc-500 truncate">
                                                                    {item.serie && <span>{item.serie}</span>}
                                                                    {item.studio && <span> • {item.studio}</span>}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-end justify-between gap-2 mt-2">
                                                                <div>
                                                                    <div className="text-xs font-black text-emerald-400">
                                                                        R$ {precoPix.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </div>
                                                                    <span className="text-[9px] text-zinc-500 font-medium">no PIX</span>
                                                                </div>

                                                                <button
                                                                    onClick={() => handleMoveToCart(item)}
                                                                    disabled={inCart}
                                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                                                                        inCart
                                                                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                                                            : 'bg-orange-500 hover:bg-orange-600 text-black shadow-md shadow-orange-500/10 active:scale-95 cursor-pointer'
                                                                    }`}
                                                                >
                                                                    <ShoppingBag size={11} />
                                                                    {inCart ? 'No Carrinho' : 'Comprar'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            {wishlistIds.length > 0 && (
                                <div className="p-6 border-t border-zinc-800/80 bg-zinc-950 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                                            Total Estimado ({wishlistIds.length} {wishlistIds.length === 1 ? 'peça' : 'peças'}):
                                        </span>
                                        <div className="text-right">
                                            <div className="text-base font-black text-emerald-400">
                                                R$ {totalPix.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <div className="text-[9px] text-zinc-500">Valor no PIX</div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleMoveAllToCart}
                                        className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <ShoppingBag size={16} />
                                        Mover Todas para o Carrinho
                                    </button>
                                </div>
                            )}

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
