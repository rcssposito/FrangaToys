'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Users, 
    Search, 
    ShoppingBag, 
    DollarSign, 
    Calendar, 
    ArrowRight, 
    MessageCircle, 
    Instagram as InstagramIcon,
    Loader2, 
    UserPlus, 
    Filter, 
    TrendingUp, 
    Clock, 
    Award, 
    Edit2, 
    X as CloseIcon, 
    Save, 
    Copy, 
    Check, 
    Gift, 
    Wand2, 
    Trash2, 
    Download,
    Tag,
    Mail,
    Send,
    Play,
    Pause,
    RefreshCw,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    Plus,
    ExternalLink,
    Radio,
    Globe,
    Smartphone,
    Monitor,
    Compass,
    Eye,
    MapPin,
    Flame,
    FileText,
    MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/usePermission';

export const DEFAULT_SUGGESTED_TAGS = [
    'VIP',
    'Colecionador Anime',
    'Gamer',
    'Lead Quente',
    'Inativo',
    'Comprador Recorrente',
    'Atacado'
];

export const getTagBadgeStyle = (tag: string) => {
    const lower = (tag || '').toLowerCase();
    if (lower.includes('vip')) return 'bg-amber-500/15 border-amber-500/40 text-amber-400';
    if (lower.includes('anime')) return 'bg-pink-500/15 border-pink-500/40 text-pink-400';
    if (lower.includes('game') || lower.includes('gamer')) return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400';
    if (lower.includes('lead') || lower.includes('quente')) return 'bg-orange-500/15 border-orange-500/40 text-orange-400';
    if (lower.includes('inativo')) return 'bg-zinc-700/30 border-zinc-600/40 text-zinc-400';
    if (lower.includes('atacado')) return 'bg-purple-500/15 border-purple-500/40 text-purple-400';
    if (lower.includes('recorrente')) return 'bg-blue-500/15 border-blue-500/40 text-blue-400';
    return 'bg-sky-500/15 border-sky-500/40 text-sky-400';
};

interface Customer {
    id: string;
    nome: string;
    telefone: string;
    email?: string;
    tags?: string[];
    instagram?: string;
    notas?: string;
    data_cadastro: string;
    total_pedidos?: number;
    total_gasto?: number;
    ultima_venda_em?: string;
    ultimo_acesso_em?: string;
    total_acessos?: number;
    cidade_ultimo_acesso?: string;
    uf_ultimo_acesso?: string;
    cpf?: string;
    cep?: string;
    logradouro?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
}

interface Cadencia {
    id: string;
    nome: string;
    descricao?: string;
    target_tags: string[];
    status: 'rascunho' | 'ativa' | 'pausada' | 'concluida';
    tipo_canal: 'email' | 'sistema' | 'misto';
    cupom_codigo?: string;
    desconto_percentual?: number;
    assunto_email?: string;
    conteudo_email?: string;
    total_impactados: number;
    total_enviados: number;
    total_convertidos: number;
    created_at: string;
}

