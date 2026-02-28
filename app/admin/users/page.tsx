
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Trash2, Plus, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface User {
    id: number;
    email: string;
    nome?: string;
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
];

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nome, setNome] = useState('');
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
            const body = { email, password, roles: selectedRoles, nome };

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
            setPassword('');
            setNome('');
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
        setSelectedRoles(user.roles || []);
        setPassword(''); // Don't fill password
        setIsEditing(true);
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEmail('');
        setPassword('');
        setNome('');
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
        <div className="max-w-6xl mx-auto transition-colors duration-300">
            <div className="flex items-center gap-4 mb-10">
                <div className="p-3.5 bg-orange-500/10 text-orange-500 rounded-2xl shadow-sm border border-orange-500/20">
                    <Plus size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Gerenciar Usuários</h1>
                    <p className="text-[var(--text-muted)] text-sm font-medium mt-1">Controle de acessos e permissões para vendedores e administradores.</p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1fr_380px] items-start">
                {/* Lista */}
                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden shadow-[var(--shadow-md)] h-fit">
                    <div className="p-6 border-b border-[var(--card-border)] font-black text-[var(--foreground)] bg-[var(--background)]/30 backdrop-blur-sm tracking-tight flex items-center justify-between">
                        <span>Usuários Cadastrados</span>
                        <span className="bg-[var(--background)] px-3 py-1 rounded-full text-xs font-black text-[var(--text-muted)] border border-[var(--card-border)] shadow-sm">
                            {users.length}
                        </span>
                    </div>
                    {loading ? (
                        <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-orange-500 w-10 h-10" /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[var(--background)]/30">
                                    <tr className="text-[var(--text-muted)] text-[10px] uppercase font-black tracking-widest border-b border-[var(--card-border)]">
                                        <th className="p-5 pl-8">Vendedor</th>
                                        <th className="p-5">Email</th>
                                        <th className="p-5">Funções</th>
                                        <th className="p-5 text-right">Cadastrado</th>
                                        <th className="p-5 w-[100px]"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--card-border)]">
                                    {users.map(user => (
                                        <tr key={user.id} className="hover:bg-orange-500/[0.02] transition-colors group">
                                            <td className="p-5 pl-8">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-[var(--foreground)] text-lg tracking-tight">{user.nome || '--'}</span>
                                                </div>
                                            </td>
                                            <td className="p-5 text-sm text-[var(--text-muted)] font-medium font-mono">
                                                {user.email}
                                            </td>
                                            <td className="p-5">
                                                <div className="flex gap-2 flex-wrap">
                                                    {user.roles?.map(role => {
                                                        const roleLabel = AVAILABLE_ROLES.find(r => r.id === role)?.label || role;
                                                        return (
                                                            <span key={role} className="text-[10px] px-2.5 py-1 rounded-md bg-[var(--input-bg)] text-[var(--foreground)] border border-[var(--card-border)] font-black shadow-sm uppercase tracking-wider">
                                                                {roleLabel}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td className="p-5 text-[var(--text-muted)] text-xs text-right font-bold">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-5">
                                                <div className="flex gap-3 justify-end items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className="p-2.5 text-[var(--text-muted)] hover:text-orange-500 hover:bg-orange-500/10 border border-transparent hover:border-orange-500/20 rounded-xl transition-all shadow-sm"
                                                        title="Editar Usuário"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user.id)}
                                                        className="p-2.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all shadow-sm"
                                                        title="Excluir Usuário"
                                                    >
                                                        <Trash2 size={18} strokeWidth={2.5} />
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
                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8 h-fit sticky top-8 shadow-[var(--shadow-lg)]">
                    <h2 className="text-xl font-black mb-8 flex items-center gap-3 pb-5 border-b border-[var(--card-border)] tracking-tight">
                        <Plus size={24} className="text-orange-500" />
                        {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
                    </h2>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block ml-1">Nome do Vendedor</label>
                            <input
                                type="text"
                                value={nome}
                                onChange={e => setNome(e.target.value)}
                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-bold shadow-sm transition-all focus:ring-4 focus:ring-orange-500/5 text-[var(--foreground)]"
                                placeholder="Ex: João Silva"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block ml-1">Email de Acesso</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className={`w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-bold shadow-sm transition-all text-[var(--foreground)] ${isEditing ? 'opacity-50 cursor-not-allowed' : 'focus:ring-4 focus:ring-orange-500/5'}`}
                                placeholder="ex: vendas@frangatoys.com"
                                required
                                disabled={isEditing}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block ml-1">
                                {isEditing ? 'Nova Senha (Opcional)' : 'Senha'}
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-bold shadow-sm transition-all focus:ring-4 focus:ring-orange-500/5 text-[var(--foreground)]"
                                placeholder={isEditing ? "Deixe em branco para manter" : "******"}
                                required={!isEditing}
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block ml-1">Permissões (Roles)</label>
                            <div className="grid grid-cols-1 gap-2.5 p-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-2xl shadow-inner">
                                {AVAILABLE_ROLES.map(role => (
                                    <label key={role.id} className="flex items-center justify-between group cursor-pointer p-3 rounded-xl hover:bg-[var(--card-bg)] border border-transparent hover:border-[var(--card-border)] transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRoles.includes(role.id)}
                                                    onChange={() => toggleRole(role.id)}
                                                    className="w-5 h-5 rounded-md border-[var(--card-border)] bg-[var(--background)] text-orange-500 focus:ring-orange-500 transition-all cursor-pointer shadow-sm"
                                                />
                                            </div>
                                            <span className="text-sm font-black tracking-tight text-[var(--foreground)] opacity-80 group-hover:opacity-100">{role.label}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="flex-1 bg-[var(--input-bg)] hover:bg-[var(--card-bg)] text-[var(--text-muted)] font-black py-4 rounded-2xl border border-[var(--card-border)] transition-all shadow-sm active:scale-95"
                                >
                                    CANCELAR
                                </button>
                            )}
                            <button
                                disabled={creating}
                                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                {creating ? <Loader2 className="animate-spin" size={20} /> : (isEditing ? 'SALVAR' : 'CADASTRAR')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
