
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
import ThemeToggle from '@/components/common/ThemeToggle';

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
            roles: ['admin', 'sales', 'finance']
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
            roles: ['admin', 'finance']
        },
        {
            name: 'Estoque',
            href: '/admin/inventory',
            icon: PackageOpen,
            roles: ['admin', 'sales', 'production']
        },
        {
            name: 'Estúdios',
            href: '/admin/studios',
            icon: Activity,
            roles: ['admin', 'pricing']
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
            <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-[var(--card-bg)] border-b border-[var(--card-border)] flex items-center justify-between px-4 z-40">
                <h1 className="text-xl font-bold text-orange-500 flex items-center gap-2">
                    <Store size={24} />
                    FrangaAdmin
                </h1>
                <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-[var(--text-muted)] hover:text-orange-500 transition-colors">
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-all"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={`
                w-64 bg-[var(--card-bg)] border-r border-[var(--card-border)] h-screen fixed left-0 top-0 flex flex-col z-50
                transition-all duration-300 ease-in-out shadow-[var(--shadow-md)]
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0
            `}>
                {/* Header */}
                <div className="p-6 border-b border-[var(--card-border)]">
                    <h1 className="text-xl font-bold text-orange-500 flex items-center gap-2">
                        <Store size={24} />
                        FrangaAdmin
                    </h1>
                    <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">v2.0 Chiaroscuro Ready</p>
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
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                                    ? 'bg-orange-500/10 text-orange-500 font-bold shadow-sm'
                                    : 'text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--foreground)]'
                                    }`}
                            >
                                <item.icon size={20} />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User & Logout */}
                <div className="p-4 border-t border-[var(--card-border)] bg-[var(--background)]/50">
                    <Link href="/admin/profile" className="flex items-center gap-3 mb-4 px-2 hover:bg-[var(--input-bg)] mx-[-8px] py-2 rounded-lg transition-all group">
                        <div className="w-8 h-8 rounded-full bg-[var(--input-bg)] border border-[var(--input-border)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] group-hover:text-orange-500 group-hover:border-orange-500/30 transition-all shadow-sm">
                            {user?.email?.[0].toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-[var(--foreground)] truncate group-hover:text-orange-500 transition-colors">{user?.email}</p>
                            <p className="text-[10px] text-[var(--text-muted)] truncate capitalize font-medium tracking-tight">
                                {user?.roles?.join(' • ')}
                            </p>
                        </div>
                    </Link>

                    <button
                        onClick={logout}
                        className="flex-1 flex items-center gap-2 px-4 py-2.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all text-sm font-medium border border-transparent hover:border-red-500/10"
                    >
                        <LogOut size={16} />
                        Sair
                    </button>
                    <ThemeToggle />
                </div>
            </aside>
        </>
    );
}
