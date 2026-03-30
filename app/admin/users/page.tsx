
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
    const [isModalOpen, setIsModalOpen] = useState(false);

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
            setIsModalOpen(false);
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
        setIsModalOpen(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setIsModalOpen(false);
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
        <div className="min-h-screen bg-black text-zinc-200 p-4 md:p-8 relative overflow-x-hidden">
            {/* Background Blob subdues orange neon */}
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-zinc-900/40 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="max-w-7xl mx-auto relative z-10 transition-colors duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 mt-2">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white rounded-2xl transition-all shadow-sm text-zinc-500 group">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </Link>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                                Usuários
                                <span className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full text-sm font-black border border-zinc-700">
                                    {users.length}
                                </span>
                            </h1>
                            <p className="text-zinc-500 text-sm font-medium mt-1 uppercase tracking-widest text-[10px]">Controle de acessos e permissões.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            handleCancelEdit(); // ensure clean state
                            setIsModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-black font-black px-6 py-3 rounded-2xl shadow-sm transition-all active:scale-95 text-xs uppercase tracking-widest"
                    >
                        <Plus size={18} strokeWidth={3} />
                        Instanciar Agente
                    </button>
                </div>

                {loading ? (
                    <div className="py-24 flex justify-center w-full"><Loader2 className="animate-spin text-zinc-500 w-12 h-12" /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                        {users.map(user => (
                            <div key={user.id} className="bg-zinc-950/60 backdrop-blur-sm border border-zinc-800/80 rounded-3xl p-6 shadow-sm flex flex-col relative group transition-colors hover:border-zinc-700">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 font-black text-xl shadow-sm">
                                        {(user.nome || user.email).charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className="p-2 text-zinc-500 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl transition-all"
                                            title="Editar Usuário"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="p-2 text-zinc-500 hover:text-red-400 bg-zinc-900 border border-zinc-800 hover:border-red-500/50 hover:bg-red-500/10 rounded-xl transition-all"
                                            title="Excluir Usuário"
                                        >
                                            <Trash2 size={14} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1 mb-5">
                                    <h3 className="font-black text-zinc-200 text-xl tracking-tight truncate" title={user.nome || user.email}>{user.nome || user.email.split('@')[0]}</h3>
                                    <p className="text-xs text-zinc-500 font-medium font-mono truncate" title={user.email}>{user.email}</p>
                                </div>

                                <div className="space-y-4 flex-1 flex flex-col justify-end">
                                    {user.telefone && (
                                        <div className="text-xs font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 py-2 px-3 rounded-lg font-bold tracking-tight inline-flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                            {user.telefone}
                                        </div>
                                    )}

                                    <div className="flex gap-1.5 flex-wrap pt-2 border-t border-zinc-900">
                                        {user.roles?.map(role => {
                                            const roleLabel = AVAILABLE_ROLES.find(r => r.id === role)?.label || role;
                                            const isAdmin = role === 'admin';
                                            return (
                                                <span key={role} className={`text-[9px] px-2 py-1 rounded bg-zinc-900 ${isAdmin ? 'text-zinc-300 border-zinc-600' : 'text-zinc-500 border-zinc-800'} border font-black uppercase tracking-widest whitespace-nowrap`}>
                                                    {roleLabel}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Slide-over Modal Form */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancelEdit}></div>
                    <div className="relative w-full max-w-md bg-zinc-950 border-l border-zinc-800 h-full p-8 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
                        <h2 className="text-xl font-black mb-8 flex items-center justify-between gap-3 pb-5 border-b border-zinc-800/50 tracking-tight text-zinc-200">
                            <span className="flex items-center gap-3">
                                <Plus size={24} className="text-zinc-500" />
                                {isEditing ? 'Editar Usuário' : 'Novo Agente'}
                            </span>
                            <button onClick={handleCancelEdit} className="text-zinc-500 hover:text-white bg-zinc-900 p-2 rounded-xl transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                        </h2>
                        
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block ml-1">Nome do Agente</label>
                                <input
                                    type="text"
                                    value={nome}
                                    onChange={e => setNome(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-zinc-500 text-sm font-bold shadow-sm transition-all text-zinc-200"
                                    placeholder="Ex: João Silva"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block ml-1">Email de Acesso</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className={`w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-zinc-500 text-sm font-bold shadow-sm transition-all text-zinc-200 ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    placeholder="ex: vendas@frangatoys.com"
                                    required
                                    disabled={isEditing}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block ml-1">WhatsApp</label>
                                <input
                                    type="tel"
                                    value={telefone}
                                    onChange={e => setTelefone(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-zinc-500 text-sm font-bold shadow-sm transition-all text-zinc-300 font-mono"
                                    placeholder="Ex: 5511999999999"
                                />
                            </div>

                            <div className="space-y-4 pt-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block ml-1 mb-2">Permissões de Acesso</label>
                                <div className="grid grid-cols-1 gap-2 p-4 bg-zinc-900 border border-zinc-800/80 rounded-2xl shadow-inner">
                                    {AVAILABLE_ROLES.map(role => {
                                        const isSelected = selectedRoles.includes(role.id);
                                        return (
                                            <label key={role.id} className={`flex items-center justify-between group cursor-pointer p-3 rounded-xl border transition-all ${isSelected ? 'bg-zinc-800 border-zinc-600' : 'bg-transparent border-transparent hover:bg-zinc-800 hover:border-zinc-700'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="relative flex items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleRole(role.id)}
                                                            className="w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-zinc-300 focus:ring-0 focus:ring-offset-0 cursor-pointer transition-all"
                                                        />
                                                    </div>
                                                    <span className={`text-sm font-black tracking-tight ${isSelected ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-400'}`}>{role.label}</span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex pt-6">
                                <button
                                    disabled={creating}
                                    className="w-full bg-zinc-200 hover:bg-white disabled:opacity-50 text-black font-black py-4 rounded-2xl transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                                >
                                    {creating ? <Loader2 className="animate-spin text-zinc-500" size={18} /> : (isEditing ? 'SALVAR ALTERAÇÕES' : 'INSTANCIAR AGENTE')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
