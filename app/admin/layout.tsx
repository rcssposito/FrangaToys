
'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AuthProvider } from '@/hooks/usePermission';
import AdminSidebar from '@/components/AdminSidebar';
import { AuthGuard } from '@/components/AuthGuard';

const routeRoles: Record<string, string[]> = {
    '/admin': ['admin', 'sales', 'pricing', 'finance', 'orcamento', 'production', 'painter'],
    '/admin/profile': ['admin', 'sales', 'pricing', 'finance', 'orcamento', 'production', 'painter'],
    '/admin/figures': ['admin', 'pricing', 'orcamento'],
    '/admin/popular': ['admin', 'sales', 'pricing', 'orcamento'],
    '/admin/campaigns': ['admin', 'sales', 'pricing'],
    '/admin/sales': ['admin', 'sales', 'finance'],
    '/admin/sales/new': ['admin', 'sales', 'finance'],
    '/admin/kanban': ['admin', 'sales', 'production', 'painter'],
    '/admin/customers': ['admin', 'sales', 'finance'],
    '/admin/commissions': ['admin', 'finance', 'sales'],
    '/admin/studios': ['admin', 'pricing'],
    '/admin/users': ['admin'],
    '/admin/coupons': ['admin', 'sales'],
    '/admin/settings': ['admin']
};

const getRequiredRoles = (path: string): string[] => {
    if (routeRoles[path]) return routeRoles[path];
    
    // Checa sub-rotas (ex: /admin/sales/123)
    const baseRoute = Object.keys(routeRoles)
        .sort((a, b) => b.length - a.length)
        .find(route => path.startsWith(route) && route !== '/admin');
        
    if (baseRoute) return routeRoles[baseRoute];
    
    return ['admin'];
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/admin/login';
    const [isCollapsed, setIsCollapsed] = useState(true);

    // Persist layout preference
    useEffect(() => {
        const saved = localStorage.getItem('adminSidebarCollapsed');
        if (saved !== null) {
            setIsCollapsed(JSON.parse(saved));
        } else {
            setIsCollapsed(true);
        }
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('adminSidebarCollapsed', JSON.stringify(newState));
    };

    if (isLoginPage) {
        return <>{children}</>;
    }

    const requiredRoles = getRequiredRoles(pathname);

    return (
        <AuthProvider>
            <div className={`min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-16 md:pt-0 transition-all duration-300 ${isCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
                <AdminSidebar isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse} />
                <main className="p-4 md:p-8">
                    <AuthGuard allowedRoles={requiredRoles}>
                        {children}
                    </AuthGuard>
                </main>
            </div>
        </AuthProvider>
    );
}
