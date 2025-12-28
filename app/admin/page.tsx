
'use client';

import Link from 'next/link';
import { Users, Package, Settings, ShoppingCart } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';

export default function AdminDashboard() {
    const { hasRole } = usePermission();

    // Define cards with permission checks
    const cards = [
        {
            title: 'Gerenciar Usuários',
            desc: 'Adicionar ou remover administradores.',
            icon: Users,
            href: '/admin/users',
            color: 'text-orange-500',
            groupHover: 'group-hover:bg-orange-500/20',
            borderHover: 'hover:border-orange-500',
            roles: ['admin']
        },
        {
            title: 'Catálogo & Preços',
            desc: 'Defina pesos, horas e calcule preços.',
            icon: Package,
            href: '/admin/figures',
            color: 'text-blue-500',
            groupHover: 'group-hover:bg-blue-500/20',
            borderHover: 'hover:border-blue-500',
            roles: ['admin', 'pricing', 'sales']
        },
        {
            title: 'Vendas',
            desc: 'Histórico de vendas e lucros.',
            icon: ShoppingCart,
            href: '/admin/sales',
            color: 'text-green-500',
            groupHover: 'group-hover:bg-green-500/20',
            borderHover: 'hover:border-green-500',
            roles: ['admin', 'sales', 'finance']
        },
        {
            title: 'Configurações',
            desc: 'Preços de resina, hora e pintura.',
            icon: Settings,
            href: '/admin/settings',
            color: 'text-zinc-500',
            groupHover: 'group-hover:bg-zinc-700',
            borderHover: 'hover:border-zinc-500',
            roles: ['admin', 'pricing']
        }
    ];

    return (
        <div className="text-white">
            <header className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4">
                <div>
                    <h1 className="text-3xl font-bold">Painel Administrativo</h1>
                    <p className="text-zinc-400">Bem-vindo! Gerencie sua loja por aqui.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card) => {
                    const canView = card.roles.some(r => hasRole(r));
                    if (!canView) return null;

                    return (
                        <Link
                            key={card.href}
                            href={card.href}
                            className={`bg-zinc-900 p-6 rounded-xl border border-zinc-800 transition-all group ${card.borderHover}`}
                        >
                            <div className={`w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4 ${card.groupHover}`}>
                                <card.icon className={card.color} size={24} />
                            </div>
                            <h2 className="text-xl font-bold mb-2">{card.title}</h2>
                            <p className="text-zinc-400 text-sm">{card.desc}</p>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
