
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
            <div className="min-h-screen bg-black text-white md:pl-64">
                <AdminSidebar />
                <main className="p-8">
                    {children}
                </main>
            </div>
        </AuthProvider>
    );
}
