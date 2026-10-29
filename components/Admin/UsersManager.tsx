'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Trash2, Plus, Loader2, Users, ShieldCheck, Mail, Phone, Edit2, X, Check, Filter } from 'lucide-react';

interface User {
    id: number;
    email: string;
    nome?: string;
    telefone?: string;
    roles: string[];
    created_at: string;
}

const AVAILABLE_ROLES = [
    { id: 'admin', label: 'Admin (Total)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    { id: 'franga_studio', label: 'Franga Studio (Anti-Leak)', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
    { id: 'sales', label: 'Vendas', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    { id: 'pricing', label: 'Precificação', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
    { id: 'finance', label: 'Financeiro', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
    { id: 'production', label: 'Produção', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
    { id: 'painter', label: 'Pintor (Freelancer)', color: 'text-pink-400 bg-pink-500/10 border-pink-500/30' },
];

export default function UsersManager() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

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

            toast.success(isEditing ? 'Usuário atualizado com sucesso!' : 'Novo usuário cadastrado!');

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
        if (!confirm('Tem certeza que deseja revogar o acesso deste usuário?')) return;

        try {
            const res = await fetch('/api/admin/users', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });

            if (!res.ok) throw new Error('Erro ao deletar');

            toast.success('Acesso de usuário revogado');
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

    const filteredUsers = useMemo(() => {
        if (selectedRoleFilter === 'all') return users;
        return users.filter(u => u.roles?.includes(selectedRoleFilter));
    }, [users, selectedRoleFilter]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Control Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/50 border border-zinc-800/80 p-5 rounded-2xl">
                <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl shrink-0">
                        <Users size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">
                                Equipe & Permissões
                            </h3>
                            <span className="text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700/60 px-2 py-0.5 rounded-full">
                                {users.length} {users.length === 1 ? 'membro' : 'membros'}
                            </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            Controle de acessos, papéis operacionais e proteção contra vazamento.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            handleCancelEdit();
                            setIsModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-black px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/15 transition-all active:scale-95 text-xs uppercase tracking-wider cursor-pointer"
                    >
                        <Plus size={16} strokeWidth={2.5} />
                        Novo Membro
                    </button>
                </div>
            </div>

            {/* Role Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1 shrink-0 mr-1">
                    <Filter size={12} /> Papel:
                </span>
                <button
                    onClick={() => setSelectedRoleFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        selectedRoleFilter === 'all'
                            ? 'bg-zinc-100 text-zinc-950 font-black shadow-sm'
                            : 'bg-zinc-900/70 border border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                >
                    Todos ({users.length})
                </button>
                {AVAILABLE_ROLES.map(role => {
                    const count = users.filter(u => u.roles?.includes(role.id)).length;
                    const isActive = selectedRoleFilter === role.id;
                    return (
                        <button
                            key={role.id}
                            onClick={() => setSelectedRoleFilter(role.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                                isActive
                                    ? 'bg-orange-500 text-white font-black shadow-sm'
                                    : 'bg-zinc-900/70 border border-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                        >
                            <span>{role.label.split(' ')[0]}</span>
                            <span className="text-[10px] font-mono opacity-80">({count})</span>
                        </button>
                    );
                })}
            </div>

            {/* Users Grid */}
            {loading ? (
                <div className="py-20 flex justify-center w-full">
                    <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-12 text-center space-y-2">
                    <Users size={28} className="mx-auto text-zinc-600" />
                    <p className="text-sm font-bold text-zinc-300">Nenhum membro encontrado neste filtro</p>
                    <p className="text-xs text-zinc-500">Tente selecionar outro papel de acesso ou limpe o filtro ativo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredUsers.map(user => (
                        <div key={user.id} className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 shadow-sm flex flex-col relative group transition-all hover:border-zinc-700/80 hover:bg-zinc-900/60">
                            <div className="flex items-start justify-between mb-3.5">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/60 flex items-center justify-center text-zinc-200 font-black text-base shadow-sm">
                                    {(user.nome || user.email).charAt(0).toUpperCase()}
                                </div>
                                <div className="flex gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(user)}
                                        className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/80 border border-zinc-700/60 hover:border-zinc-600 rounded-lg transition-all cursor-pointer"
                                        title="Editar Membro"
                                    >
                                        <Edit2 size={13} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        className="p-1.5 text-zinc-400 hover:text-red-400 bg-zinc-800/80 border border-zinc-700/60 hover:border-red-500/30 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                                        title="Revogar Acesso"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1 mb-4 flex-1">
                                <h4 className="font-bold text-white text-sm tracking-tight truncate" title={user.nome || user.email}>
                                    {user.nome || user.email.split('@')[0]}
                                </h4>
                                <p className="text-[11px] text-zinc-400 font-mono truncate flex items-center gap-1.5" title={user.email}>
                                    <Mail size={11} className="text-zinc-500 shrink-0" />
                                    <span className="truncate">{user.email}</span>
                                </p>
                                {user.telefone && (
                                    <p className="text-[10px] text-zinc-500 font-mono truncate flex items-center gap-1.5">
                                        <Phone size={10} className="text-zinc-600 shrink-0" />
                                        <span>{user.telefone}</span>
                                    </p>
                                )}
                            </div>

                            <div className="pt-3 border-t border-zinc-800/70 flex flex-wrap gap-1.5">
                                {user.roles?.map(role => {
                                    const meta = AVAILABLE_ROLES.find(r => r.id === role);
                                    return (
                                        <span 
                                            key={role}
                                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                                meta ? meta.color : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60'
                                            }`}
                                        >
                                            {role === 'franga_studio' ? 'Franga Studio' : role}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Criação / Edição de Usuário */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-5 border-b border-zinc-800/80 flex justify-between items-center bg-zinc-900/40">
                            <div>
                                <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                                    <ShieldCheck size={18} className="text-orange-400" />
                                    {isEditing ? 'Editar Membro da Equipe' : 'Novo Membro da Equipe'}
                                </h3>
                                <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                                    Defina o acesso operacional e as permissões de módulo
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-colors cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">E-mail de Acesso</label>
                                <input
                                    required
                                    type="email"
                                    value={email}
                                    disabled={isEditing}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="usuario@frangatoys.com.br"
                                    className="w-full bg-zinc-900/90 border border-zinc-800 text-white rounded-xl px-4 py-2.5 outline-none focus:border-orange-500 font-medium transition-all placeholder-zinc-600 text-xs disabled:opacity-50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Nome Completo</label>
                                    <input
                                        type="text"
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        placeholder="Ex: João da Silva"
                                        className="w-full bg-zinc-900/90 border border-zinc-800 text-white rounded-xl px-4 py-2.5 outline-none focus:border-orange-500 font-medium transition-all placeholder-zinc-600 text-xs"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">WhatsApp / Telefone</label>
                                    <input
                                        type="text"
                                        value={telefone}
                                        onChange={(e) => setTelefone(e.target.value)}
                                        placeholder="(11) 99999-9999"
                                        className="w-full bg-zinc-900/90 border border-zinc-800 text-white rounded-xl px-4 py-2.5 outline-none focus:border-orange-500 font-medium transition-all placeholder-zinc-600 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Funções & Permissões Atribuídas</label>
                                    <span className="text-[10px] font-mono text-zinc-500">{selectedRoles.length} selecionada(s)</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {AVAILABLE_ROLES.map(role => {
                                        const isSelected = selectedRoles.includes(role.id);
                                        return (
                                            <button
                                                key={role.id}
                                                type="button"
                                                onClick={() => toggleRole(role.id)}
                                                className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all flex items-center justify-between cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-orange-500/10 border-orange-500/40 text-orange-400'
                                                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                                                }`}
                                            >
                                                <span className="truncate pr-2">{role.label}</span>
                                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 text-[9px] font-black ${
                                                    isSelected ? 'bg-orange-500 border-orange-400 text-white' : 'border-zinc-700 text-transparent'
                                                }`}>
                                                    <Check size={10} strokeWidth={3} />
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-3 flex gap-2.5 border-t border-zinc-800/80 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-wider text-xs transition-colors flex justify-center items-center gap-2 cursor-pointer shadow-lg shadow-orange-500/15"
                                >
                                    {creating ? <Loader2 size={14} className="animate-spin" /> : (isEditing ? 'Salvar Alterações' : 'Cadastrar Membro')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

