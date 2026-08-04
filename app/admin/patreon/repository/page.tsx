'use client';

import { useState, useEffect } from 'react';
import { FolderGit2, Save, Check, Terminal, RefreshCw, ShieldCheck, Users, Lock, Copy, Sparkles, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPatreonRepositoryPage() {
    // 1. Repositório Ativo Principal (Patreon)
    const [patreonRepoUrl, setPatreonRepoUrl] = useState('https://drive.google.com/drive/folders/1EXEMPLO_PASTA_PATREON');
    const [savedPatreonRepoUrl, setSavedPatreonRepoUrl] = useState('');
    const [savingPatreonRepo, setSavingPatreonRepo] = useState(false);

    // 2. Acesso Direto para Terceirizados / Freelancers
    const [contractorEmail, setContractorEmail] = useState('');
    const [contractorRepoUrl, setContractorRepoUrl] = useState('');
    const [contractorLink, setContractorLink] = useState('');
    const [copiedContractorLink, setCopiedContractorLink] = useState(false);

    // 3. Tabela de Logs de Auditoria
    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    const fetchAuditLogs = async () => {
        try {
            setLoadingLogs(true);
            const res = await fetch('/api/admin/integrations/patreon/tokens');
            if (res.ok) {
                const data = await res.json();
                setRecentLogs(data || []);
            }
        } catch (e) {
            console.error('Erro ao carregar logs:', e);
        } finally {
            setLoadingLogs(false);
        }
    };

    useEffect(() => {
        fetchAuditLogs();
        const storedRepo = localStorage.getItem('active_patreon_repo_url');
        if (storedRepo) {
            setPatreonRepoUrl(storedRepo);
            setSavedPatreonRepoUrl(storedRepo);
        } else {
            setSavedPatreonRepoUrl(patreonRepoUrl);
        }
    }, []);

    // Salvar Repositório do Patreon
    const handleSavePatreonRepo = (e: React.FormEvent) => {
        e.preventDefault();
        setSavingPatreonRepo(true);
        localStorage.setItem('active_patreon_repo_url', patreonRepoUrl);
        setSavedPatreonRepoUrl(patreonRepoUrl);
        setTimeout(() => {
            setSavingPatreonRepo(false);
            toast.success('Repositório ativo do Patreon atualizado!');
        }, 300);
    };

    // Gerar Link Seguro para Terceirizado
    const handleCreateContractorAccess = (e: React.FormEvent) => {
        e.preventDefault();
        if (!contractorEmail.trim() || !contractorRepoUrl.trim()) {
            toast.error('Informe o e-mail do terceirizado e a URL do repositório.');
            return;
        }

        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://frangatoys.com.br';
        const link = `${origin}/patreon/download?email=${encodeURIComponent(contractorEmail.trim())}&url=${encodeURIComponent(contractorRepoUrl.trim())}&type=contractor`;
        setContractorLink(link);
        toast.success(`Link de acesso gerado para o terceirizado: ${contractorEmail}`);
    };

    const copyContractorLink = async () => {
        if (!contractorLink) return;
        try {
            await navigator.clipboard.writeText(contractorLink);
            setCopiedContractorLink(true);
            toast.success('Link do terceirizado copiado!');
            setTimeout(() => setCopiedContractorLink(false), 2000);
        } catch (e) {
            toast.error('Erro ao copiar');
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-white p-4 md:p-8 space-y-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-8">
                
                {/* Header Admin */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3.5 bg-gradient-to-br from-purple-500/20 to-indigo-600/20 border border-purple-500/30 rounded-2xl text-purple-400 shadow-lg">
                            <Lock size={28} />
                        </div>
                        <div>
                            <span className="bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                                Painel do Criador & Gestor de Downloads
                            </span>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-1">
                                Gestão de Repositórios & Terceirizados
                            </h1>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* SEÇÃO 1: PASTA ATIVA DO PATREON */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
                                <FolderGit2 size={20} />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-white uppercase tracking-wider">
                                    1. Repositório Ativo dos Membros (Patreon)
                                </h2>
                                <p className="text-xs text-zinc-400">
                                    Informe a URL da pasta do mês. Todos os membros ativos baixarão desta pasta até você alterá-la.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSavePatreonRepo} className="space-y-3 pt-2">
                            <div>
                                <label className="block text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-1">
                                    URL da Pasta / Nuvem (Google Drive / Storage)
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://drive.google.com/drive/folders/..."
                                    value={patreonRepoUrl}
                                    onChange={e => setPatreonRepoUrl(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-purple-500 rounded-xl px-4 py-3 text-xs font-mono text-purple-300 outline-none transition-all"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={savingPatreonRepo}
                                className="w-full py-3 bg-purple-600 hover:bg-purple-500 active:scale-98 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
                            >
                                <Save size={16} />
                                Salvar Repositório do Patreon
                            </button>
                        </form>

                        {savedPatreonRepoUrl && (
                            <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono pt-1">
                                <Check size={14} /> Ativo: <span className="underline truncate">{savedPatreonRepoUrl}</span>
                            </div>
                        )}
                    </div>

                    {/* SEÇÃO 2: DISPONIBILIZAR PARA TERCEIRIZADOS / FREELANCERS */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                                <UserCheck size={20} />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-white uppercase tracking-wider">
                                    2. Enviar Arquivos para Terceirizados
                                </h2>
                                <p className="text-xs text-zinc-400">
                                    Disponibilize arquivos ou repositórios específicos para parceiros e prestadores de serviço com rastreamento de IP e e-mail.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateContractorAccess} className="space-y-3 pt-2">
                            <div>
                                <label className="block text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-1">
                                    E-mail do Terceirizado / Freelancer
                                </label>
                                <input
                                    type="email"
                                    placeholder="prestador@terceirizado.com"
                                    value={contractorEmail}
                                    onChange={e => setContractorEmail(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-1">
                                    URL da Pasta / Arquivo do Projeto
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://drive.google.com/..."
                                    value={contractorRepoUrl}
                                    onChange={e => setContractorRepoUrl(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs font-mono text-indigo-300 outline-none transition-all"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                            >
                                <Sparkles size={16} />
                                Gerar Link de Acesso do Terceirizado
                            </button>
                        </form>

                        {contractorLink && (
                            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2 animate-in fade-in duration-200">
                                <span className="text-[10px] font-black uppercase text-indigo-400">Link Protegido para Enviar ao Terceirizado:</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={contractorLink}
                                        className="flex-1 bg-transparent text-[11px] font-mono text-zinc-300 outline-none truncate"
                                    />
                                    <button
                                        onClick={copyContractorLink}
                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs shrink-0 flex items-center gap-1"
                                    >
                                        {copiedContractorLink ? <Check size={12} /> : <Copy size={12} />}
                                        {copiedContractorLink ? 'Copiado' : 'Copiar'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* SEÇÃO 3: TABELA DE AUDITORIA & RASTREAMENTO */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Terminal size={18} className="text-purple-400" />
                            <h3 className="text-base font-black text-white uppercase tracking-wider">
                                Rastreamento de Downloads em Tempo Real
                            </h3>
                        </div>
                        <button onClick={fetchAuditLogs} className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1">
                            <RefreshCw size={12} className={loadingLogs ? 'animate-spin' : ''} /> Atualizar Log
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-zinc-300">
                            <thead className="bg-zinc-950 text-[10px] uppercase font-black tracking-widest text-zinc-500 border-b border-zinc-800">
                                <tr>
                                    <th className="py-3 px-4">Usuário / Terceirizado</th>
                                    <th className="py-3 px-4">Repositório / Arquivo</th>
                                    <th className="py-3 px-4">IP Registrado</th>
                                    <th className="py-3 px-4">Data/Hora</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50 font-mono">
                                {recentLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-6 text-center text-zinc-600 italic">
                                            Nenhum download registrado ainda.
                                        </td>
                                    </tr>
                                ) : (
                                    recentLogs.map((t: any) => (
                                        <tr key={t.id} className="hover:bg-zinc-800/40">
                                            <td className="py-3 px-4 font-sans font-bold text-white">{t.patron_email}</td>
                                            <td className="py-3 px-4 truncate max-w-xs text-purple-300">{t.real_file_url}</td>
                                            <td className="py-3 px-4 text-zinc-400">{t.user_ip || '-'}</td>
                                            <td className="py-3 px-4 text-zinc-500 text-[11px] font-sans">
                                                {new Date(t.created_at).toLocaleString('pt-BR')}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
