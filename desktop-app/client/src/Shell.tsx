import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, canAccess } from './AuthContext';
import './Shell.css';

const NAV_ITEMS = [
    { to: '/', label: 'Overview', area: 'Dashboard', end: true, icon: '◫' },
    { to: '/inventory', label: 'Inventory', area: 'Inventory', icon: '▦' },
    { to: '/stock-in', label: 'Receive stock', area: 'StockIn', icon: '↙' },
    { to: '/stock-out', label: 'Issue stock', area: 'StockOut', icon: '↗' },
    { to: '/physical-count', label: 'Physical count', area: 'StockIn', icon: '✓' },
    { to: '/movements', label: 'Movements', area: 'Movements', icon: '↔' },
    { to: '/alerts', label: 'Alerts', area: 'Alerts', icon: '!' },
    { to: '/suppliers', label: 'Suppliers', area: 'Suppliers', icon: '◇' },
    { to: '/reports', label: 'Reports', area: 'Reports', icon: '▤' },
    { to: '/admin', label: 'Administration', area: 'Administration', icon: '⚙' },
];

export default function Shell() {
    const { user, logout, enterAdminMode, exitAdminMode } = useAuth();
    const navigate = useNavigate();
    const [showPrompt, setShowPrompt] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [navOpen, setNavOpen] = useState(false);
    const [now, setNow] = useState(() => new Date());
    const homePath = user?.isAdmin ? '/' : '/stock-out';

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        function requestAdminMode() {
            setPassword('');
            setError(null);
            setShowPrompt(true);
        }
        window.addEventListener('viali:request-admin-mode', requestAdminMode);
        return () => window.removeEventListener('viali:request-admin-mode', requestAdminMode);
    }, []);

    async function submitPassword(e: FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await enterAdminMode(password);
            setShowPrompt(false);
            setPassword('');
            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not unlock Administrator Mode');
        } finally {
            setBusy(false);
        }
    }

    function closePrompt() {
        setShowPrompt(false);
        setPassword('');
        setError(null);
    }

    return (
        <div className={'shell' + (user?.isAdmin ? ' admin-theme' : '')}>
            {navOpen && <div className="nav-scrim" onClick={() => setNavOpen(false)} />}
            <aside className={'shell-nav' + (navOpen ? ' open' : '')}>
                <Link className="shell-logo" to={homePath} onClick={() => setNavOpen(false)} aria-label="Go to workspace home">
                    <img
                        src="/logo.png"
                        alt=""
                        className="shell-logo-img"
                        onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                    />
                    <span><strong>VIALI</strong><small>HOME INVENTORY</small></span>
                </Link>
                <div className="nav-section-label">WORKSPACE</div>
                <nav>
                    {NAV_ITEMS.filter((item) => canAccess(user, item.area)).map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => 'shell-nav-link' + (isActive ? ' active' : '')}
                            onClick={() => setNavOpen(false)}
                        >
                            <span className="nav-icon">{item.icon}</span>{item.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="nav-footer"><span className="system-dot" />System operational<small>Local secure server</small></div>
            </aside>
            <div className="shell-main">
                <header className="shell-header">
                    <div className="header-context"><button className="mobile-menu btn btn-ghost btn-icon" onClick={() => setNavOpen(true)}>☰</button><Link className="header-home-link" to={homePath}><span>VIALI HOME</span><strong>Laboratory &amp; Chemical Inventory</strong></Link></div>
                    <div className="shell-user">
                        <time className="app-date-time" dateTime={now.toISOString()}>
                            <span>{now.toLocaleDateString('en-GB')}</span>
                            <strong>{now.toLocaleTimeString('en-GB')}</strong>
                        </time>
                        <button className="btn btn-ghost" onClick={() => window.location.reload()} title="Reload to see changes made by others">
                            ↻ Refresh
                        </button>
                        <span className="shell-user-name">{user?.fullName}</span>
                        {user?.isAdmin ? (
                            <span className="badge badge-warn">Administrator Mode</span>
                        ) : (
                            <span className="badge badge-muted">Team member</span>
                        )}
                        {user?.isAdmin ? (
                            <button className="btn btn-secondary" onClick={async () => { await exitAdminMode(); navigate('/stock-out'); }}>
                                Exit Administrator Mode
                            </button>
                        ) : (
                            <button className="btn btn-primary" onClick={() => setShowPrompt(true)}>
                                Administrator
                            </button>
                        )}
                        <button className="btn btn-ghost" onClick={() => logout()}>
                            Sign out
                        </button>
                    </div>
                </header>
                <main className="shell-content">
                    <Outlet />
                </main>
            </div>

            {showPrompt && (
                <div className="modal-overlay">
                    <form className="card" style={{ width: 340, background: '#fff' }} onSubmit={submitPassword}>
                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Administrator Mode</div>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                            Enter the administrator password to unlock full access for this session.
                        </p>
                        {error && <div className="error-banner">{error}</div>}
                        <input
                            type="password"
                            autoFocus
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            style={{ width: '100%', marginBottom: 14 }}
                        />
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary" onClick={closePrompt}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={busy || !password}>
                                {busy ? 'Checking…' : 'Unlock'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
