import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';

export interface SessionUser {
    userId: number;
    fullName: string;
    windowsUsername: string | null;
    roleId: number;
    roleName: string;
    isAdmin: boolean; // true only while this browser session has unlocked Administrator Mode
}

interface AuthState {
    user: SessionUser | null;
    loading: boolean;
    login: (userId: number) => Promise<void>;
    logout: () => Promise<void>;
    enterAdminMode: (password: string) => Promise<void>;
    exitAdminMode: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api
            .get('/api/auth/me')
            .then((u) => {
                if (u) {
                    setUser(u as SessionUser);
                    return;
                }
                return api.post('/api/auth/whoami-login').then((identified) => setUser(identified as SessionUser));
            })
            .catch(() =>
                // No session yet on this browser - identify the person by their
                // Windows login (the local server runs under their OS account) and
                // sign them in automatically as a normal user.
                api
                    .post('/api/auth/whoami-login')
                    .then((u) => setUser(u as SessionUser))
                    .catch(() => setUser(null))
            )
            .finally(() => setLoading(false));
    }, []);

    async function login(userId: number) {
        const u = await api.post('/api/auth/login', { userId });
        setUser(u as SessionUser);
    }

    async function logout() {
        await api.post('/api/auth/logout');
        setUser(null);
    }

    async function enterAdminMode(password: string) {
        const u = await api.post('/api/auth/admin-mode', { password });
        setUser(u as SessionUser);
    }

    async function exitAdminMode() {
        const u = await api.post('/api/auth/exit-admin-mode');
        setUser(u as SessionUser);
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, enterAdminMode, exitAdminMode }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

// Administration, Stock In and Suppliers require Administrator Mode to be
// unlocked for the current browser session (see Shell's Administrator
// button). Stock Out (dispatching items) is open to every signed-in user -
// everything else is read access.
export function canAccess(user: SessionUser | null, area: string): boolean {
    if (!user) return false;
    // Normal mode is a single-purpose dispatch workspace. Administrator Mode
    // restores every desktop feature for the current browser session.
    return area === 'StockOut' || user.isAdmin;
}
