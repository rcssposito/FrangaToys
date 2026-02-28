
'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/hooks/usePermission';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/admin/login';

    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <AuthProvider>
            <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] md:pl-64 pt-16 md:pt-0 transition-colors duration-300">
                <AdminSidebar />
                <main className="p-4 md:p-8">
                    {children}
                </main>
            </div>
        </AuthProvider>
    );
}
