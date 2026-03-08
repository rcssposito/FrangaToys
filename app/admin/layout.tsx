
'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AuthProvider } from '@/hooks/usePermission';
import AdminSidebar from '@/components/AdminSidebar';

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
            // Default to true if no preference is saved yet
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

    return (
        <AuthProvider>
            <div className={`min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-16 md:pt-0 transition-all duration-300 ${isCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
                <AdminSidebar isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse} />
                <main className="p-4 md:p-8">
                    {children}
                </main>
            </div>
        </AuthProvider>
    );
}
