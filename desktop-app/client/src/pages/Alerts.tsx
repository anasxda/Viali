import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth, canAccess } from '../AuthContext';
import { StatusBadge, formatDateTime } from '../utils';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 50;

interface Alert {
    AlertID: number;
    ItemID: number | null;
    AlertType: string;
    ItemDescription: string;
    BatchNumber: string | null;
    AlertDate: string;
    StatusText: string;
    Remarks: string | null;
    IsResolved: number;
    totalAvailable?: number | null;
    reorderPoint?: number | null;
    minStockLevel?: number | null;
    notifyRecipients?: string[];
}

export default function Alerts() {
    const { user } = useAuth();
    const canResolve = canAccess(user, 'StockIn'); // Administrator Mode, same write gate.
    const [rows, setRows] = useState<Alert[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showResolved, setShowResolved] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [page, setPage] = useState(1);

    function load() {
        api.get('/api/alerts').then(setRows).catch((e) => setError(e.message));
    }

    useEffect(load, []);

    async function resolve(id: number) {
        setBusyId(id);
        try {
            await api.post(`/api/alerts/${id}/resolve`, {});
            load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not acknowledge alert');
        } finally {
            setBusyId(null);
        }
    }

    // Opens a blank draft in the PC's default mail app (Outlook) - the "To"
    // is left empty on purpose so the person sending it picks the
    // recipients themselves.
    function notify(a: Alert) {
        const subject = `Low Stock Alert: ${a.ItemDescription}`;
        const body =
            `Hello,\n\n` +
            `Stock for "${a.ItemDescription}" is low.\n\n` +
            `Available: ${a.totalAvailable ?? '—'}\n` +
            `Reorder Point: ${a.reorderPoint ?? '—'}\n` +
            `Min Stock Level: ${a.minStockLevel ?? '—'}\n\n` +
            `Reported by: ${user?.fullName ?? ''}\n` +
            `Date: ${new Date().toLocaleString()}\n\n` +
            `Please arrange replenishment.`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    const filtered = rows.filter((r) => showResolved || !r.IsResolved);
    const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    useEffect(() => setPage(1), [showResolved]);

    if (error) return <div className="error-banner">{error}</div>;

    return (
        <div>
            <h1 className="page-title">Alerts</h1>
            <div className="toolbar">
                <label style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
                    Show resolved
                </label>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{filtered.length} alerts</span>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
                <table>
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Item</th>
                            <th>Batch</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Remarks</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map((a) => (
                            <tr key={a.AlertID}>
                                <td>{a.AlertType}</td>
                                <td>{a.ItemDescription}</td>
                                <td>{a.BatchNumber}</td>
                                <td>{formatDateTime(a.AlertDate)}</td>
                                <td>
                                    <StatusBadge status={a.StatusText} />
                                </td>
                                <td style={{ maxWidth: 320, fontSize: 12, color: 'var(--text-muted)' }}>{a.Remarks}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', whiteSpace: 'nowrap' }}>
                                        {a.AlertType === 'Low Stock' && !a.IsResolved && (
                                            <button className="btn btn-secondary" onClick={() => notify(a)}>
                                                Notify by Email
                                            </button>
                                        )}
                                        {canResolve && !a.IsResolved && (
                                            <button className="btn btn-secondary" disabled={busyId === a.AlertID} onClick={() => resolve(a.AlertID)}>
                                                Acknowledge
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </div>
    );
}
