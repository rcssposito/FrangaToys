
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Unauthorized');
            })
            .then(data => setUser(data.user))
            .catch(() => setUser(null)) // Dont redirect here, middleware handles it. This is just for UI state.
            .finally(() => setLoading(false));
    }, []);

    const logout = async () => {
        // Implement logout logic (clear cookie typically done via API)
        // For now just client side clear
        await fetch('/api/auth/logout', { method: 'POST' }); // We need to create this maybe? Or just use existing pattern?
        // Actually earlier pattern was just direct redirect, let's assume we implement a simple logout api later or handled by client clearing if needed.
        // For simplicity now, just redirect to login which might clear cookies or just manual expire.
        // Let's rely on standard practice: call logout API.

        // Wait, we don't have a logout API yet in the plan effectively. Let's add a clear cookie logic if needed.
        // Or cleaner: delete cookie using server action or route handler.
        document.cookie = 'admin_session=; Max-Age=0; path=/;';
        setUser(null);
        router.push('/admin/login');
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