export default function CustomersPage() {
    const { hasRole } = usePermission();
    const router = useRouter();

    // Mode Switcher (Clientes vs Cadências vs Telemetria)
    const [viewMode, setViewMode] = useState<'clientes' | 'cadencias' | 'telemetria'>('clientes');

    // Radar de Acessos (Telemetria Beacon)
    const [telemetriaLogs, setTelemetriaLogs] = useState<any[]>([]);
    const [loadingTelemetria, setLoadingTelemetria] = useState(false);

    const fetchTelemetria = async () => {
        try {
            setLoadingTelemetria(true);
            const res = await fetch('/api/admin/crm/acessos?limit=50');
            if (res.ok) {
                const data = await res.json();
                setTelemetriaLogs(data);
            }
        } catch (e) {
            console.error('Erro ao buscar telemetria:', e);
            toast.error('Erro ao carregar radar de acessos');
        } finally {
            setLoadingTelemetria(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'telemetria') {
            fetchTelemetria();
        }
    }, [viewMode]);

    // Clientes State
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'leads_quentes' | 'vips' | 'inactives' | 'new'>('all');
    const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const [newTagInput, setNewTagInput] = useState('');

    // WhatsApp CRM State & Templates
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
    const [whatsAppCustomer, setWhatsAppCustomer] = useState<Customer | null>(null);
    const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('oferta');
    const [whatsAppText, setWhatsAppText] = useState<string>('');

    const openWhatsAppModal = (customer: Customer) => {
        setWhatsAppCustomer(customer);
        const primeiroNome = customer.nome ? customer.nome.split(' ')[0] : 'Colecionador';
        setSelectedTemplateKey('oferta');
        setWhatsAppText(`Fala ${primeiroNome}, tudo bem? Separei um presente exclusivo para você na Franga Toys: use o cupom FRANGAPICKS15 para garantir 15% OFF na sua próxima figure sob encomenda!\n\nDá uma olhada no catálogo da oficina: https://frangatoys.com.br/?cupom=FRANGAPICKS15&crm_c=${customer.id}`);
        setIsWhatsAppModalOpen(true);
    };

    const handleSelectTemplate = (key: string) => {
        if (!whatsAppCustomer) return;
        setSelectedTemplateKey(key);
        const primeiroNome = whatsAppCustomer.nome ? whatsAppCustomer.nome.split(' ')[0] : 'Colecionador';
        
        if (key === 'oferta') {
            setWhatsAppText(`Fala ${primeiroNome}, tudo bem? Separei um presente exclusivo para você na Franga Toys: use o cupom FRANGAPICKS15 para garantir 15% OFF na sua próxima figure sob encomenda!\n\nDá uma olhada no catálogo da oficina: https://frangatoys.com.br/?cupom=FRANGAPICKS15&crm_c=${whatsAppCustomer.id}`);
        } else if (key === 'interesse') {
            const loc = whatsAppCustomer.cidade_ultimo_acesso ? ` para envio até ${whatsAppCustomer.cidade_ultimo_acesso}` : '';
            setWhatsAppText(`Fala ${primeiroNome}, beleza? Vi seu interesse em nossas peças sob encomenda. Temos vagas abertas para pintura manual na oficina neste mês${loc}! Bora produzir seu colecionável?`);
        } else if (key === 'pos_venda') {
            setWhatsAppText(`Oi ${primeiroNome}, tudo bem? Passando para saber como está sua coleção e seu colecionável da Franga Toys! Qualquer dúvida sobre novas encomendas ou projetos especiais, é só me chamar por aqui.`);
        } else if (key === 'livre') {
            setWhatsAppText(`Olá, ${primeiroNome}!`);
        }
    };

    const handleSendWhatsAppMessage = () => {
        if (!whatsAppCustomer || !whatsAppText.trim()) return;
        const phone = whatsAppCustomer.telefone.replace(/\D/g, '');
        const phoneWithCountry = phone.startsWith('55') ? phone : `55${phone}`;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const baseUrl = isMobile ? 'https://wa.me' : 'https://web.whatsapp.com/send';
        window.open(`${baseUrl}/${phoneWithCountry}?text=${encodeURIComponent(whatsAppText)}`, '_blank');
        setIsWhatsAppModalOpen(false);
    };

    // Coupon Gift States
    const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
    const [giftCustomer, setGiftCustomer] = useState<Customer | null>(null);
    const [giftTipo, setGiftTipo] = useState<'porcentagem' | 'fixo'>('porcentagem');
    const [giftValor, setGiftValor] = useState('10');
    const [giftMinimo, setGiftMinimo] = useState('');
    const [giftMaximo, setGiftMaximo] = useState('');
    const [isGeneratingGift, setIsGeneratingGift] = useState(false);
    const [generatedCoupon, setGeneratedCoupon] = useState('');

    // Cadências de Promoções State
    const [cadencias, setCadencias] = useState<Cadencia[]>([]);
    const [loadingCadencias, setLoadingCadencias] = useState(false);
    const [isCadenceModalOpen, setIsCadenceModalOpen] = useState(false);
    const [cadenceForm, setCadenceForm] = useState<{
        id?: string;
        nome: string;
        descricao: string;
        target_tags: string[];
        cupom_codigo: string;
        desconto_percentual: string;
        assunto_email: string;
        conteudo_email: string;
        status: 'rascunho' | 'ativa' | 'pausada';
    }>({
        nome: '',
        descricao: '',
        target_tags: ['VIP'],
        cupom_codigo: '',
        desconto_percentual: '15',
        assunto_email: '🎉 Presente Especial da Franga Toys: Desconto Exclusivo!',
        conteudo_email: 'Olá, {primeiro_nome}!\n\nPreparamos uma seleção exclusiva para você em nosso acervo de colecionáveis.\n\nUse o cupom {cupom} e garanta {desconto}% OFF!\n\nAcesse agora: {loja_link}',
        status: 'ativa'
    });
    const [isSavingCadence, setIsSavingCadence] = useState(false);

    // Modal de Disparo / Fila da Cadência
    const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
    const [activeDispatchCadence, setActiveDispatchCadence] = useState<any>(null);
    const [loadingDispatchDetails, setLoadingDispatchDetails] = useState(false);
    const [isExecutingDispatch, setIsExecutingDispatch] = useState(false);

    // 1. Carregar Clientes
    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (search) queryParams.set('q', search);
            if (selectedTagFilter && selectedTagFilter !== 'all') queryParams.set('tag', selectedTagFilter);

            const res = await fetch(`/api/admin/customers?${queryParams.toString()}`);
            const data = await res.json();
            
            if (res.ok && Array.isArray(data)) {
                setCustomers(data);
            } else {
                setCustomers([]);
                if (data.error) toast.error(data.error);
            }
        } catch (err) {
            toast.error('Erro ao carregar clientes');
        } finally {
            setLoading(false);
        }
    };

    // 2. Carregar Cadências
    const fetchCadencias = async () => {
        setLoadingCadencias(true);
        try {
            const res = await fetch('/api/admin/crm/cadencias');
            const data = await res.json();
            if (res.ok && Array.isArray(data)) {
                setCadencias(data);
            } else {
                setCadencias([]);
            }
        } catch (err) {
            toast.error('Erro ao carregar cadências');
        } finally {
            setLoadingCadencias(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCustomers();
        }, 300);
        return () => clearTimeout(timer);
    }, [search, selectedTagFilter]);

    useEffect(() => {
        if (viewMode === 'cadencias') {
            fetchCadencias();
        }
    }, [viewMode]);

    // CEP Auto-complete no Modal
    useEffect(() => {
        if (!selectedCustomer?.cep) return;
        const cleanCep = selectedCustomer.cep.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
                .then(res => res.json())
                .then(data => {
                    if (data && !data.erro && selectedCustomer) {
                        setSelectedCustomer(prev => {
                            if (!prev) return null;
                            return {
                                ...prev,
                                logradouro: data.logradouro || '',
                                bairro: data.bairro || '',
                                cidade: data.localidade || '',
                                uf: data.uf || ''
                            };
                        });
                    }
                })
                .catch(err => console.error('Erro ao buscar CEP:', err));
        }
    }, [selectedCustomer?.cep]);

    const handleModalCpfChange = (val: string) => {
        let value = val.replace(/\D/g, '');
        if (value.length <= 11) {
            value = value
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            value = value.substring(0, 14)
                .replace(/^(\d{2})(\d)/, '$1.$2')
                .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                .replace(/\.(\d{3})(\d)/, '.$1/$2')
                .replace(/(\d{4})(\d)/, '$1-$2');
        }
        if (selectedCustomer) {
            setSelectedCustomer({ ...selectedCustomer, cpf: value });
        }
    };

    const handleModalCepChange = (val: string) => {
        let value = val.replace(/\D/g, '');
        if (value.length > 5) {
            value = value.replace(/^(\d{5})(\d)/, '$1-$2');
        }
        value = value.substring(0, 9);
        if (selectedCustomer) {
            setSelectedCustomer({ ...selectedCustomer, cep: value });
        }
    };

    // Gestão de Tags do Cliente
    const handleAddCustomerTag = (tagToAdd: string) => {
        if (!selectedCustomer) return;
        const trimmed = tagToAdd.trim();
        if (!trimmed) return;
        const current = selectedCustomer.tags || [];
        if (!current.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
            setSelectedCustomer({
                ...selectedCustomer,
                tags: [...current, trimmed]
            });
        }
        setNewTagInput('');
    };

    const handleRemoveCustomerTag = (tagToRemove: string) => {
        if (!selectedCustomer) return;
        const current = selectedCustomer.tags || [];
        setSelectedCustomer({
            ...selectedCustomer,
            tags: current.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase())
        });
    };

    const handleUpdateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer || isUpdating) return;

        setIsUpdating(true);
        try {
            const res = await fetch('/api/admin/customers', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedCustomer)
            });

            if (!res.ok) throw new Error('Erro ao atualizar');

            toast.success('Cliente e tags atualizados com sucesso!');
            setIsEditModalOpen(false);
            fetchCustomers();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao atualizar cliente');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleLgpdWipe = async (customerId: string) => {
        if (!confirm('ATENÇÃO: Esta ação é definitiva e irreversível!\n\nEla apagará todos os dados cadastrais pessoais (Nome, Telefone, CPF, Endereço, Instagram, Observações) deste cliente, substituindo-os por dados genéricos (CLIENTE ANONIMIZADO).\n\nOs históricos e valores das vendas serão preservados para fins de auditoria de faturamento, mas totalmente desvinculados do cliente original.\n\nDeseja realmente realizar o wipe/anonimização deste cliente?')) {
            return;
        }

        setIsUpdating(true);
        try {
            const res = await fetch('/api/admin/customers/anonimizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: customerId })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao anonimizar cliente');

            toast.success('Cliente anonimizado com sucesso sob as regras da LGPD!');
            setIsEditModalOpen(false);
            setSelectedCustomer(null);
            fetchCustomers();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao processar solicitação');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleLgpdExport = async (customer: Customer) => {
        setIsUpdating(true);
        try {
            const res = await fetch('/api/admin/customers/exportar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: customer.id })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao exportar dados');

            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `export_lgpd_${customer.nome.toLowerCase().replace(/\s+/g, '_')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success('Relatório LGPD exportado com sucesso!');
        } catch (err: any) {
            toast.error(err.message || 'Erro ao processar exportação');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleGenerateGiftCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!giftCustomer || isGeneratingGift) return;

        setIsGeneratingGift(true);
        try {
            const prefix = giftCustomer.nome.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').substring(0, 5);
            const valStr = giftTipo === 'porcentagem' ? giftValor : 'OFF';
            const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const codigoUnico = `${prefix}${valStr}-${randomSuffix}`;

            const payload = {
                codigo: codigoUnico,
                tipo: giftTipo,
                valor: Number(giftValor),
                usos_restantes: 1,
                data_validade: null,
                valor_minimo: giftMinimo ? Number(giftMinimo) : null,
                desconto_maximo: giftMaximo ? Number(giftMaximo) : null,
                ativo: true
            };

            const res = await fetch('/api/admin/coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setGeneratedCoupon(codigoUnico);
            toast.success('Cupom exclusivo gerado com sucesso!');
        } catch (err: any) {
            toast.error(err.message || 'Erro ao gerar cupom');
        } finally {
            setIsGeneratingGift(false);
        }
    };

    const sendWhatsAppGift = () => {
        if (!giftCustomer || !generatedCoupon) return;
        const phone = giftCustomer.telefone.replace(/\D/g, '');
        const emoji = String.fromCodePoint(0x1F381);
        const percentOrReal = giftTipo === 'porcentagem' ? `${giftValor}%` : `R$ ${giftValor}`;
        const condicaoMinima = giftMinimo ? ` (em compras acima de R$ ${giftMinimo})` : '';
        const msg = `Olá, ${giftCustomer.nome.split(' ')[0]}!\n\nVi que faz um tempo que não conversamos. Preparei um presente exclusivo para você ${emoji}\n\nUse o cupom *${generatedCoupon}* na nossa loja e ganhe *${percentOrReal} de desconto*${condicaoMinima}!\n\nAcesse: https://frangatoys.com.br`;
        
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const baseUrl = isMobile ? 'https://api.whatsapp.com/send' : 'https://web.whatsapp.com/send';
        window.open(`${baseUrl}?phone=55${phone}&text=${encodeURIComponent(msg)}`, '_blank');
        setIsGiftModalOpen(false);
    };

    const openGiftModal = (customer: Customer) => {
        setGiftCustomer(customer);
        setGiftTipo('porcentagem');
        setGiftValor('10');
        setGiftMinimo('');
        setGiftMaximo('');
        setGeneratedCoupon('');
        setIsGiftModalOpen(true);
    };

    // Cálculos de Métricas de Clientes
    const customersArray = Array.isArray(customers) ? customers : [];
    const totalCustomers = customersArray.length;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const newCustomersThisMonth = customersArray.filter(c => {
        const regDate = new Date(c.data_cadastro);
        return regDate.getMonth() === currentMonth && regDate.getFullYear() === currentYear;
    }).length;

    const topCustomer = [...customersArray].sort((a,b) => (b.total_gasto || 0) - (a.total_gasto || 0))[0];

    const filteredCustomers = useMemo(() => {
        return customersArray.filter(c => {
            // Filtro por Tag
            if (selectedTagFilter !== 'all') {
                const cTags = c.tags || [];
                if (!cTags.some(t => t.toLowerCase() === selectedTagFilter.toLowerCase())) {
                    return false;
                }
            }

            // Filtro por Segmento / Status
            if (activeFilter === 'all') return true;
            if (activeFilter === 'leads_quentes') {
                const hasTag = (c.tags || []).some(t => t.toLowerCase().includes('quente'));
                if (hasTag) return true;
                if (c.ultimo_acesso_em) {
                    const lastAccess = new Date(c.ultimo_acesso_em);
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    return lastAccess >= sevenDaysAgo;
                }
                return false;
            }
            if (activeFilter === 'vips') return (c.total_gasto || 0) > 500 || (c.total_pedidos || 0) >= 2;
            if (activeFilter === 'new') {
                const regDate = new Date(c.data_cadastro);
                return regDate.getMonth() === currentMonth && regDate.getFullYear() === currentYear;
            }
            if (activeFilter === 'inactives') {
                if (!c.ultima_venda_em) return true;
                const lastSale = new Date(c.ultima_venda_em);
                const sixtyDaysAgo = new Date();
                sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
                return lastSale < sixtyDaysAgo;
            }
            return true;
        });
    }, [customersArray, selectedTagFilter, activeFilter, currentMonth, currentYear]);

    // Contagem rápida de clientes por segmento
    const segmentCounts = useMemo(() => {
        let leadsQuentes = 0;
        let vips = 0;
        let inactives = 0;
        let news = 0;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        customersArray.forEach(c => {
            const hasQuenteTag = (c.tags || []).some(t => t.toLowerCase().includes('quente'));
            const isRecentAccess = c.ultimo_acesso_em && new Date(c.ultimo_acesso_em) >= sevenDaysAgo;
            if (hasQuenteTag || isRecentAccess) leadsQuentes++;

            if ((c.total_gasto || 0) > 500 || (c.total_pedidos || 0) >= 2) vips++;

            const regDate = new Date(c.data_cadastro);
            if (regDate.getMonth() === currentMonth && regDate.getFullYear() === currentYear) news++;

            if (!c.ultima_venda_em) {
                inactives++;
            } else if (new Date(c.ultima_venda_em) < sixtyDaysAgo) {
                inactives++;
            }
        });

        return {
            all: customersArray.length,
            leads_quentes: leadsQuentes,
            vips,
            inactives,
            new: news
        };
    }, [customersArray, currentMonth, currentYear]);

    // Todas as tags em uso na base
    const allTagsInUse = useMemo(() => {
        const tagMap = new Map<string, number>();
        customersArray.forEach(c => {
            (c.tags || []).forEach(t => {
                const tr = t.trim();
                if (tr) tagMap.set(tr, (tagMap.get(tr) || 0) + 1);
            });
        });
        return Array.from(tagMap.entries()).map(([tag, count]) => ({ tag, count }));
    }, [customersArray]);

    const handleCopyList = async () => {
        if (filteredCustomers.length === 0 || isCopying) return;
        
        setIsCopying(true);
        try {
            const listText = filteredCustomers
                .map(c => `${c.nome} - ${c.telefone}${c.email ? ` - ${c.email}` : ''}`)
                .join('\n');
            
            await navigator.clipboard.writeText(listText);
            toast.success(`${filteredCustomers.length} contatos copiados!`);
            
            setTimeout(() => {
                setIsCopying(false);
            }, 3000);
        } catch (err) {
            toast.error('Erro ao copiar contatos');
            setIsCopying(false);
        }
    };

    // Cadência: Criar / Editar
    const openCreateCadenceModal = () => {
        setCadenceForm({
            nome: '',
            descricao: '',
            target_tags: ['VIP'],
            cupom_codigo: 'PROMO15',
            desconto_percentual: '15',
            assunto_email: '🎉 Presente Especial da Franga Toys: Desconto Exclusivo!',
            conteudo_email: 'Olá, {primeiro_nome}!\n\nPreparamos uma condição exclusiva especialmente para você em nosso acervo de colecionáveis.\n\nUse o cupom {cupom} e garanta {desconto}% OFF!\n\nAcesse agora: {loja_link}',
            status: 'ativa'
        });
        setIsCadenceModalOpen(true);
    };

    const handleSaveCadence = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cadenceForm.nome.trim() || cadenceForm.target_tags.length === 0) {
            toast.error('Informe um nome e ao menos uma tag-alvo para a cadência');
            return;
        }

        setIsSavingCadence(true);
        try {
            const isEditing = !!cadenceForm.id;
            const res = await fetch('/api/admin/crm/cadencias', {
                method: isEditing ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cadenceForm)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao salvar cadência');

            toast.success(isEditing ? 'Cadência atualizada!' : `Cadência criada com ${data.total_impactados || 0} clientes matriculados!`);
            setIsCadenceModalOpen(false);
            fetchCadencias();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao processar cadência');
        } finally {
            setIsSavingCadence(false);
        }
    };

    const handleDeleteCadence = async (id: string, name: string) => {
        if (!confirm(`Deseja realmente excluir a cadência "${name}"?`)) return;
        try {
            const res = await fetch(`/api/admin/crm/cadencias?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Erro ao excluir cadência');
            toast.success('Cadência removida!');
            fetchCadencias();
        } catch (err: any) {
            toast.error(err.message || 'Falha ao remover cadência');
        }
    };

    const openDispatchModal = async (cadenciaId: string) => {
        setLoadingDispatchDetails(true);
        setIsDispatchModalOpen(true);
        try {
            const res = await fetch(`/api/admin/crm/cadencias?id=${cadenciaId}`);
            const data = await res.json();
            if (res.ok) {
                setActiveDispatchCadence(data);
            } else {
                toast.error('Erro ao carregar detalhes');
                setIsDispatchModalOpen(false);
            }
        } catch (err) {
            toast.error('Falha ao carregar fila');
            setIsDispatchModalOpen(false);
        } finally {
            setLoadingDispatchDetails(false);
        }
    };

    const handleExecuteDispatch = async () => {
        if (!activeDispatchCadence) return;
        setIsExecutingDispatch(true);
        try {
            const res = await fetch(`/api/admin/crm/cadencias/${activeDispatchCadence.id}/disparar`, {
                method: 'POST'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Falha no disparo');

            toast.success(data.message || 'Disparo concluído com sucesso!');
            setIsDispatchModalOpen(false);
            fetchCadencias();
        } catch (err: any) {
            toast.error(err.message || 'Erro durante o disparo');
        } finally {
            setIsExecutingDispatch(false);
        }
    };

    // Contador de clientes impactados pela seleção de tags na cadência
    const targetTagImpactCount = useMemo(() => {
        if (!cadenceForm.target_tags.length) return 0;
        return customersArray.filter(c => {
            const cTags = (c.tags || []).map(t => t.toLowerCase());
            return cadenceForm.target_tags.some(tt => cTags.includes(tt.toLowerCase()));
        }).length;
    }, [customersArray, cadenceForm.target_tags]);

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tighter flex items-center gap-3">
                        <div className="p-2 bg-orange-500 rounded-xl text-white shadow-lg shadow-orange-500/20">
                            <Users size={28} strokeWidth={2.5} />
                        </div>
                        CRM & <span className="text-orange-500">FIDELIZAÇÃO</span>
                    </h1>
                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest pl-1 opacity-70">
                        Segmentação por tags, automações e cadências de promoções Franga Toys
                    </p>
                </div>

                {/* Tab Switcher: Clientes vs Cadências */}
                <div className="flex items-center gap-2 bg-zinc-900/60 p-1.5 rounded-2xl border border-zinc-800">
                    <button
                        onClick={() => setViewMode('clientes')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                            viewMode === 'clientes'
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                                : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                        <Users size={16} />
                        Clientes & Tags ({totalCustomers})
                    </button>
                    <button
                        onClick={() => setViewMode('cadencias')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                            viewMode === 'cadencias'
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                                : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                        <Sparkles size={16} />
                        Cadências de Promoções ({cadencias.length})
                    </button>
                    <button
                        onClick={() => setViewMode('telemetria')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                            viewMode === 'telemetria'
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                                : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                        <Radio size={16} className={viewMode === 'telemetria' ? 'animate-pulse' : ''} />
                        Radar de Acessos (Beacon)
                    </button>
                </div>
            </div>

            {/* ABA 1: BASE DE CLIENTES & TAGS */}
            {viewMode === 'clientes' && (
                <div className="space-y-6">
                    {/* Barra de Busca e Filtro de Tags */}
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="relative group w-full md:flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-orange-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar cliente por nome, telefone ou e-mail..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-black border border-zinc-800 rounded-2xl py-3.5 pl-12 pr-6 outline-none focus:border-orange-500 w-full text-sm font-medium transition-all shadow-inner text-white placeholder-zinc-500"
                            />
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <button 
                                onClick={handleCopyList}
                                disabled={filteredCustomers.length === 0}
                                className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${
                                    isCopying 
                                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 active:scale-95 disabled:opacity-50 cursor-pointer'
                                }`}
                            >
                                {isCopying ? <Check size={14} /> : <Copy size={14} />}
                                {isCopying ? 'Copiados!' : `Copiar ${filteredCustomers.length} Contatos`}
                            </button>
                        </div>
                    </div>

                    {/* Chips Rápidos de Tags e Status */}
                    <div className="space-y-3 bg-zinc-900/30 p-4 rounded-3xl border border-zinc-800/60">
                        {/* Linha 1: Status Base */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mr-2 flex items-center gap-1">
                                <Filter size={12} /> Status:
                            </span>
                            <button 
                                onClick={() => setActiveFilter('all')}
                                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border cursor-pointer ${activeFilter === 'all' ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                            >
                                Todos ({segmentCounts.all})
                            </button>
                            <button 
                                onClick={() => setActiveFilter('leads_quentes')}
                                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-1.5 cursor-pointer ${activeFilter === 'leads_quentes' ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                            >
                                <Flame size={12} className="text-orange-400" /> Leads Quentes ({segmentCounts.leads_quentes})
                            </button>
                            <button 
                                onClick={() => setActiveFilter('vips')}
                                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-1.5 cursor-pointer ${activeFilter === 'vips' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                            >
                                <Award size={12} /> VIPs ({segmentCounts.vips})
                            </button>
                            <button 
                                onClick={() => setActiveFilter('inactives')}
                                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-1.5 cursor-pointer ${activeFilter === 'inactives' ? 'bg-zinc-200 border-zinc-200 text-black shadow-md' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                            >
                                <Clock size={12} /> Inativos (+60d) ({segmentCounts.inactives})
                            </button>
                            <button 
                                onClick={() => setActiveFilter('new')}
                                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-1.5 cursor-pointer ${activeFilter === 'new' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                            >
                                <UserPlus size={12} /> Novos ({segmentCounts.new})
                            </button>
                        </div>

                        {/* Linha 2: Tags Sugeridas para Filtro Rápido */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/40">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mr-2 flex items-center gap-1">
                                <Tag size={12} /> Tags:
                            </span>
                            <button 
                                onClick={() => setSelectedTagFilter('all')}
                                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                                    selectedTagFilter === 'all' 
                                        ? 'bg-orange-500/20 border-orange-500 text-orange-400 font-black' 
                                        : 'bg-zinc-900 border-zinc-800/80 text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                Todas as Tags
                            </button>
                            {DEFAULT_SUGGESTED_TAGS.map(tag => {
                                const isSelected = selectedTagFilter === tag;
                                return (
                                    <button
                                        key={tag}
                                        onClick={() => setSelectedTagFilter(isSelected ? 'all' : tag)}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 cursor-pointer ${
                                            isSelected 
                                                ? 'ring-2 ring-orange-500 font-black ' + getTagBadgeStyle(tag)
                                                : getTagBadgeStyle(tag) + ' opacity-70 hover:opacity-100'
                                        }`}
                                    >
                                        <Tag size={10} />
                                        {tag}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Loyalty Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-3xl space-y-4 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                                <TrendingUp size={80} />
                            </div>
                            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 w-fit">
                                <Award size={20} />
                            </div>
                            <div>
                                <p className="text-3xl font-black tracking-tight">{filteredCustomers.length}</p>
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">Clientes Selecionados</p>
                            </div>
                        </div>
                        
                        <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-3xl space-y-4 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform text-blue-500">
                                <Clock size={80} />
                            </div>
                            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 w-fit">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <p className="text-3xl font-black tracking-tight">{newCustomersThisMonth}</p>
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">Registrados este Mês</p>
                            </div>
                        </div>

                        <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-3xl space-y-4 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform text-orange-500">
                                <ShoppingBag size={80} />
                            </div>
                            <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400 w-fit">
                                <Award size={20} />
                            </div>
                            <div>
                                <p className="text-xl font-black tracking-tight truncate max-w-[200px]">
                                    {topCustomer?.nome || 'Iniciando...'}
                                </p>
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">Maior Fidelidade (LTV)</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabela de Clientes */}
                    <div className="bg-zinc-900/20 border border-zinc-800 rounded-[2rem] overflow-hidden backdrop-blur-sm shadow-2xl">
                        {loading ? (
                            <div className="p-20 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="animate-spin text-orange-500" size={40} />
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">Sincronizando Base de Dados...</p>
                            </div>
                        ) : filteredCustomers.length === 0 ? (
                            <div className="p-20 text-center space-y-4">
                                <Users size={60} className="mx-auto text-zinc-800" />
                                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Nenhum cliente encontrado com esses critérios.</p>
                                {(activeFilter !== 'all' || selectedTagFilter !== 'all') && (
                                    <button 
                                        onClick={() => { setActiveFilter('all'); setSelectedTagFilter('all'); }} 
                                        className="text-orange-500 text-[10px] font-black uppercase tracking-widest hover:underline cursor-pointer"
                                    >
                                        Limpar Filtros
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-zinc-800/50 bg-black/40">
                                            <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Cliente / Contato</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Tags & Segmentação</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] hidden lg:table-cell">Último Acesso (Beacon)</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] hidden md:table-cell">Última Compra</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] hidden md:table-cell">Total Gasto (LTV)</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/30">
                                        {filteredCustomers.map((customer) => (
                                            <tr key={customer.id} className="group hover:bg-zinc-800/30 transition-colors">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 font-black text-lg shadow-inner group-hover:border-orange-500/50 transition-colors">
                                                            {customer.nome[0].toUpperCase()}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-zinc-100 group-hover:text-white transition-colors">{customer.nome}</span>
                                                                {customer.cpf && customer.cep && (
                                                                    <span className="text-[7.5px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded shadow-sm" title="Dados cadastrais para NF-e completos">
                                                                        NF-e OK
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-0.5">
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => openWhatsAppModal(customer)}
                                                                    className="text-[11px] font-mono text-zinc-500 flex items-center gap-1 hover:text-emerald-400 transition-colors cursor-pointer group/wa"
                                                                    title="Abrir WhatsApp com templates de mensagens"
                                                                >
                                                                    <MessageCircle size={12} className="text-emerald-500 group-hover/wa:scale-110 transition-transform" />
                                                                    {customer.telefone}
                                                                </button>
                                                                {customer.email && (
                                                                    <span className="text-[11px] text-zinc-500 flex items-center gap-1 truncate max-w-[160px]">
                                                                        <Mail size={11} className="text-zinc-600" />
                                                                        {customer.email}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                                                        {customer.tags && customer.tags.length > 0 ? (
                                                            customer.tags.map(t => (
                                                                <span 
                                                                    key={t} 
                                                                    className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getTagBadgeStyle(t)}`}
                                                                >
                                                                    {t}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-[10px] text-zinc-600 italic">Sem tags</span>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                setSelectedCustomer(customer);
                                                                setIsEditModalOpen(true);
                                                            }}
                                                            className="text-[10px] text-zinc-500 hover:text-orange-400 p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                                                            title="Gerenciar tags"
                                                        >
                                                            <Plus size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 hidden lg:table-cell">
                                                    <div className="flex flex-col">
                                                        {customer.ultimo_acesso_em ? (
                                                            <>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                                    <span className="text-[11px] font-bold text-zinc-300">
                                                                        {new Date(customer.ultimo_acesso_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[9px] font-bold text-zinc-500 flex items-center gap-1 mt-0.5">
                                                                    <MapPin size={9} className="text-orange-400" />
                                                                    {customer.cidade_ultimo_acesso ? `${customer.cidade_ultimo_acesso}${customer.uf_ultimo_acesso ? ` - ${customer.uf_ultimo_acesso}` : ''}` : 'Local desconhecido'}
                                                                    {customer.total_acessos ? ` (${customer.total_acessos}x)` : ''}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-[10px] text-zinc-600 italic">Sem registros</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 hidden md:table-cell">
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-bold text-zinc-400">
                                                            {customer.ultima_venda_em ? new Date(customer.ultima_venda_em).toLocaleDateString('pt-BR') : 'Nenhuma'}
                                                        </span>
                                                        <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">
                                                            {customer.total_pedidos || 0} Pedidos
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 hidden md:table-cell">
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-bold text-emerald-500">R$ {(customer.total_gasto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                        <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">
                                                            LTV Acumulado
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => openWhatsAppModal(customer)}
                                                            className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-colors border border-emerald-500/20 shadow-sm cursor-pointer"
                                                            title="WhatsApp CRM 1-Clique (Templates & Ofertas)"
                                                        >
                                                            <MessageCircle size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => openGiftModal(customer)}
                                                            className="p-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl transition-colors border border-purple-500/20 shadow-sm cursor-pointer"
                                                            title="Presentear com Cupom Exclusivo"
                                                        >
                                                            <Gift size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedCustomer(customer);
                                                                setIsEditModalOpen(true);
                                                            }}
                                                            className="p-2.5 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl transition-colors border border-zinc-700/60 shadow-sm cursor-pointer"
                                                            title="Editar Dados e Tags"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ABA 2: CADÊNCIAS DE PROMOÇÕES */}
            {viewMode === 'cadencias' && (
                <div className="space-y-6">
                    {/* Header da Aba com Ação Primária */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/30 p-6 rounded-3xl border border-zinc-800/60">
                        <div>
                            <h2 className="text-xl font-black text-white flex items-center gap-2">
                                <Sparkles className="text-orange-500" size={20} />
                                Cadências Automáticas de Promoções
                            </h2>
                            <p className="text-xs text-zinc-400 mt-1">
                                Crie fluxos automáticos com descontos e cupons exclusivos disparados para clientes segmentados por tags.
                            </p>
                        </div>
                        <button
                            onClick={openCreateCadenceModal}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] cursor-pointer"
                        >
                            <Plus size={16} />
                            Nova Cadência
                        </button>
                    </div>

                    {/* Grid de Cadências */}
                    {loadingCadencias ? (
                        <div className="p-20 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="animate-spin text-orange-500" size={40} />
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">Carregando cadências promocionais...</p>
                        </div>
                    ) : cadencias.length === 0 ? (
                        <div className="bg-zinc-900/20 border border-zinc-800 p-16 rounded-3xl text-center space-y-4">
                            <Sparkles size={50} className="mx-auto text-zinc-700" />
                            <h3 className="text-lg font-black text-zinc-300">Nenhuma cadência criada ainda</h3>
                            <p className="text-xs text-zinc-500 max-w-md mx-auto">
                                Cadências permitem enviar automaticamente e-mails e promoções com cupons personalizados para clientes marcados com tags específicas (ex: VIP, Gamer, Anime).
                            </p>
                            <button
                                onClick={openCreateCadenceModal}
                                className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
                            >
                                <Plus size={14} /> Criar Primeira Cadência
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {cadencias.map(cad => (
                                <div 
                                    key={cad.id}
                                    className="bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-xl relative group transition-all"
                                >
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                                                cad.status === 'ativa'
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                    : (cad.status === 'pausada' 
                                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                                                    : 'bg-zinc-800 border-zinc-700 text-zinc-400')
                                            }`}>
                                                {cad.status.toUpperCase()}
                                            </span>
                                            <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                                                <Mail size={11} /> E-mail / Notificação
                                            </span>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-black text-white leading-tight">{cad.nome}</h3>
                                            {cad.descricao && (
                                                <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{cad.descricao}</p>
                                            )}
                                        </div>

                                        {/* Tags Alvo */}
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tags Segmentadas:</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {cad.target_tags.map(t => (
                                                    <span key={t} className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getTagBadgeStyle(t)}`}>
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Cupom / Desconto */}
                                        {cad.cupom_codigo && (
                                            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Gift size={16} className="text-purple-400" />
                                                    <span className="text-xs font-mono font-black text-purple-300">{cad.cupom_codigo}</span>
                                                </div>
                                                {cad.desconto_percentual && (
                                                    <span className="text-xs font-black text-emerald-400">{cad.desconto_percentual}% OFF</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Estatísticas de Envio */}
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-center">
                                            <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/40">
                                                <span className="text-xs font-black text-white">{cad.total_impactados}</span>
                                                <p className="text-[9px] text-zinc-500 uppercase font-black tracking-wider">Matriculados</p>
                                            </div>
                                            <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/40">
                                                <span className="text-xs font-black text-emerald-400">{cad.total_enviados}</span>
                                                <p className="text-[9px] text-zinc-500 uppercase font-black tracking-wider">Disparados</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ações */}
                                    <div className="pt-4 border-t border-zinc-800/60 flex items-center gap-2">
                                        <button
                                            onClick={() => openDispatchModal(cad.id)}
                                            className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer"
                                        >
                                            <Send size={14} /> Disparar
                                        </button>
                                        <button
                                            onClick={() => {
                                                setCadenceForm({
                                                    id: cad.id,
                                                    nome: cad.nome,
                                                    descricao: cad.descricao || '',
                                                    target_tags: cad.target_tags || [],
                                                    cupom_codigo: cad.cupom_codigo || '',
                                                    desconto_percentual: cad.desconto_percentual ? String(cad.desconto_percentual) : '',
                                                    assunto_email: cad.assunto_email || '',
                                                    conteudo_email: cad.conteudo_email || '',
                                                    status: cad.status as any
                                                });
                                                setIsCadenceModalOpen(true);
                                            }}
                                            className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl transition-colors cursor-pointer"
                                            title="Editar Cadência"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCadence(cad.id, cad.nome)}
                                            className="p-3 bg-red-950/30 hover:bg-red-950/60 border border-red-900/40 text-red-400 rounded-xl transition-colors cursor-pointer"
                                            title="Excluir Cadência"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* MODAL 1: CRIAR / EDITAR CADÊNCIA */}
            {isCadenceModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-zinc-950 border border-orange-500/30 w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setIsCadenceModalOpen(false)}
                            className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                        >
                            <CloseIcon size={24} />
                        </button>

                        <div className="mb-6">
                            <div className="w-14 h-14 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center text-orange-500 mb-3 shadow-inner">
                                <Sparkles size={28} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight text-white">
                                {cadenceForm.id ? 'Editar' : 'Nova'} <span className="text-orange-500">Cadência de Promoção</span>
                            </h2>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">
                                Defina o público pelas tags e configure o disparo automatizado
                            </p>
                        </div>

                        <form onSubmit={handleSaveCadence} className="space-y-5">
                            {/* Nome & Descrição */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Nome da Cadência</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: Semana Gamer - 15% OFF"
                                        value={cadenceForm.nome}
                                        onChange={e => setCadenceForm({ ...cadenceForm, nome: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-bold text-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Descrição / Objetivo</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Reengajar fãs de jogos com cupom de desconto em peças selecionadas"
                                        value={cadenceForm.descricao}
                                        onChange={e => setCadenceForm({ ...cadenceForm, descricao: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 outline-none focus:border-orange-500 text-xs font-medium text-zinc-300 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Seleção de Tags Alvo */}
                            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] text-orange-400 uppercase font-black tracking-widest flex items-center gap-1.5">
                                        <Tag size={12} /> Tags Alvo (Segmentação)
                                    </label>
                                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                                        🎯 Alcançará {targetTagImpactCount} clientes
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {DEFAULT_SUGGESTED_TAGS.map(tag => {
                                        const isSelected = cadenceForm.target_tags.includes(tag);
                                        return (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => {
                                                    const current = cadenceForm.target_tags;
                                                    const updated = isSelected 
                                                        ? current.filter(t => t !== tag)
                                                        : [...current, tag];
                                                    setCadenceForm({ ...cadenceForm, target_tags: updated });
                                                }}
                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-orange-500 border-orange-500 text-white font-black shadow-md shadow-orange-500/30'
                                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                                                }`}
                                            >
                                                {isSelected ? <Check size={12} /> : <Plus size={12} />}
                                                {tag}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Cupom e Desconto */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Código do Cupom</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: GAMER15"
                                        value={cadenceForm.cupom_codigo}
                                        onChange={e => setCadenceForm({ ...cadenceForm, cupom_codigo: e.target.value.toUpperCase() })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 outline-none focus:border-purple-500 text-sm font-mono font-bold text-purple-300 uppercase transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Desconto (%)</label>
                                    <input
                                        type="number"
                                        placeholder="Ex: 15"
                                        min="1"
                                        max="100"
                                        value={cadenceForm.desconto_percentual}
                                        onChange={e => setCadenceForm({ ...cadenceForm, desconto_percentual: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white transition-all"
                                    />
                                </div>
                            </div>

                            {/* Assunto do E-mail */}
                            <div>
                                <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Assunto do E-mail</label>
                                <input
                                    type="text"
                                    required
                                    value={cadenceForm.assunto_email}
                                    onChange={e => setCadenceForm({ ...cadenceForm, assunto_email: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white transition-all"
                                />
                            </div>

                            {/* Template do Conteúdo */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5 pl-1">
                                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Template da Mensagem</label>
                                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-500">
                                        Tags: 
                                        <button 
                                            type="button" 
                                            onClick={() => setCadenceForm(p => ({ ...p, conteudo_email: p.conteudo_email + ' {primeiro_nome}' }))}
                                            className="text-orange-400 hover:underline cursor-pointer"
                                        >
                                            {'{primeiro_nome}'}
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setCadenceForm(p => ({ ...p, conteudo_email: p.conteudo_email + ' {cupom}' }))}
                                            className="text-purple-400 hover:underline cursor-pointer"
                                        >
                                            {'{cupom}'}
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setCadenceForm(p => ({ ...p, conteudo_email: p.conteudo_email + ' {desconto}%' }))}
                                            className="text-emerald-400 hover:underline cursor-pointer"
                                        >
                                            {'{desconto}'}
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    required
                                    rows={5}
                                    value={cadenceForm.conteudo_email}
                                    onChange={e => setCadenceForm({ ...cadenceForm, conteudo_email: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-xs font-medium text-zinc-200 resize-none transition-all leading-relaxed"
                                />
                            </div>

                            {/* Botão de Envio */}
                            <button
                                type="submit"
                                disabled={isSavingCadence}
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                            >
                                {isSavingCadence ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                {cadenceForm.id ? 'Salvar Alterações' : 'Criar e Matricular Clientes'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ABA 3: RADAR DE ACESSOS (BEACON & TELEMETRIA) */}
            {viewMode === 'telemetria' && (
                <div className="space-y-6">
                    {/* Header do Radar */}
                    <div className="bg-gradient-to-br from-zinc-900/95 via-zinc-900/60 to-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-black uppercase tracking-widest mb-2">
                                    <Radio size={14} className="animate-pulse" /> Telemetria de Acessos
                                </div>
                                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                                    Radar de Visitantes & Engajamento de Campanhas
                                </h2>
                                <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                                    Rastreamento inteligente de geolocalização (cidade/estado), tráfego de campanhas e identificação de clientes no CRM através do Beacon nativo.
                                </p>
                            </div>
                            <button
                                onClick={fetchTelemetria}
                                disabled={loadingTelemetria}
                                className="self-start md:self-auto text-xs font-bold text-zinc-300 hover:text-white px-4 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/50 transition-all flex items-center gap-2 active:scale-95 shadow-lg cursor-pointer"
                            >
                                <RefreshCw size={14} className={loadingTelemetria ? "animate-spin text-orange-400" : ""} />
                                {loadingTelemetria ? 'Atualizando...' : 'Atualizar Radar'}
                            </button>
                        </div>

                        {/* Cards de Métricas Rápidas */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 relative z-10">
                            <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Acessos Registrados</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-white">{telemetriaLogs.length}</span>
                                    <span className="text-[10px] text-zinc-500 font-bold">últimos eventos</span>
                                </div>
                            </div>
                            <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Identificados no CRM</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-emerald-400">
                                        {telemetriaLogs.filter(l => l.cliente_id || l.clientes).length}
                                    </span>
                                    <span className="text-[10px] text-emerald-500/70 font-bold">com cadastro</span>
                                </div>
                            </div>
                            <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Cliques em Campanhas</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-orange-400">
                                        {telemetriaLogs.filter(l => l.utm_source || l.cadencia_id).length}
                                    </span>
                                    <span className="text-[10px] text-orange-500/70 font-bold">vindos de links</span>
                                </div>
                            </div>
                            <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Mobile vs Desktop</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-blue-400">
                                        {telemetriaLogs.length > 0 ? Math.round((telemetriaLogs.filter(l => l.dispositivo === 'mobile').length / telemetriaLogs.length) * 100) : 0}%
                                    </span>
                                    <span className="text-[10px] text-blue-500/70 font-bold">Mobile</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Feed de Acessos Recentes */}
                    <div className="bg-zinc-900/20 border border-zinc-800 rounded-[2rem] overflow-hidden backdrop-blur-sm shadow-2xl">
                        {loadingTelemetria ? (
                            <div className="p-20 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="animate-spin text-orange-500" size={40} />
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">Sincronizando Radar do Beacon...</p>
                            </div>
                        ) : telemetriaLogs.length === 0 ? (
                            <div className="p-20 text-center space-y-4">
                                <Radio size={60} className="mx-auto text-zinc-800 animate-pulse" />
                                <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Nenhum evento registrado ainda.</p>
                                <p className="text-zinc-600 text-xs max-w-md mx-auto">
                                    Navegue pela loja em outra aba para ver as visitas sendo capturadas pelo Beacon em tempo real!
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-zinc-800/50 bg-black/40">
                                            <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Último Sinal</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Visitante / Cliente</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">De Onde Acessou</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Navegação & Interesse</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Origem / Campanha</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] text-right">Tempo Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/30">
                                        {telemetriaLogs.map((log) => {
                                            const isCliente = !!(log.clientes?.nome || log.email);
                                            const clienteNome = log.clientes?.nome || log.email;
                                            const displayTime = log.ultimo_acesso_em || log.created_at;
                                            const totalSec = log.duracao_total_segundos || log.duracao_segundos || 0;
                                            const minutes = Math.floor(totalSec / 60);
                                            const seconds = totalSec % 60;
                                            const timeFormatted = minutes > 0 ? `${minutes}m ${seconds}s` : (seconds > 0 ? `${seconds}s` : '< 5s');

                                            return (
                                                <tr key={log.id} className="group hover:bg-zinc-800/30 transition-colors">
                                                    {/* Horário */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                                <span className="text-xs font-bold text-zinc-300">
                                                                    {new Date(displayTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-zinc-600 font-mono mt-0.5">
                                                                {new Date(displayTime).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Visitante / Cliente */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                                                                isCliente 
                                                                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' 
                                                                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'
                                                            }`}>
                                                                {isCliente ? clienteNome[0]?.toUpperCase() : '?'}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                {isCliente ? (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs font-bold text-white">{clienteNome}</span>
                                                                        <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                                                            CRM
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs font-medium text-zinc-400">
                                                                        Anônimo ({log.visitor_id ? log.visitor_id.slice(0, 10) : 'vis'})
                                                                    </span>
                                                                )}
                                                                <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                                                                    {log.dispositivo === 'mobile' ? <Smartphone size={10} /> : <Monitor size={10} />}
                                                                    {log.dispositivo} • {log.navegador || 'Navegador'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Localização */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <MapPin size={12} className="text-orange-400 shrink-0" />
                                                            <span className="text-xs font-bold text-zinc-200">
                                                                {log.cidade || 'Desconhecida'}
                                                                {log.estado && log.estado !== 'Desconhecido' && log.estado !== 'DEV' ? `, ${log.estado}` : ''}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Página Acessada & Histórico de Navegação */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                                                                    {log.total_paginas || 1} {log.total_paginas > 1 ? 'páginas' : 'página'}
                                                                </span>
                                                                <span className="text-xs font-mono text-zinc-400 font-medium truncate max-w-[180px]" title={log.ultima_pagina || log.pathname}>
                                                                    {log.ultima_pagina || log.pathname || '/'}
                                                                </span>
                                                            </div>
                                                            {log.figuras && (
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    {log.figuras.imagem_url && (
                                                                        <img 
                                                                            src={log.figuras.imagem_url} 
                                                                            alt={log.figuras.nome} 
                                                                            className="w-5 h-5 rounded object-cover border border-zinc-700 bg-zinc-800 shrink-0" 
                                                                        />
                                                                    )}
                                                                    <span className="text-[11px] font-bold text-orange-400 truncate max-w-[200px]" title={log.figuras.nome}>
                                                                        {log.figuras.nome}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Campanha / Origem */}
                                                    <td className="px-6 py-4">
                                                        {log.crm_cadencias ? (
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                                                Cadência: {log.crm_cadencias.nome}
                                                            </span>
                                                        ) : log.utm_campaign ? (
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                                                {log.utm_source || 'Campanha'}: {log.utm_campaign}
                                                            </span>
                                                        ) : log.referrer && log.referrer.includes('instagram') ? (
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-pink-500/15 text-pink-300 border border-pink-500/30">
                                                                Instagram
                                                            </span>
                                                        ) : (
                                                            <span className="text-[11px] text-zinc-500 font-medium">
                                                                {log.referrer ? 'Link externo' : 'Direto'}
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Tempo */}
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-xs font-mono font-bold text-zinc-300">
                                                            {timeFormatted}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL 2: DISPARO / FILA DA CADÊNCIA */}
            {isDispatchModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-zinc-950 border border-orange-500/30 w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setIsDispatchModalOpen(false)}
                            className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                        >
                            <CloseIcon size={24} />
                        </button>

                        <div className="mb-6">
                            <div className="w-14 h-14 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center text-orange-500 mb-3 shadow-inner">
                                <Send size={28} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight text-white">
                                Disparar <span className="text-orange-500">{activeDispatchCadence?.nome}</span>
                            </h2>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">
                                Disparo automatizado de e-mails / notificações para clientes com as tags selecionadas
                            </p>
                        </div>

                        {loadingDispatchDetails ? (
                            <div className="p-12 flex flex-col items-center justify-center gap-3">
                                <Loader2 className="animate-spin text-orange-500" size={32} />
                                <span className="text-xs text-zinc-500">Carregando lista de matriculados...</span>
                            </div>
                        ) : activeDispatchCadence && (
                            <div className="space-y-6">
                                {/* Resumo de Impacto */}
                                <div className="grid grid-cols-2 gap-3 p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
                                    <div>
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Total de Clientes</span>
                                        <p className="text-xl font-black text-white">{activeDispatchCadence.crm_cadencia_envios?.length || 0}</p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Pendentes de Envio</span>
                                        <p className="text-xl font-black text-orange-400">
                                            {(activeDispatchCadence.crm_cadencia_envios || []).filter((e: any) => e.status === 'pendente').length}
                                        </p>
                                    </div>
                                </div>

                                {/* Preview da Mensagem */}
                                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-2">
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Prévia do Assunto:</span>
                                    <p className="text-xs font-bold text-white">{activeDispatchCadence.assunto_email}</p>
                                    <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">
                                        {activeDispatchCadence.conteudo_email}
                                    </div>
                                </div>

                                {/* Botão de Disparo */}
                                <button
                                    onClick={handleExecuteDispatch}
                                    disabled={isExecutingDispatch}
                                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                                >
                                    {isExecutingDispatch ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                    Executar Disparo Automatizado Agora
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL 3: EDIÇÃO DE CLIENTE & TAGS */}
            {isEditModalOpen && selectedCustomer && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-zinc-950 border border-zinc-800 w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setIsEditModalOpen(false)}
                            className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                        >
                            <CloseIcon size={24} />
                        </button>

                        <div className="mb-6">
                            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                                <Edit2 size={22} className="text-orange-500" />
                                Visão 360° & Dados do Cliente
                            </h2>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">
                                Perfil consolidado: LTV, telemetria de navegação, notas internas e tags
                            </p>
                        </div>

                        {/* CARD VISÃO 360° & TELEMETRIA BEACON */}
                        <div className="mb-6 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 flex items-center gap-1.5">
                                    <Radio size={13} className="text-orange-500 animate-pulse" />
                                    Métricas & Telemetria
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditModalOpen(false);
                                        openWhatsAppModal(selectedCustomer);
                                    }}
                                    className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                    <MessageCircle size={12} /> WhatsApp 1-Clique
                                </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <div className="p-2.5 bg-zinc-950/80 border border-zinc-800/80 rounded-xl">
                                    <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider block">LTV Acumulado</span>
                                    <span className="text-sm font-black text-emerald-400">
                                        R$ {(selectedCustomer.total_gasto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="p-2.5 bg-zinc-950/80 border border-zinc-800/80 rounded-xl">
                                    <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider block">Total Pedidos</span>
                                    <span className="text-sm font-black text-white">
                                        {selectedCustomer.total_pedidos || 0}
                                    </span>
                                </div>
                                <div className="p-2.5 bg-zinc-950/80 border border-zinc-800/80 rounded-xl">
                                    <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider block">Última Compra</span>
                                    <span className="text-xs font-bold text-zinc-300">
                                        {selectedCustomer.ultima_venda_em ? new Date(selectedCustomer.ultima_venda_em).toLocaleDateString('pt-BR') : 'Nenhuma'}
                                    </span>
                                </div>
                                <div className="p-2.5 bg-zinc-950/80 border border-zinc-800/80 rounded-xl">
                                    <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider block">Último Acesso</span>
                                    <span className="text-xs font-bold text-orange-400 flex items-center gap-1">
                                        {selectedCustomer.ultimo_acesso_em ? (
                                            <>
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                                                {new Date(selectedCustomer.ultimo_acesso_em).toLocaleDateString('pt-BR')}
                                            </>
                                        ) : 'Sem registro'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-zinc-400">
                                {selectedCustomer.cidade_ultimo_acesso && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-950 rounded-lg border border-zinc-800 font-bold">
                                        <MapPin size={11} className="text-orange-400" />
                                        {selectedCustomer.cidade_ultimo_acesso}{selectedCustomer.uf_ultimo_acesso ? ` - ${selectedCustomer.uf_ultimo_acesso}` : ''}
                                    </span>
                                )}
                                {selectedCustomer.total_acessos ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-950 rounded-lg border border-zinc-800 font-bold">
                                        <Eye size={11} className="text-blue-400" />
                                        {selectedCustomer.total_acessos} acessos monitorados
                                    </span>
                                ) : null}
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-950 rounded-lg border border-zinc-800 text-zinc-500 font-bold">
                                    <Calendar size={11} />
                                    Cliente desde {new Date(selectedCustomer.data_cadastro).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                        </div>

                        <form onSubmit={handleUpdateCustomer} className="space-y-5">
                            {/* Nome */}
                            <div>
                                <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={selectedCustomer.nome}
                                    onChange={e => setSelectedCustomer({ ...selectedCustomer, nome: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-bold text-zinc-200"
                                />
                            </div>

                            {/* WhatsApp & Instagram */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">WhatsApp</label>
                                    <input
                                        type="text"
                                        required
                                        value={selectedCustomer.telefone}
                                        onChange={e => setSelectedCustomer({ ...selectedCustomer, telefone: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-bold text-zinc-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Instagram (@)</label>
                                    <input
                                        type="text"
                                        value={selectedCustomer.instagram || ''}
                                        onChange={e => setSelectedCustomer({ ...selectedCustomer, instagram: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-bold text-zinc-200"
                                        placeholder="ex: afkak_oficial"
                                    />
                                </div>
                            </div>

                            {/* E-mail (Importante para cadências) */}
                            <div>
                                <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1 flex items-center gap-1.5">
                                    <Mail size={12} className="text-orange-500" /> E-mail para Notificações & Promoções
                                </label>
                                <input
                                    type="email"
                                    placeholder="exemplo@gmail.com"
                                    value={selectedCustomer.email || ''}
                                    onChange={e => setSelectedCustomer({ ...selectedCustomer, email: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-medium text-zinc-200"
                                />
                            </div>

                            {/* GESTOR DE TAGS DO CLIENTE */}
                            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-3">
                                <label className="text-[10px] text-orange-400 uppercase font-black tracking-widest flex items-center gap-1.5">
                                    <Tag size={12} /> Tags de Segmentação
                                </label>

                                {/* Tags Atuais */}
                                <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
                                    {selectedCustomer.tags && selectedCustomer.tags.length > 0 ? (
                                        selectedCustomer.tags.map(t => (
                                            <span 
                                                key={t}
                                                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${getTagBadgeStyle(t)}`}
                                            >
                                                {t}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCustomerTag(t)}
                                                    className="hover:text-red-400 transition-colors cursor-pointer"
                                                >
                                                    <CloseIcon size={10} />
                                                </button>
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-zinc-500 italic">Nenhuma tag atribuída a este cliente.</span>
                                    )}
                                </div>

                                {/* Sugestões Rápidas de 1 Clique */}
                                <div className="pt-2 border-t border-zinc-800/60">
                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 block">
                                        Sugestões Rápidas:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {DEFAULT_SUGGESTED_TAGS.map(st => {
                                            const isAlreadyAdded = (selectedCustomer.tags || []).some(t => t.toLowerCase() === st.toLowerCase());
                                            return (
                                                <button
                                                    key={st}
                                                    type="button"
                                                    disabled={isAlreadyAdded}
                                                    onClick={() => handleAddCustomerTag(st)}
                                                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                                                        isAlreadyAdded
                                                            ? 'opacity-30 border-zinc-800 text-zinc-600 cursor-not-allowed'
                                                            : 'bg-zinc-900 border-zinc-700/80 text-zinc-300 hover:text-white hover:border-orange-500'
                                                    }`}
                                                >
                                                    + {st}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Adicionar Tag Customizada */}
                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        type="text"
                                        placeholder="Digitar nova tag..."
                                        value={newTagInput}
                                        onChange={e => setNewTagInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddCustomerTag(newTagInput);
                                            }
                                        }}
                                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleAddCustomerTag(newTagInput)}
                                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                                    >
                                        Adicionar
                                    </button>
                                </div>
                            </div>

                            {/* Dados de Faturamento (NF-e) */}
                            <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest border-t border-zinc-800/80 pt-4 mt-2">Dados de Faturamento (NF-e)</div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">CPF ou CNPJ</label>
                                    <input
                                        type="text"
                                        value={selectedCustomer.cpf || ''}
                                        onChange={e => handleModalCpfChange(e.target.value)}
                                        placeholder="Ex: 000.000.000-00"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-bold text-zinc-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">CEP</label>
                                    <input
                                        type="text"
                                        value={selectedCustomer.cep || ''}
                                        onChange={e => handleModalCepChange(e.target.value)}
                                        placeholder="Ex: 00000-000"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-bold text-zinc-200"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-3">
                                    <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Logradouro</label>
                                    <input
                                        type="text"
                                        value={selectedCustomer.logradouro || ''}
                                        onChange={e => setSelectedCustomer({ ...selectedCustomer, logradouro: e.target.value })}
                                        placeholder="Ex: Rua das Flores"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-bold text-zinc-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Número</label>
                                    <input
                                        type="text"
                                        value={selectedCustomer.numero || ''}
                                        onChange={e => setSelectedCustomer({ ...selectedCustomer, numero: e.target.value })}
                                        placeholder="Ex: 123"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-bold text-zinc-200"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-3">
                                    <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Bairro</label>
                                    <input
                                        type="text"
                                        value={selectedCustomer.bairro || ''}
                                        onChange={e => setSelectedCustomer({ ...selectedCustomer, bairro: e.target.value })}
                                        placeholder="Ex: Centro"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-bold text-zinc-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">UF</label>
                                    <input
                                        type="text"
                                        value={selectedCustomer.uf || ''}
                                        onChange={e => setSelectedCustomer({ ...selectedCustomer, uf: e.target.value.toUpperCase() })}
                                        maxLength={2}
                                        placeholder="SP"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-bold text-zinc-200 text-center"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Cidade</label>
                                <input
                                    type="text"
                                    value={selectedCustomer.cidade || ''}
                                    onChange={e => setSelectedCustomer({ ...selectedCustomer, cidade: e.target.value })}
                                    placeholder="Ex: São Paulo"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-bold text-zinc-200"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1 flex items-center gap-1.5">
                                    <FileText size={12} className="text-orange-500" />
                                    Notas Internas da Equipe (Histórico de Atendimento)
                                </label>
                                <textarea
                                    value={selectedCustomer.notas || ''}
                                    onChange={e => setSelectedCustomer({ ...selectedCustomer, notas: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-xs font-medium text-zinc-200 h-24 resize-none leading-relaxed transition-all"
                                    placeholder="Ex: Colecionador fã de Berserk e DBZ; prefere contato à tarde; encomendou busto customizado em resina..."
                                />
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest shadow-lg shadow-orange-500/20 cursor-pointer"
                                >
                                    {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    Salvar Alterações
                                </button>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleLgpdExport(selectedCustomer)}
                                        disabled={isUpdating}
                                        className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-xs uppercase tracking-wider cursor-pointer"
                                    >
                                        <Download size={14} />
                                        Exportar Dados
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleLgpdWipe(selectedCustomer.id)}
                                        disabled={isUpdating}
                                        className="w-full bg-red-950/40 hover:bg-red-950/60 border border-red-800/40 hover:border-red-650 text-red-400 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-xs uppercase tracking-wider cursor-pointer"
                                    >
                                        <Trash2 size={14} />
                                        Wipe (LGPD)
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 4: GIFT CUPOM WHATSAPP */}
            {isGiftModalOpen && giftCustomer && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-zinc-950 border border-purple-500/30 w-full max-w-lg rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(168,85,247,0.1)] relative animate-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setIsGiftModalOpen(false)}
                            className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                        >
                            <CloseIcon size={24} />
                        </button>

                        <div className="mb-8">
                            <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center text-purple-500 mb-4 shadow-inner">
                                <Gift size={32} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tighter uppercase italic text-white">
                                Presentear <span className="text-purple-500">{giftCustomer.nome.split(' ')[0]}</span>
                            </h2>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">Crie um cupom de uso único para este cliente</p>
                        </div>

                        {!generatedCoupon ? (
                            <form onSubmit={handleGenerateGiftCoupon} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Tipo de Desconto</label>
                                        <select
                                            value={giftTipo}
                                            onChange={(e) => setGiftTipo(e.target.value as any)}
                                            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-purple-500 transition-all font-bold appearance-none cursor-pointer text-sm"
                                        >
                                            <option value="porcentagem">Porcentagem (%)</option>
                                            <option value="fixo">Valor Fixo (R$)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Valor</label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={giftValor}
                                            onChange={(e) => setGiftValor(e.target.value)}
                                            placeholder="Ex: 10"
                                            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-purple-500 transition-all font-bold placeholder-zinc-700"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Compra Mínima (Opcional)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={giftMinimo}
                                            onChange={(e) => setGiftMinimo(e.target.value)}
                                            placeholder="Ex: 100.00"
                                            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-purple-500 transition-all font-bold placeholder-zinc-700 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Teto Máximo (Opcional)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={giftMaximo}
                                            onChange={(e) => setGiftMaximo(e.target.value)}
                                            placeholder="Ex: 50.00"
                                            disabled={giftTipo !== 'porcentagem'}
                                            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-purple-500 transition-all font-bold placeholder-zinc-700 disabled:opacity-50 text-sm"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isGeneratingGift}
                                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest shadow-lg shadow-purple-500/20 cursor-pointer"
                                >
                                    {isGeneratingGift ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                                    Gerar Cupom Mágico
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-6 text-center animate-in zoom-in-95 duration-500">
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Cupom Gerado e Ativo!</p>
                                    <p className="text-3xl font-black text-white tracking-widest">{generatedCoupon}</p>
                                </div>
                                <button
                                    onClick={sendWhatsAppGift}
                                    className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-black font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] uppercase tracking-widest shadow-lg shadow-[#25D366]/20 cursor-pointer"
                                >
                                    <MessageCircle size={18} />
                                    Enviar no WhatsApp
                                </button>
                                <button
                                    onClick={() => setIsGiftModalOpen(false)}
                                    className="w-full text-[10px] text-zinc-500 uppercase font-black tracking-widest hover:text-white cursor-pointer"
                                >
                                    Fechar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL 5: WHATSAPP CRM 1-CLIQUE */}
            {isWhatsAppModalOpen && whatsAppCustomer && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-zinc-950 border border-emerald-500/30 w-full max-w-xl rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(16,185,129,0.12)] relative animate-in zoom-in-95 duration-200 space-y-6">
                        <button 
                            onClick={() => setIsWhatsAppModalOpen(false)}
                            className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                        >
                            <CloseIcon size={24} />
                        </button>

                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-3">
                                <MessageCircle size={14} /> CRM WhatsApp 1-Clique
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                                Conversar com <span className="text-emerald-400">{whatsAppCustomer.nome ? whatsAppCustomer.nome.split(' ')[0] : 'Cliente'}</span>
                            </h2>
                            <p className="text-xs text-zinc-400 mt-1">
                                Telefone: <span className="font-mono text-zinc-300 font-bold">{whatsAppCustomer.telefone}</span>
                                {whatsAppCustomer.cidade_ultimo_acesso && (
                                    <span className="ml-2 text-zinc-500">({whatsAppCustomer.cidade_ultimo_acesso})</span>
                                )}
                            </p>
                        </div>

                        {/* Seletor de Templates Prontos */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">
                                Escolha um Template Prático:
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleSelectTemplate('oferta')}
                                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                        selectedTemplateKey === 'oferta'
                                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                                    }`}
                                >
                                    <span className="text-[11px] font-black block text-white flex items-center gap-1.5">
                                        🎁 Oferta Franga Picks 15%
                                    </span>
                                    <span className="text-[10px] text-zinc-400 block mt-0.5">Cupom FRANGAPICKS15 rastreado</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleSelectTemplate('interesse')}
                                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                        selectedTemplateKey === 'interesse'
                                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                                    }`}
                                >
                                    <span className="text-[11px] font-black block text-white flex items-center gap-1.5">
                                        🎨 Vagas Oficina / Custom
                                    </span>
                                    <span className="text-[10px] text-zinc-400 block mt-0.5">Peças sob encomenda & pintura</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleSelectTemplate('pos_venda')}
                                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                        selectedTemplateKey === 'pos_venda'
                                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                                    }`}
                                >
                                    <span className="text-[11px] font-black block text-white flex items-center gap-1.5">
                                        📦 Pós-Venda & Coleção
                                    </span>
                                    <span className="text-[10px] text-zinc-400 block mt-0.5">Cuidados e feedback da peça</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleSelectTemplate('livre')}
                                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                        selectedTemplateKey === 'livre'
                                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                                    }`}
                                >
                                    <span className="text-[11px] font-black block text-white flex items-center gap-1.5">
                                        ✍️ Mensagem Livre
                                    </span>
                                    <span className="text-[10px] text-zinc-400 block mt-0.5">Texto personalizado</span>
                                </button>
                            </div>
                        </div>

                        {/* Mensagem Editável */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                    Mensagem Prévia (Editável):
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(whatsAppText);
                                        toast.success('Texto copiado!');
                                    }}
                                    className="text-[10px] font-bold text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                >
                                    <Copy size={11} /> Copiar texto
                                </button>
                            </div>
                            <textarea
                                rows={5}
                                value={whatsAppText}
                                onChange={(e) => setWhatsAppText(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-xs font-medium text-zinc-100 outline-none focus:border-emerald-500 resize-none transition-all leading-relaxed"
                            />
                        </div>

                        {/* Ações */}
                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                type="button"
                                onClick={handleSendWhatsAppMessage}
                                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg shadow-[#25D366]/20 transition-all active:scale-[0.98] cursor-pointer text-sm"
                            >
                                <MessageCircle size={18} />
                                Abrir conversa no WhatsApp
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsWhatsAppModalOpen(false)}
                                className="w-full py-2.5 text-[10px] text-zinc-500 uppercase font-black tracking-widest hover:text-white transition-colors cursor-pointer text-center"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
