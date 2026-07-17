import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { formatDateTime } from '../../utils';

interface InventoryCheckStatus {
    supervisorEmail: string;
    lastCheckDate: string | null;
    nextDueDate: string | null;
    isDue: boolean;
}

export default function AdminInventoryCheck() {
    const [status, setStatus] = useState<InventoryCheckStatus | null>(null);
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [marking, setMarking] = useState(false);

    function load() {
        api
            .get('/api/settings/inventory-check')
            .then((s: InventoryCheckStatus) => {
                setStatus(s);
                setEmail(s.supervisorEmail);
            })
            .catch((e) => setError(e.message));
    }
    useEffect(load, []);

    async function saveEmail(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setSaving(true);
        try {
            await api.put('/api/settings/supervisor-email', { email });
            setSuccess('Supervisor email saved.');
            load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save supervisor email');
        } finally {
            setSaving(false);
        }
    }

    async function markDone() {
        setMarking(true);
        setError(null);
        try {
            await api.post('/api/settings/inventory-check/mark-done');
            load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not mark inventory check as done');
        } finally {
            setMarking(false);
        }
    }

    return (
        <div>
            <Link to="/admin" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                ← Back to Administration
            </Link>
            <h1 className="page-title" style={{ marginTop: 8 }}>
                Monthly Inventory Check
            </h1>
            {error && <div className="error-banner">{error}</div>}
            {success && <div className="card" style={{ background: 'var(--green-100)', color: 'var(--green-600)', marginBottom: 16 }}>{success}</div>}

            <form className="card" onSubmit={saveEmail} style={{ maxWidth: 480, marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
                    Supervisor Emails
                </label>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 10 }}>
                    Used by the "Notify Supervisor by Email" button on the Dashboard reminder - it just opens a draft in your
                    mail app addressed to these people, nothing is sent automatically. Separate addresses with commas, spaces, or semicolons.
                </p>
                <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="supervisor1@company.com, supervisor2@company.com"
                    style={{ width: '100%', marginBottom: 12 }}
                />
                <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </form>

            {status && (
                <div className="card" style={{ maxWidth: 480 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Last inventory check</span>
                        <strong>{status.lastCheckDate ? formatDateTime(status.lastCheckDate) : 'Never'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Status</span>
                        {status.isDue ? (
                            <span className="badge badge-warn">Due now</span>
                        ) : (
                            <span className="badge badge-ok">Not due until {status.nextDueDate ? new Date(status.nextDueDate).toLocaleDateString() : '—'}</span>
                        )}
                    </div>
                    <button className="btn btn-secondary" disabled={marking} onClick={markDone}>
                        {marking ? 'Saving…' : 'Mark this month’s check as done'}
                    </button>
                </div>
            )}
        </div>
    );
}
