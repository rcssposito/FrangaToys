'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export interface WishlistItem {
    id: number;
    nome: string;
    imagem_url?: string | null;
    codigo?: string | null;
    preco?: number | null;
    precos?: {
        colorido?: number;
        estilizado?: number;
        pix_colorido?: number;
        pix_estilizado?: number;
    } | null;
    serie?: string | null;
    studio?: string | null;
    slug?: string | null;
    is_campanha?: boolean;
}

interface WishlistContextType {
    wishlistIds: number[];
    items: WishlistItem[];
    isInWishlist: (id: number) => boolean;
    toggleWishlist: (figure: WishlistItem | number) => void;
    removeFromWishlist: (id: number) => void;
    clearWishlist: () => void;
    wishlistCount: number;
    isWishlistOpen: boolean;
    setIsWishlistOpen: (open: boolean) => void;
    isAuthModalOpen: boolean;
    openAuthModal: () => void;
    closeAuthModal: () => void;
    savedPhone: string | null;
    savedNome: string | null;
    identifyClient: (nome: string, telefone: string) => Promise<void>;
    logoutClient: () => void;
    syncWithPhone: (phone: string) => Promise<void>;
    getShareableLink: () => string;
    shareOnWhatsApp: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
    const [wishlistIds, setWishlistIds] = useState<number[]>([]);
    const [items, setItems] = useState<WishlistItem[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isWishlistOpen, setIsWishlistOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [savedPhone, setSavedPhone] = useState<string | null>(null);
    const [savedNome, setSavedNome] = useState<string | null>(null);

    // Refs para evitar loops de render e concorrência na sincronização
    const wishlistIdsRef = useRef<number[]>([]);
    wishlistIdsRef.current = wishlistIds;
    const isSyncingRef = useRef(false);
    const lastSyncedSignatureRef = useRef<string>('');

    // 1. Carrega do LocalStorage na montagem (incluindo dados de identificação)
    useEffect(() => {
        try {
            const savedIds = localStorage.getItem('franga_wishlist_ids');
            const savedItems = localStorage.getItem('franga_wishlist_items');
            const phone = localStorage.getItem('frangatoys_tracking_phone');
            const nome = localStorage.getItem('frangatoys_client_nome');
            
            if (phone) setSavedPhone(phone);
            if (nome) setSavedNome(nome);

            if (savedIds) {
                const parsedIds = JSON.parse(savedIds);
                if (Array.isArray(parsedIds)) setWishlistIds(parsedIds);
            }
            if (savedItems) {
                const parsedItems = JSON.parse(savedItems);
                if (Array.isArray(parsedItems)) setItems(parsedItems);
            }
        } catch (e) {
            console.error('Falha ao carregar wishlist do localStorage', e);
        } finally {
            setIsInitialized(true);
        }
    }, []);

    // 1b. Detecção de Coleção Compartilhada via link (?wishlist=1,2,3)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const urlParams = new URLSearchParams(window.location.search);
        const sharedWishlist = urlParams.get('wishlist');
        if (sharedWishlist) {
            const ids = sharedWishlist.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id) && id > 0);
            if (ids.length > 0) {
                setWishlistIds(prev => Array.from(new Set([...prev, ...ids])));
                setIsWishlistOpen(true);
                toast.success('Lista de Favoritos carregada! 🎁', {
                    description: 'As peças compartilhadas foram carregadas com sucesso na sua lista.'
                });
            }
        }
    }, []);

    // 2. Salva no LocalStorage
    useEffect(() => {
        if (!isInitialized) return;
        try {
            localStorage.setItem('franga_wishlist_ids', JSON.stringify(wishlistIds));
            localStorage.setItem('franga_wishlist_items', JSON.stringify(items));
        } catch (e) {
            console.error('Falha ao salvar wishlist no localStorage', e);
        }
    }, [wishlistIds, items, isInitialized]);

    // 3. Sincronização automática com banco (estável, sem loop de dependência)
    const syncWithPhone = useCallback(async (phone: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 8) return;

        // Evita chamadas simultâneas
        if (isSyncingRef.current) return;

        const currentIds = wishlistIdsRef.current;
        const signature = `${cleanPhone}:${[...currentIds].sort((a, b) => a - b).join(',')}`;

        // Se já sincronizou exatamente este telefone com este conjunto de IDs, não dispara requisição
        if (lastSyncedSignatureRef.current === signature) {
            return;
        }

        isSyncingRef.current = true;
        try {
            const res = await fetch('/api/public/wishlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: cleanPhone, wishlistIds: currentIds })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.wishlist && Array.isArray(data.wishlist)) {
                    lastSyncedSignatureRef.current = `${cleanPhone}:${[...data.wishlist].sort((a, b) => a - b).join(',')}`;
                    
                    setWishlistIds(prev => {
                        const merged = Array.from(new Set([...prev, ...data.wishlist]));
                        // Crucial: se os IDs forem exatamente os mesmos, retorna prev (mantém a mesma referência e não dispara re-render)
                        if (merged.length === prev.length && merged.every(id => prev.includes(id))) {
                            return prev;
                        }
                        return merged;
                    });
                } else {
                    lastSyncedSignatureRef.current = signature;
                }
            }
        } catch (err) {
            console.error('Erro na sincronização de wishlist com telefone:', err);
        } finally {
            isSyncingRef.current = false;
        }
    }, []);

    // Auto-sync debounce se houver telefone salvo do rastreio
    useEffect(() => {
        if (!isInitialized) return;
        const savedPhone = typeof window !== 'undefined' ? localStorage.getItem('frangatoys_tracking_phone') : null;
        if (savedPhone && wishlistIds.length > 0) {
            const timer = setTimeout(() => {
                syncWithPhone(savedPhone);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isInitialized, wishlistIds, syncWithPhone]);

    const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
    const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

    const identifyClient = useCallback(async (nome: string, telefone: string) => {
        const cleanPhone = telefone.replace(/\D/g, '');
        const cleanName = nome.trim();
        const visitorId = typeof window !== 'undefined' ? localStorage.getItem('franga_visitor_id') : null;

        const res = await fetch('/api/public/client/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: cleanName,
                telefone: cleanPhone,
                wishlist: wishlistIdsRef.current,
                visitorId: visitorId || undefined
            })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Erro ao salvar cadastro');
        }

        const clientObj = data.cliente || data.client;
        const finalNome = clientObj?.nome || cleanName;
        const clienteId = clientObj?.id;

        localStorage.setItem('frangatoys_tracking_phone', cleanPhone);
        localStorage.setItem('frangatoys_client_nome', finalNome);
        if (clienteId) {
            localStorage.setItem('franga_cliente_id', String(clienteId));
        }

        setSavedPhone(cleanPhone);
        setSavedNome(finalNome);

        // Dispara ping de beacon em background para atualizar o Radar do CRM imediatamente
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

        await syncWithPhone(cleanPhone);
    }, [syncWithPhone]);

    const isInWishlist = useCallback((id: number) => {
        return wishlistIds.includes(id);
    }, [wishlistIds]);

    const toggleWishlist = (figure: WishlistItem | number) => {
        const id = typeof figure === 'number' ? figure : figure.id;
        const exists = wishlistIds.includes(id);

        if (exists) {
            setWishlistIds(prev => prev.filter(item => item !== id));
            setItems(prev => prev.filter(item => item.id !== id));
            toast.info('Removido da Lista de Desejos');
        } else {
            const nextIds = [...wishlistIds, id];
            setWishlistIds(nextIds);
            if (typeof figure !== 'number') {
                setItems(prev => {
                    if (prev.some(i => i.id === id)) return prev;
                    return [...prev, figure];
                });
            }
            toast.success('Adicionado à sua Lista de Desejos! ❤️');

            // Se o usuário ainda não tiver telefone salvo, dispara o modal de identificação
            const hasPhone = savedPhone || (typeof window !== 'undefined' ? localStorage.getItem('frangatoys_tracking_phone') : null);
            if (!hasPhone) {
                setIsAuthModalOpen(true);
            }
        }
    };

    const removeFromWishlist = (id: number) => {
        setWishlistIds(prev => prev.filter(item => item !== id));
        setItems(prev => prev.filter(item => item.id !== id));
        toast.info('Item removido dos favoritos');
    };

    const clearWishlist = () => {
        setWishlistIds([]);
        setItems([]);
    };

    const getShareableLink = () => {
        if (typeof window === 'undefined') return '';
        const origin = window.location.origin;
        return `${origin}?wishlist=${wishlistIds.join(',')}`;
    };

    const shareOnWhatsApp = () => {
        if (wishlistIds.length === 0) {
            toast.error('Sua lista de desejos está vazia!');
            return;
        }

        const link = getShareableLink();
        const text = encodeURIComponent(
            `Olha só as figures que eu salvei nos meus Favoritos na Franga Toys! 🎨✨\n\nDá uma olhada aqui:\n${link}`
        );
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    };

    const logoutClient = useCallback(() => {
        try {
            localStorage.removeItem('frangatoys_tracking_phone');
            localStorage.removeItem('frangatoys_client_nome');
            localStorage.removeItem('franga_cliente_id');
            setSavedPhone(null);
            setSavedNome(null);
            toast.info('Sessão desconectada.');
        } catch (e) {
            console.error('Erro ao sair', e);
        }
    }, []);

    return (
        <WishlistContext.Provider
            value={{
                wishlistIds,
                items,
                isInWishlist,
                toggleWishlist,
                removeFromWishlist,
                clearWishlist,
                wishlistCount: wishlistIds.length,
                isWishlistOpen,
                setIsWishlistOpen,
                isAuthModalOpen,
                openAuthModal,
                closeAuthModal,
                savedPhone,
                savedNome,
                identifyClient,
                logoutClient,
                syncWithPhone,
                getShareableLink,
                shareOnWhatsApp
            }}
        >
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlist() {
    const context = useContext(WishlistContext);
    if (!context) {
        throw new Error('useWishlist deve ser usado dentro de um WishlistProvider');
    }
    return context;
}
