
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Trash2, Plus, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface User {
    id: number;
    email: string;
    nome?: string;
    telefone?: string;
    roles: string[];
    created_at: string;
}

const AVAILABLE_ROLES = [
    { id: 'admin', label: 'Admin (Total)' },
    { id: 'sales', label: 'Vendas' },
    { id: 'pricing', label: 'Precificação' },
    { id: 'finance', label: 'Financeiro' },
    { id: 'orcamento', label: 'Orçamento' },
    { id: 'production', label: 'Produção' },
    { id: 'painter', label: 'Pintor (Freelancer)' },
];

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [email, setEmail] = useState('');
    const [nome, setNome] = useState('');
    const [telefone, setTelefone] = useState('');
    const [selectedRoles, setSelectedRoles] = useState<string[]>(['sales']);
    const [creating, setCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (res.ok) setUsers(data);
        } catch (err) {
            toast.error('Erro ao carregar usuários');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const method = isEditing ? 'PUT' : 'POST';
            const body = { email, roles: selectedRoles, nome, telefone };

            const res = await fetch('/api/admin/users', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success(isEditing ? 'Usuário atualizado!' : 'Usuário criado!');

            // Reset form
            setEmail('');
            setNome('');
            setTelefone('');
            setSelectedRoles(['sales']);
            setIsEditing(false);
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleEdit = (user: User) => {
        setEmail(user.email);
        setNome(user.nome || '');
        setTelefone(user.telefone || '');
        setSelectedRoles(user.roles || []);
        setIsEditing(true);
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEmail('');
        setNome('');
        setTelefone('');
        setSelectedRoles(['sales']);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

        try {
            const res = await fetch('/api/admin/users', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });

            if (!res.ok) throw new Error('Erro ao deletar');

            toast.success('Usuário removido');
            setUsers(users.filter(u => u.id !== id));
        } catch (err) {
            toast.error('Erro ao excluir usuário');
        }
    };

    const toggleRole = (role: string) => {
        setSelectedRoles(prev =>
            prev.includes(role)
                ? prev.filter(r => r !== role)
                : [...prev, role]
        );
    };

    return (
        <div className="min-h-screen bg-black text-zinc-200 p-4 md:p-8 relative overflow-x-hidden selection:bg-orange-500/30 selection:text-orange-200">
            {/* Sci-fi Background Blobs - Subdued */}
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-orange-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-900/10 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="max-w-7xl mx-auto relative z-10 transition-colors duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 mt-2">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-orange-400 rounded-2xl transition-all shadow-sm text-zinc-500 group">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </Link>
                        <div className="p-3.5 bg-zinc-900 border border-orange-500/30 text-orange-500 rounded-2xl shadow-sm">
                            <Plus size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Gerenciar Usuários</h1>
                            <p className="text-zinc-400 text-sm font-medium mt-1 uppercase tracking-widest text-[10px]">Controle de acessos e permissões Táticas.</p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-[1fr_400px] items-start">
                    {/* Lista */}
                    <div className="bg-zinc-950/60 backdrop-blur-sm border border-zinc-800/80 rounded-3xl overflow-hidden shadow-lg relative">
                        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/30 to-transparent"></div>
                        <div className="p-6 border-b border-zinc-800/80 font-black text-zinc-200 tracking-widest uppercase text-[11px] flex items-center justify-between bg-zinc-900/40">
                            <span>Usuários Cadastrados</span>
                            <span className="bg-zinc-900 px-3 py-1 rounded-full text-[10px] font-black text-orange-400 border border-zinc-800 shadow-sm">
                                {users.length}
                            </span>
                        </div>
                        {loading ? (
                            <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-orange-500 w-10 h-10" /></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-zinc-950/80 border-b border-zinc-800/80">
                                        <tr className="text-zinc-500 text-[9px] uppercase font-black tracking-widest">
                                            <th className="p-5 pl-8">Usuário Agente</th>
                                            <th className="p-5">Comunicação (Whats)</th>
                                            <th className="p-5">Funções / Permissões</th>
                                            <th className="p-5 w-[100px] text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/50">
                                        {users.map(user => (
                                            <tr key={user.id} className="hover:bg-zinc-900/50 transition-colors group">
                                            <td className="p-5 pl-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-zinc-900 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black text-lg shadow-sm">
                                                        {(user.nome || user.email).charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-zinc-200 text-base tracking-tight">{user.nome || '--'}</span>
                                                        <span className="text-xs text-zinc-500 font-medium font-mono">{user.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                {user.telefone ? (
                                                    <span className="text-xs font-mono bg-orange-500/10 text-orange-500 py-1.5 px-3 rounded-md font-bold tracking-tight border border-orange-500/20 inline-flex items-center gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                                        {user.telefone}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-zinc-600 italic opacity-50">Não informado</span>
                                                )}
                                            </td>
                                            <td className="p-5">
                                                <div className="flex gap-1.5 flex-wrap w-full max-w-[200px]">
                                                    {user.roles?.map(role => {
                                                        const roleLabel = AVAILABLE_ROLES.find(r => r.id === role)?.label || role;
                                                        const isAdmin = role === 'admin';
                                                        return (
                                                            <span key={role} className={`text-[9px] px-2 py-1 rounded-sm bg-zinc-900 ${isAdmin ? 'text-orange-400 border-orange-500/30' : 'text-zinc-400 border-zinc-800'} border font-black uppercase tracking-widest`}>
                                                                {roleLabel}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex gap-2 justify-end opacity-20 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className="p-2.5 text-zinc-400 hover:text-orange-400 bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 hover:bg-orange-500/10 rounded-xl transition-all shadow-sm"
                                                        title="Editar Usuário"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user.id)}
                                                        className="p-2.5 text-zinc-400 hover:text-red-400 bg-zinc-900 border border-zinc-800 hover:border-red-500/50 hover:bg-red-500/10 rounded-xl transition-all shadow-sm"
                                                        title="Excluir Usuário"
                                                    >
                                                        <Trash2 size={16} strokeWidth={2.5} />
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

                {/* Form */}
                <div className="bg-zinc-950/60 backdrop-blur-sm border border-zinc-800/80 rounded-3xl p-8 h-fit sticky top-8 shadow-lg relative overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent"></div>
                    <h2 className="text-xl font-black mb-8 flex items-center gap-3 pb-5 border-b border-zinc-800/50 tracking-tight text-zinc-200">
                        <Plus size={24} className="text-orange-500" />
                        {isEditing ? 'Editar Usuário' : 'Instanciar Agente'}
                    </h2>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block ml-1">Nome do Agente/Vendedor</label>
                            <input
                                type="text"
                                value={nome}
                                onChange={e => setNome(e.target.value)}
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-bold shadow-sm transition-all text-zinc-200"
                                placeholder="Ex: João Silva"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block ml-1">Email de Acesso (Login)</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className={`w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-bold shadow-sm transition-all text-zinc-200 ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                placeholder="ex: vendas@frangatoys.com"
                                required
                                disabled={isEditing}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block ml-1">Comunicação / WhatsApp</label>
                            <input
                                type="tel"
                                value={telefone}
                                onChange={e => setTelefone(e.target.value)}
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-bold shadow-sm transition-all text-orange-200 font-mono"
                                placeholder="Ex: 5511999999999"
                            />
                            <p className="text-[9px] text-zinc-500 ml-1 font-medium italic">Inclua DDI (55) e DDD. Somente números.</p>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block ml-1 mb-2">Permissões de Acesso (Níveis)</label>
                            <div className="grid grid-cols-1 gap-2 p-4 bg-zinc-950 border border-zinc-800/50 rounded-2xl shadow-inner">
                                {AVAILABLE_ROLES.map(role => {
                                    const isSelected = selectedRoles.includes(role.id);
                                    return (
                                        <label key={role.id} className={`flex items-center justify-between group cursor-pointer p-3 rounded-xl border transition-all ${isSelected ? 'bg-orange-500/10 border-orange-500/30' : 'bg-transparent border-transparent hover:bg-zinc-900 hover:border-zinc-800'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="relative flex items-center justify-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleRole(role.id)}
                                                        className="w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-orange-500 focus:ring-0 focus:ring-offset-0 cursor-pointer transition-all"
                                                    />
                                                </div>
                                                <span className={`text-sm font-black tracking-tight ${isSelected ? 'text-orange-400' : 'text-zinc-500 group-hover:text-zinc-400'}`}>{role.label}</span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex gap-4 pt-6">
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-black py-4 rounded-2xl border border-zinc-800 transition-all shadow-sm active:scale-[0.98] uppercase tracking-widest text-xs"
                                >
                                    Cancelar
                                </button>
                            )}
                            <button
                                disabled={creating}
                                className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                            >
                                {creating ? <Loader2 className="animate-spin" size={18} /> : (isEditing ? 'SALVAR ALTERAÇÕES' : 'INSTANCIAR AGENTE')}
                            </button>
                        </div>
                    </form>
                </div>
                </div>
            </div>
        </div>
    );
}
