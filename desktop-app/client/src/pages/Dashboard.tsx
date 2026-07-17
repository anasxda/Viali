import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { formatDateTime } from '../utils';

interface DashboardData {
    totalItems: number;
    lowStockCount: number;
    outOfStockCount: number;
    openAlertsCount: number;
    openAlerts: { AlertID: number; AlertType: string; ItemDescription: string; AlertDate: string }[];
    recentMovements: {
        MovementID: number;
        MovementDate: string;
        ItemDescription: string;
        BatchNumber: string;
        MovementTypeName: string;
        Quantity: number;
        PerformedBy: string;
    }[];
}

interface InventoryCheckStatus {
    supervisorEmail: string;
    supervisorEmails: string[];
    lastCheckDate: string | null;
    nextDueDate: string | null;
    isDue: boolean;
}

export default function Dashboard() {
    const { user } = useAuth();
    const [data, setData] = useState<DashboardData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [checkStatus, setCheckStatus] = useState<InventoryCheckStatus | null>(null);
    const [marking, setMarking] = useState(false);

    function formatDueDate(value: string | null) {
        if (!value) return '15/07/2026';
        return new Date(value).toLocaleDateString('en-GB');
    }

    function loadCheckStatus() {
        api.get('/api/settings/inventory-check').then(setCheckStatus).catch(() => {});
    }

    useEffect(() => {
        api.get('/api/dashboard').then(setData).catch((e) => setError(e.message));
        loadCheckStatus();
    }, []);

    async function markDone() {
        setMarking(true);
        try {
            await api.post('/api/settings/inventory-check/mark-done');
            loadCheckStatus();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not mark inventory check as done');
        } finally {
            setMarking(false);
        }
    }

    function notifySupervisor() {
        if (!checkStatus?.supervisorEmail) return;
        const subject = 'Monthly Inventory Check Due - VIALI Home';
        const body =
            `Hello,\n\n` +
            `This is a reminder that the monthly inventory check is due.\n\n` +
            `Reported by: ${user?.fullName ?? ''}\n` +
            `Date: ${new Date().toLocaleString()}\n\n` +
            `Please arrange for the inventory check to be carried out.`;
        const recipients = (checkStatus.supervisorEmails?.length ? checkStatus.supervisorEmails : [checkStatus.supervisorEmail]).join(',');
        window.location.href = `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    function startInventoryCheck() {
        window.dispatchEvent(new Event('viali:request-admin-mode'));
    }

    if (error) return <div className="error-banner">{error}</div>;
    if (!data) return <p>Loading…</p>;

    return (
        <div>
            <div className="page-heading"><div><span className="eyebrow">LIVE OPERATIONS</span><h1 className="page-title">Good day, {user?.fullName?.split(' ')[0]}</h1><p className="page-subtitle">Here is the current state of your inventory.</p></div><span className="badge badge-ok">● Live data</span></div>

            {checkStatus?.isDue && (
                <div
                    className="card"
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 16,
                        flexWrap: 'wrap',
                        marginBottom: 20,
                        background: 'var(--amber-100)',
                        border: '1px solid #f0d38a',
                    }}
                >
                    <div>
                        <div style={{ fontWeight: 700, color: '#92620a' }}>Monthly Inventory Check Due</div>
                        <p style={{ fontSize: 13, color: '#92620a', margin: '4px 0 0' }}>
                            {checkStatus.lastCheckDate
                                ? `Last checked ${new Date(checkStatus.lastCheckDate).toLocaleDateString()}. It's time for this month's inventory check.`
                                : "This is the first reminder - it's time for the monthly inventory check."}
                        </p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#92620a', margin: '4px 0 0' }}>
                            Due date: {formatDueDate(checkStatus.nextDueDate)}
                        </p>
                        {user?.isAdmin && (
                            <div className="inventory-check-steps-wrap">
                                <div className="inventory-check-guide-label">Recommended workflow</div>
                                <ol className="inventory-check-steps">
                                    <li><span>1</span><div><strong>Open Physical Count</strong><small>Review or filter the items to count.</small></div></li>
                                    <li><span>2</span><div><strong>Print the count sheet</strong><small>Take the sheet with you while counting.</small></div></li>
                                    <li><span>3</span><div><strong>Count the inventory</strong><small>Record the actual quantity for each item.</small></div></li>
                                    <li><span>4</span><div><strong>Enter and submit</strong><small>Enter quantities and submit the adjustments.</small></div></li>
                                </ol>
                            </div>
                        )}
                        {!checkStatus.supervisorEmail &&
                            (user?.isAdmin ? (
                                <p style={{ fontSize: 12, color: '#92620a', margin: '4px 0 0' }}>
                                    No supervisor emails are set yet. Add them in{' '}
                                    <Link to="/admin/inventory-check" style={{ color: '#92620a', textDecoration: 'underline' }}>
                                        Administration → Inventory Check
                                    </Link>
                                    .
                                </p>
                            ) : (
                                <p style={{ fontSize: 12, color: '#92620a', margin: '4px 0 0' }}>
                                    No supervisor emails are set yet - ask an Administrator to add them.
                                </p>
                            ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                        {!user?.isAdmin && (
                            <button className="btn btn-primary" onClick={startInventoryCheck}>Start Inventory Check</button>
                        )}
                        {!user?.isAdmin && checkStatus.supervisorEmail && (
                            <button className="btn btn-secondary" onClick={notifySupervisor}>
                                Notify Supervisors by Email
                            </button>
                        )}
                        {user?.isAdmin && (
                            <Link className="btn btn-primary" to="/physical-count">Open Physical Count →</Link>
                        )}
                        {user?.isAdmin && (
                            <button className="btn btn-secondary" disabled={marking} onClick={markDone}>
                                {marking ? 'Saving…' : 'Mark as Done'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="kpi-grid">
                <KpiCard label="Active Items" value={data.totalItems} />
                <KpiCard label="Low Stock / Reorder" value={data.lowStockCount} tone="warn" />
                <KpiCard label="Out of Stock" value={data.outOfStockCount} tone="danger" />
                <KpiCard label="Open Alerts" value={data.openAlertsCount} tone="warn" />
            </div>

            <div className="dashboard-grid">
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <strong>Open Alerts</strong>
                        <Link to="/alerts" className="btn btn-ghost">
                            View all
                        </Link>
                    </div>
                    {data.openAlerts.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No open alerts.</p>}
                    <table>
                        <tbody>
                            {data.openAlerts.map((a) => (
                                <tr key={a.AlertID}>
                                    <td>{a.AlertType}</td>
                                    <td>{a.ItemDescription}</td>
                                    <td style={{ color: 'var(--text-muted)' }}>{formatDateTime(a.AlertDate)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <strong>Recent Movements</strong>
                        <Link to="/movements" className="btn btn-ghost">
                            View all
                        </Link>
                    </div>
                    <table>
                        <tbody>
                            {data.recentMovements.map((m) => (
                                <tr key={m.MovementID}>
                                    <td>{m.ItemDescription}</td>
                                    <td>{m.MovementTypeName}</td>
                                    <td>{m.Quantity}</td>
                                    <td style={{ color: 'var(--text-muted)' }}>{formatDateTime(m.MovementDate)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ label, value, tone }: { label: string; value: number; tone?: 'warn' | 'danger' }) {
    const color = tone === 'danger' ? 'var(--red-600)' : tone === 'warn' ? '#92620a' : 'var(--navy-900)';
    return (
        <div className="card">
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
        </div>
    );
}
