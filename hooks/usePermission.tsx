
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface User {
    id: number;
    email: string;
    roles?: string[];
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => void;
    hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const supabase = createClient();

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchUser();

        // Subscribe to Auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                fetchUser();
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                router.push('/admin/login');
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        // Redirect handled by onAuthStateChange
    };

    const hasRole = (role: string) => {
        if (!user || !user.roles) return false;
        // 'admin' has access to everything
        if (user.roles.includes('admin')) return true;
        return user.roles.includes(role);
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout, hasRole }}>
            {children}
        </AuthContext.Provider>
    );
}

export function usePermission() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('usePermission must be used within an AuthProvider');
    }
    return context;
}
