'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
    Lock, CheckCircle2, XCircle, Search, ExternalLink, 
    Copy, MessageCircle, ShieldCheck, RefreshCw, User, Phone, Instagram, Clock
} from 'lucide-react';

interface Solicitacao {
    id: string;
    nome: string;
    whatsapp?: string;
    email?: string;
    instagram?: string;
    mensagem?: string;
    ip?: string;
    status: 'pendente' | 'aprovado' | 'recusado';
    token_vip?: string;
    created_at: string;
    aprovado_em?: string;
}

export default function ConvitesPage() {
    const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'todos' | 'pendente' | 'aprovado' | 'recusado'>('todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const fetchSolicitacoes = async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('solicitacoes_acesso')
                .select('*')
                .order('created_at', { ascending: false });

            if (filterStatus !== 'todos') {
                query = query.eq('status', filterStatus);
            }

            const { data, error } = await query;
            if (error) throw error;
            setSolicitacoes(data || []);
        } catch (err: any) {
            toast.error('Erro ao carregar convites: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSolicitacoes();
    }, [filterStatus]);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        setActionLoadingId(id);
        try {
            // Chama a API interna de decisão ou direto no banco
            const res = await fetch(`/api/admin/convites/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Falha ao processar');

            toast.success(action === 'approve' ? 'Acesso aprovado com sucesso!' : 'Solicitação recusada.');
            fetchSolicitacoes();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao atualizar');
        } finally {
            setActionLoadingId(null);
        }
    };

    const copyInviteLink = (token?: string, nome?: string, whatsapp?: string) => {
        if (!token) return;
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://frangatoys.com.br';
        const link = `${baseUrl}?vip=${token}`;
        navigator.clipboard.writeText(link);
        toast.success('Link VIP copiado para a área de transferência!');
    };

    const openWhatsAppInvite = (token?: string, nome?: string, whatsapp?: string) => {
        if (!token || !whatsapp) return;
        const cleanPhone = whatsapp.replace(/\D/g, '');
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://frangatoys.com.br';
        const inviteUrl = `${baseUrl}?vip=${token}`;
        const msg = encodeURIComponent(
            `Olá ${nome}! Seu convite para o acervo exclusivo da Franga Toys foi liberado 🎉\n\n` +
            `Acesse pelo link seguro:\n${inviteUrl}\n\n` +
            `Dúvidas sobre encomendas ou acabamentos, estou à disposição!`
        );
        window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank');
    };

    const filtered = solicitacoes.filter(s => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            s.nome?.toLowerCase().includes(term) ||
            s.whatsapp?.includes(term) ||
            s.instagram?.toLowerCase().includes(term) ||
            s.ip?.includes(term)
        );
    });

    const pendingCount = solicitacoes.filter(s => s.status === 'pendente').length;
    const approvedCount = solicitacoes.filter(s => s.status === 'aprovado').length;

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Lock className="text-orange-500" size={24} />
                        <h1 className="text-2xl font-black text-white">Controle de Acesso VIP</h1>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                        Gerencie quem tem permissão para visualizar e comprar na vitrine fechada da Franga Toys.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchSolicitacoes}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold border border-zinc-800 transition-colors"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        <span>Atualizar</span>
                    </button>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Pendentes de Avaliação</span>
                    <span className="text-2xl font-black text-amber-400 mt-1 block">{pendingCount}</span>
                </div>
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Membros Aprovados</span>
                    <span className="text-2xl font-black text-emerald-400 mt-1 block">{approvedCount}</span>
                </div>
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Total de Solicitações</span>
                    <span className="text-2xl font-black text-white mt-1 block">{solicitacoes.length}</span>
                </div>
            </div>

            {/* Filtros e Busca */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/40 border border-zinc-800 p-3 rounded-2xl">
                <div className="flex items-center gap-2">
                    {(['todos', 'pendente', 'aprovado', 'recusado'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                                filterStatus === status
                                    ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                <div className="relative min-w-[220px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, fone, @..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                    />
                </div>
            </div>

            {/* Lista de Solicitações */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="p-12 text-center text-zinc-500 text-sm">Carregando solicitações...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center bg-zinc-900/20 border border-zinc-800/60 rounded-2xl text-zinc-500 text-sm">
                        Nenhuma solicitação encontrada para este filtro.
                    </div>
                ) : (
                    filtered.map((item) => {
                        const cleanPhone = item.whatsapp?.replace(/\D/g, '');
                        const linkedinUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(item.nome)}`;
                        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(`"${item.nome}" advogado OR oab`)}`;

                        return (
                            <div
                                key={item.id}
                                className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-zinc-700 transition-all"
                            >
                                <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-base font-black text-white truncate">{item.nome}</h3>
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                            item.status === 'aprovado'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : item.status === 'recusado'
                                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        }`}>
                                            {item.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-zinc-400 flex-wrap">
                                        {item.email && (
                                            <span className="flex items-center gap-1 font-mono text-blue-400">
                                                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">Google</span>
                                                {item.email}
                                            </span>
                                        )}
                                        {item.whatsapp && (
                                            <span className="flex items-center gap-1 font-mono">
                                                <Phone size={12} className="text-zinc-500" />
                                                {item.whatsapp}
                                            </span>
                                        )}
                                        {item.instagram && (
                                            <a
                                                href={`https://instagram.com/${item.instagram.replace(/^@/, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                                            >
                                                <Instagram size={12} />
                                                @{item.instagram.replace(/^@/, '')}
                                                <ExternalLink size={10} />
                                            </a>
                                        )}
                                        {item.ip && (
                                            <span className="text-[10px] text-zinc-600 font-mono">
                                                IP: {item.ip}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                                            <Clock size={10} />
                                            {new Date(item.created_at).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    {item.mensagem && (
                                        <div className="bg-zinc-950/70 border border-amber-500/20 rounded-xl px-3 py-2 text-xs text-amber-200/90 font-medium leading-relaxed my-1.5 flex items-start gap-2 max-w-2xl">
                                            <MessageCircle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-amber-400/80 tracking-wider block mb-0.5">Mensagem do Solicitante:</span>
                                                <span className="italic">"{item.mensagem}"</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Links Rápidos Anti-Advogado */}
                                    <div className="flex items-center gap-2 pt-1">
                                        <a
                                            href={linkedinUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] font-bold text-blue-400 hover:underline flex items-center gap-0.5"
                                        >
                                            🔎 Checar no LinkedIn
                                            <ExternalLink size={9} />
                                        </a>
                                        <span className="text-zinc-700">•</span>
                                        <a
                                            href={googleUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] font-bold text-zinc-400 hover:underline flex items-center gap-0.5"
                                        >
                                            ⚖️ Checar se é Advogado
                                            <ExternalLink size={9} />
                                        </a>
                                    </div>
                                </div>

                                {/* Ações */}
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-zinc-800/80 pt-3 sm:pt-0">
                                    {item.status === 'pendente' && (
                                        <>
                                            <button
                                                onClick={() => handleAction(item.id, 'approve')}
                                                disabled={actionLoadingId === item.id}
                                                className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5"
                                            >
                                                <CheckCircle2 size={14} />
                                                <span>Aprovar</span>
                                            </button>
                                            <button
                                                onClick={() => handleAction(item.id, 'reject')}
                                                disabled={actionLoadingId === item.id}
                                                className="flex-1 sm:flex-initial px-3.5 py-2 bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-500/30 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <XCircle size={14} />
                                                <span>Recusar</span>
                                            </button>
                                        </>
                                    )}

                                    {item.status === 'aprovado' && item.token_vip && (
                                        <>
                                            <button
                                                onClick={() => openWhatsAppInvite(item.token_vip, item.nome, item.whatsapp)}
                                                className="flex-1 sm:flex-initial px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <MessageCircle size={14} />
                                                <span>Enviar no WhatsApp</span>
                                            </button>
                                            <button
                                                onClick={() => copyInviteLink(item.token_vip, item.nome, item.whatsapp)}
                                                className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                                                title="Copiar Link VIP"
                                            >
                                                <Copy size={14} />
                                                <span className="hidden sm:inline">Copiar Link</span>
                                            </button>
                                        </>
                                    )}

                                    {item.status === 'recusado' && (
                                        <button
                                            onClick={() => handleAction(item.id, 'approve')}
                                            disabled={actionLoadingId === item.id}
                                            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold rounded-xl border border-zinc-800 transition-all"
                                        >
                                            Reverter para Aprovado
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

