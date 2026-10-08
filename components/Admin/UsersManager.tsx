'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Trash2, Plus, Loader2, Users, ShieldCheck, Mail, Phone, Edit2, X } from 'lucide-react';

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
    { id: 'franga_studio', label: 'Franga Studio (Anti-Leak & Distribuição)' },
    { id: 'sales', label: 'Vendas' },
    { id: 'pricing', label: 'Precificação' },
    { id: 'finance', label: 'Financeiro' },
    { id: 'production', label: 'Produção' },
    { id: 'painter', label: 'Pintor (Freelancer)' },
];

export default function UsersManager() {
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

            toast.success(isEditing ? 'Usuário atualizado!' : 'Usuário cadastrado com sucesso!');

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
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Control Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950/40 border border-zinc-900 p-4 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                        <Users size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">
                            Equipe & Permissões ({users.length})
                        </h3>
                        <p className="text-[10px] text-zinc-500">
                            Gerencie os papéis de acesso de cada membro da equipe (admin, vendas, pintor, produção).
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => {
                        handleCancelEdit();
                        setIsModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black px-5 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 text-xs uppercase tracking-wider"
                >
                    <Plus size={16} strokeWidth={2.5} />
                    Novo Usuário
                </button>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center w-full">
                    <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {users.map(user => (
                        <div key={user.id} className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-5 shadow-sm flex flex-col relative group transition-colors hover:border-zinc-800">
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 font-black text-lg shadow-sm">
                                    {(user.nome || user.email).charAt(0).toUpperCase()}
                                </div>
                                <div className="flex gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(user)}
                                        className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all"
                                        title="Editar Usuário"
                                    >
                                        <Edit2 size={13} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        className="p-1.5 text-zinc-400 hover:text-red-400 bg-zinc-900 border border-zinc-800 hover:border-red-500/30 hover:bg-red-500/10 rounded-lg transition-all"
                                        title="Excluir Usuário"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-0.5 mb-4">
                                <h4 className="font-black text-white text-base tracking-tight truncate" title={user.nome || user.email}>
                                    {user.nome || user.email.split('@')[0]}
                                </h4>
                                <p className="text-[11px] text-zinc-500 font-mono truncate" title={user.email}>
                                    {user.email}
                                </p>
                                {user.telefone && (
                                    <p className="text-[10px] text-zinc-600 font-mono truncate">
                                        {user.telefone}
                                    </p>
                                )}
                            </div>

                            <div className="mt-auto pt-3 border-t border-zinc-900 flex flex-wrap gap-1">
                                {user.roles?.map(role => (
                                    <span 
                                        key={role}
                                        className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                                            role === 'franga_studio'
                                                ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                                                : role === 'admin'
                                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                                        }`}
                                    >
                                        {role === 'franga_studio' ? 'Franga Studio' : role}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Criação / Edição de Usuário */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#09090b] border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-black/30">
                            <div>
                                <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                                    <ShieldCheck size={18} className="text-blue-500" />
                                    {isEditing ? 'Editar Membro da Equipe' : 'Cadastrar Membro da Equipe'}
                                </h3>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                                    Defina o acesso e as funções operacionais
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-500 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-5 flex flex-col gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">E-mail de Acesso</label>
                                <input
                                    required
                                    type="email"
                                    value={email}
                                    disabled={isEditing}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="usuario@frangatoys.com.br"
                                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-all font-bold placeholder-zinc-700 text-xs disabled:opacity-50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nome</label>
                                    <input
                                        type="text"
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        placeholder="Nome completo"
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-all font-bold placeholder-zinc-700 text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">WhatsApp / Telefone</label>
                                    <input
                                        type="text"
                                        value={telefone}
                                        onChange={(e) => setTelefone(e.target.value)}
                                        placeholder="(11) 99999-9999"
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-all font-bold placeholder-zinc-700 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 pt-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Funções & Permissões</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {AVAILABLE_ROLES.map(role => {
                                        const isSelected = selectedRoles.includes(role.id);
                                        return (
                                            <button
                                                key={role.id}
                                                type="button"
                                                onClick={() => toggleRole(role.id)}
                                                className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all flex items-center justify-between ${
                                                    isSelected
                                                        ? 'bg-blue-600/10 border-blue-500/40 text-blue-400'
                                                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                                                }`}
                                            >
                                                <span>{role.label}</span>
                                                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] font-black ${
                                                    isSelected ? 'bg-blue-500 border-blue-400 text-white' : 'border-zinc-700'
                                                }`}>
                                                    {isSelected ? '✓' : ''}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-3 flex gap-2 border-t border-zinc-800 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-wider text-xs transition-colors flex justify-center items-center gap-2"
                                >
                                    {creating ? <Loader2 size={14} className="animate-spin" /> : (isEditing ? 'Salvar Alterações' : 'Criar Usuário')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
