
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePermission } from '@/hooks/usePermission';
import {
    LayoutDashboard,
    Users,
    Package,
    ShoppingCart,
    Settings,
    LogOut,
    Store,
    Activity,
    DollarSign,
    Menu,
    X,
    KanbanSquare,
    PackageOpen
} from 'lucide-react';

export default function AdminSidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const { hasRole, logout, user } = usePermission();

    const menuItems = [
        {
            name: 'Dashboard',
            href: '/admin',
            icon: LayoutDashboard,
            roles: ['admin', 'sales', 'pricing', 'finance', 'orcamento']
        },
        {
            name: 'Catálogo',
            href: '/admin/figures',
            icon: Package,
            roles: ['admin', 'pricing', 'orcamento']
        },
        {
            name: 'Vendas',
            href: '/admin/sales',
            icon: ShoppingCart,
            roles: ['admin', 'sales']
        },
        {
            name: 'Kanban',
            href: '/admin/kanban',
            icon: KanbanSquare,
            roles: ['admin', 'sales', 'production']
        },
        {
            name: 'Comissões',
            href: '/admin/commissions',
            icon: DollarSign,
            roles: ['admin']
        },
        {
            name: 'Estoque',
            href: '/admin/inventory',
            icon: PackageOpen,
            roles: ['admin', 'sales']
        },
        {
            name: 'Estúdios',
            href: '/admin/studios',
            icon: Activity,
            roles: ['admin']
        },
        {
            name: 'Usuários',
            href: '/admin/users',
            icon: Users,
            roles: ['admin']
        },
        {
            name: 'Configurações',
            href: '/admin/settings',
            icon: Settings,
            roles: ['admin']
        }
    ];

    return (
        <>
            {/* Mobile Header Toggle */}
            <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between px-4 z-40">
                <h1 className="text-xl font-bold text-orange-500 flex items-center gap-2">
                    <Store size={24} />
                    FrangaAdmin
                </h1>
                <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-zinc-400 hover:text-white">
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={`
                w-64 bg-zinc-950 border-r border-zinc-900 h-screen fixed left-0 top-0 flex flex-col z-50
                transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0
            `}>
                {/* Header */}
                <div className="p-6 border-b border-zinc-900">
                    <h1 className="text-xl font-bold text-orange-500 flex items-center gap-2">
                        <Store size={24} />
                        FrangaAdmin
                    </h1>
                    <p className="text-xs text-zinc-500 mt-1">v2.0 RBAC Active</p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => {
                        // Check if user has ANY of the required roles (or is admin)
                        // The hasRole function checks if user has specific role OR admin.
                        // But here we might pass array. Let's simplify:
                        // If item.roles includes ANY of user.roles -> Show.
                        // But hasRole checks one role.
                        // Let's iterate.

                        const canView = item.roles.some(r => hasRole(r));

                        if (!canView) return null;

                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-orange-500/10 text-orange-500'
                                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                                    }`}
                            >
                                <item.icon size={20} />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User & Logout */}
                <div className="p-4 border-t border-zinc-900">
                    <Link href="/admin/profile" className="flex items-center gap-3 mb-4 px-2 hover:bg-zinc-900 mx-[-8px] py-2 rounded-lg transition-colors group">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 group-hover:text-white group-hover:bg-zinc-700 transition-colors">
                            {user?.email?.[0].toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-white truncate group-hover:text-orange-500 transition-colors">{user?.email}</p>
                            <p className="text-xs text-zinc-500 truncate capitalize">
                                {user?.roles?.join(', ')}
                            </p>
                        </div>
                    </Link>

                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-lg transition-colors text-sm"
                    >
                        <LogOut size={16} />
                        Sair
                    </button>
                </div>
            </aside>
        </>
    );
}
