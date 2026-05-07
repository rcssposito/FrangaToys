
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
    PackageOpen,
    PanelLeftClose,
    PanelLeftOpen,
    ShieldCheck,
    TrendingUp,
    Flame
} from 'lucide-react';
import ThemeToggle from '@/components/common/ThemeToggle';

interface AdminSidebarProps {
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

export default function AdminSidebar({ isCollapsed, onToggleCollapse }: AdminSidebarProps) {
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
            name: 'Popularidade',
            href: '/admin/popular',
            icon: TrendingUp,
            roles: ['admin', 'sales', 'pricing', 'orcamento']
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
            name: 'Clientes',
            href: '/admin/customers',
            icon: Users,
            roles: ['admin', 'sales', 'finance']
        },
        {
            name: 'Comissões',
            href: '/admin/commissions',
            icon: DollarSign,
            roles: ['admin', 'finance', 'sales']
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
            icon: ShieldCheck,
            roles: ['admin']
        },
        {
            name: 'Campanhas',
            href: '/admin/campaigns',
            icon: Flame,
            roles: ['admin', 'sales', 'pricing']
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
            <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-[var(--card-bg)] border-b border-[var(--card-border)] flex items-center justify-between px-6 z-40 shadow-sm transition-colors duration-300">
                <h1 className="text-xl font-black text-orange-500 flex items-center gap-2 tracking-tighter">
                    <Store size={28} strokeWidth={2.5} />
                    FRANGA<span className="text-[var(--foreground)] opacity-90">ADMIN</span>
                </h1>
                <button onClick={() => setIsOpen(!isOpen)} className="p-2.5 bg-[var(--input-bg)] rounded-xl text-[var(--text-muted)] hover:text-orange-500 border border-[var(--card-border)] transition-all active:scale-90">
                    {isOpen ? <X size={24} strokeWidth={2.5} /> : <Menu size={24} strokeWidth={2.5} />}
                </button>
            </div>

            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-[var(--background)]/60 backdrop-blur-md z-40 transition-all duration-500"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={`
                bg-[var(--card-bg)] border-r border-[var(--card-border)] h-screen fixed left-0 top-0 flex flex-col z-50
                transition-all duration-300 ease-in-out shadow-[var(--shadow-xl)]
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
                ${isCollapsed ? 'w-20' : 'w-64'}
            `}>
                {/* Header */}
                <div className={`p-8 border-b border-[var(--card-border)] bg-[var(--background)]/10 transition-all ${isCollapsed ? 'px-4 flex justify-center' : ''}`}>
                    <h1 className={`text-2xl font-black text-orange-500 flex items-center tracking-tighter ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                        <Store size={isCollapsed ? 28 : 32} strokeWidth={2.5} className="shrink-0" />
                        {!isCollapsed && (
                            <div className="animate-in fade-in duration-300">
                                <p className="leading-tight">FRANGA</p>
                                <p className="text-[var(--foreground)] opacity-90 leading-tight">ADMIN</p>
                            </div>
                        )}
                    </h1>
                    {!isCollapsed && (
                        <div className="flex items-center gap-2 mt-4 animate-in fade-in duration-300">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Chiaroscuro v2.0</p>
                        </div>
                    )}
                </div>

                {/* Header Actions (Collapse & Theme) */}
                <div className={`hidden md:flex p-3 border-b border-[var(--card-border)] bg-[var(--background)]/5 items-center ${isCollapsed ? 'flex-col gap-4' : 'justify-between px-6'}`}>
                    <button
                        onClick={onToggleCollapse}
                        className="p-2 flex items-center justify-center text-[var(--text-muted)] hover:text-orange-500 hover:bg-[var(--input-bg)] rounded-xl transition-all"
                        title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
                    >
                        {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                    </button>
                    <ThemeToggle />
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-5 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => {
                        const canView = item.roles.some(r => hasRole(r));
                        if (!canView) return null;

                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                title={isCollapsed ? item.name : undefined}
                                className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3.5 rounded-2xl transition-all relative group overflow-hidden ${isActive
                                    ? 'bg-orange-500 text-white font-black shadow-lg shadow-orange-500/20 active:scale-95'
                                    : 'text-[var(--text-muted)] hover:bg-[var(--input-bg)] hover:text-[var(--foreground)] font-bold'
                                    }`}
                            >
                                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={`${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:text-orange-500'} transition-all shrink-0`} />
                                {!isCollapsed && (
                                    <span className="text-sm tracking-tight whitespace-nowrap animate-in fade-in duration-300">{item.name}</span>
                                )}
                                {!isCollapsed && isActive && (
                                    <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white/40" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Navigation ends, no collapse button here anymore */}

                {/* User & Logout */}
                <div className={`p-6 border-t border-[var(--card-border)] bg-[var(--background)]/20 backdrop-blur-sm flex flex-col gap-4 ${isCollapsed ? 'items-center px-2' : ''}`}>
                    <Link href="/admin/profile" className={`flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 p-3'} bg-[var(--input-bg)] hover:bg-[var(--card-bg)] rounded-[1.25rem] border border-[var(--card-border)] transition-all group shadow-sm active:scale-95`} title={isCollapsed ? "Perfil" : undefined}>
                        <div className="w-10 h-10 shrink-0 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-sm font-black text-orange-500 group-hover:scale-110 transition-all shadow-inner">
                            {user?.email?.[0].toUpperCase()}
                        </div>
                        {!isCollapsed && (
                            <div className="overflow-hidden animate-in fade-in duration-300">
                                <p className="text-xs font-black text-[var(--foreground)] truncate group-hover:text-orange-500 transition-colors uppercase tracking-tight">{user?.email?.split('@')[0]}</p>
                                <p className="text-[9px] text-[var(--text-muted)] truncate font-black uppercase tracking-widest opacity-60">
                                    {user?.roles?.[0]}
                                </p>
                            </div>
                        )}
                    </Link>

                    <div className={`flex items-center ${isCollapsed ? 'flex-col gap-4' : 'gap-3'}`}>
                        <button
                            onClick={logout}
                            title={isCollapsed ? "Sair" : undefined}
                            className={`flex flex-1 items-center justify-center gap-2 ${isCollapsed ? 'w-10 h-10 p-0 rounded-xl' : 'px-4 py-3 rounded-xl'} bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white transition-all font-black uppercase tracking-widest border border-red-500/20 hover:border-red-500 shadow-sm active:scale-95`}
                        >
                            <LogOut size={isCollapsed ? 18 : 16} strokeWidth={2.5} />
                            {!isCollapsed && <span className="text-[10px]">SAIR</span>}
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
