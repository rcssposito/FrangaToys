import Link from 'next/link';
import { Users, Package, Settings, LogOut } from 'lucide-react';

export default function AdminDashboard() {
    return (
        <div className="min-h-screen bg-black text-white p-8">
            <header className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4">
                <div>
                    <h1 className="text-3xl font-bold">Painel Administrativo</h1>
                    <p className="text-zinc-400">Bem-vindo! Gerencie sua loja por aqui.</p>
                </div>

                {/* Futuro Botão de Logout */}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card Usuários */}
                <Link href="/admin/users" className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-orange-500 transition-all group">
                    <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-orange-500/20">
                        <Users className="text-orange-500" size={24} />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Gerenciar Usuários</h2>
                    <p className="text-zinc-400 text-sm">Adicionar ou remover administradores.</p>
                </Link>

                {/* Card Figuras (Data Grid) */}
                <Link href="/admin/figures" className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-blue-500 transition-all group">
                    <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-500/20">
                        <Package className="text-blue-500" size={24} />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Catálogo & Preços</h2>
                    <p className="text-zinc-400 text-sm">Defina pesos, horas e calcule preços.</p>
                </Link>

                {/* Card Vendas */}
                <Link href="/admin/sales" className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-green-500 transition-all group">
                    <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-500/20">
                        <Package className="text-green-500" size={24} />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Vendas</h2>
                    <p className="text-zinc-400 text-sm">Histórico de vendas e lucros.</p>
                </Link>

                {/* Settings */}
                <Link href="/admin/settings" className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-zinc-500 transition-all group">
                    <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-zinc-700">
                        <Settings className="text-zinc-500 group-hover:text-white" size={24} />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Configurações</h2>
                    <p className="text-zinc-400 text-sm">Preços de resina, hora e pintura.</p>
                </Link>            </div>
        </div>
    );
}
