'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Trash2, Plus, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface User {
    id: number;
    email: string;
    created_at: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success('Usuário criado!');
            setEmail('');
            setPassword('');
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

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/admin" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
                </div>

                <div className="grid gap-8 md:grid-cols-[1fr_300px]">
                    {/* Lista */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-zinc-800 font-semibold"> Usuários Cadastrados </div>
                        {loading ? (
                            <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-orange-500" /></div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-zinc-950 text-zinc-400 text-sm">
                                    <tr>
                                        <th className="p-4">Email</th>
                                        <th className="p-4">Criado em</th>
                                        <th className="p-4 w-[50px]"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {users.map(user => (
                                        <tr key={user.id} className="hover:bg-zinc-800/50">
                                            <td className="p-4">{user.email}</td>
                                            <td className="p-4 text-zinc-400 text-sm">
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
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-fit">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Plus size={18} className="text-orange-500" /> Novo Usuário
                        </h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-sm text-zinc-400 block mb-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 outline-none focus:border-orange-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm text-zinc-400 block mb-1">Senha</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 outline-none focus:border-orange-500"
                                    required
                                />
                            </div>
                            <button
                                disabled={creating}
                                className="w-full bg-orange-600 hover:bg-orange-700 font-bold py-2 rounded transition-colors flex justify-center"
                            >
                                {creating ? <Loader2 className="animate-spin" size={20} /> : 'Cadastrar'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
