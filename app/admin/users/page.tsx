
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Trash2, Plus, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface User {
    id: number;
    email: string;
    roles: string[];
    created_at: string;
}

const AVAILABLE_ROLES = [
    { id: 'admin', label: 'Admin (Total)' },
    { id: 'sales', label: 'Vendas' },
    { id: 'pricing', label: 'Precificação' },
    { id: 'finance', label: 'Financeiro' },
];

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRoles, setSelectedRoles] = useState<string[]>(['sales']);
    const [creating, setCreating] = useState(false);

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

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, roles: selectedRoles }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success('Usuário criado!');
            setEmail('');
            setPassword('');
            setSelectedRoles(['sales']);
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setCreating(false);
        }
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
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                {/* Back button removed as Sidebar handles navigation, but kept for mobile/habit? 
                    Actually with Sidebar, breadcrumbs are better, but let's keep simple header.
                    Wait, the existing page had ArrowLeft to /admin.
                    With Sidebar, /admin is just another tab. 
                    I'll keep the header minimal.
                */}
                <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
                {/* Lista */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden h-fit">
                    <div className="p-4 border-b border-zinc-800 font-semibold text-zinc-300"> Usuários Cadastrados </div>
                    {loading ? (
                        <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-orange-500" /></div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-zinc-950 text-zinc-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Funções</th>
                                    <th className="p-4 text-right">Data</th>
                                    <th className="p-4 w-[50px]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="p-4 font-medium">{user.email}</td>
                                        <td className="p-4">
                                            <div className="flex gap-2 flex-wrap">
                                                {user.roles?.map(role => (
                                                    <span key={role} className={`text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 capitalize`}>
                                                        {role}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4 text-zinc-500 text-sm text-right">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Form */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-fit sticky top-8">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2 pb-4 border-b border-zinc-800">
                        <Plus size={18} className="text-orange-500" /> Novo Usuário
                    </h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="text-sm text-zinc-400 block mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 outline-none focus:border-orange-500 text-sm"
                                placeholder="ex: vendas@frangatoys.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm text-zinc-400 block mb-1">Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 outline-none focus:border-orange-500 text-sm"
                                placeholder="******"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm text-zinc-400 block mb-2">Permissões (Roles)</label>
                            <div className="flex flex-col gap-2">
                                {AVAILABLE_ROLES.map(role => (
                                    <label key={role.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-zinc-800/50 border border-transparent hover:border-zinc-700 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedRoles.includes(role.id)}
                                            onChange={() => toggleRole(role.id)}
                                            className="rounded border-zinc-700 bg-zinc-900 text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="text-sm">{role.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button
                            disabled={creating}
                            className="w-full bg-orange-600 hover:bg-orange-700 font-bold py-2 rounded transition-colors flex justify-center mt-4"
                        >
                            {creating ? <Loader2 className="animate-spin" size={20} /> : 'Cadastrar Usuário'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
