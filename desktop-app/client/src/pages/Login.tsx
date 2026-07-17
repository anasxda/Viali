import { useEffect, useState, type FormEvent, type CSSProperties } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';

interface PickerUser {
    UserID: number;
    FullName: string;
    WindowsUsername: string | null;
    RoleName: string;
}

export default function Login() {
    const { login } = useAuth();
    const [users, setUsers] = useState<PickerUser[]>([]);
    const [selected, setSelected] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        api
            .get('/api/auth/users')
            .then((rows: PickerUser[]) => {
                setUsers(rows);
                if (rows.length) setSelected(String(rows[0].UserID));
            })
            .catch((e) => setError(e.message));
    }, []);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!selected) return;
        setBusy(true);
        setError(null);
        try {
            await login(Number(selected));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Sign-in failed');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={styles.wrap}>
            <form className="card" style={styles.card} onSubmit={handleSubmit}>
                <img
                    src="/logo.png"
                    alt=""
                    style={styles.logo}
                    onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                />
                <div style={styles.brand}>VIALI Home</div>
                <p style={styles.subtitle}>Laboratory &amp; Chemical Inventory</p>
                <p style={styles.hint}>
                    We couldn't automatically identify your Windows account on this PC. Pick your name below to
                    continue.
                </p>

                {error && <div className="error-banner">{error}</div>}

                <label style={styles.label}>Sign in as</label>
                <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ width: '100%' }}>
                    {users.map((u) => (
                        <option key={u.UserID} value={u.UserID}>
                            {u.FullName} — {u.RoleName}
                        </option>
                    ))}
                </select>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 16, justifyContent: 'center' }} disabled={busy || !selected}>
                    {busy ? 'Signing in…' : 'Sign In'}
                </button>
            </form>
        </div>
    );
}

const styles: Record<string, CSSProperties> = {
    wrap: {
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--navy-900)',
    },
    card: {
        width: 360,
        background: '#fff',
    },
    logo: { display: 'block', height: 44, marginBottom: 14, objectFit: 'contain' },
    brand: { fontSize: 24, fontWeight: 800, color: 'var(--navy-900)' },
    subtitle: { color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 },
    hint: { color: 'var(--text-muted)', fontSize: 12.5, marginBottom: 16, lineHeight: 1.5 },
    label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' },
};
