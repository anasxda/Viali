import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { formatDateTime } from '../../utils';

interface AuditRow {
    AuditID: number;
    TableName: string;
    RecordID: number | null;
    ActionType: string;
    FieldName: string | null;
    OldValue: string | null;
    NewValue: string | null;
    ChangedByName: string;
    ChangedDate: string;
}

export default function AdminAuditLog() {
    const [rows, setRows] = useState<AuditRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        api.get('/api/admin/audit-log').then(setRows).catch((e) => setError(e.message));
    }, []);

    const filtered = rows.filter(
        (r) => !search || r.TableName.toLowerCase().includes(search.toLowerCase()) || r.ChangedByName.toLowerCase().includes(search.toLowerCase())
    );

    if (error) return <div className="error-banner">{error}</div>;

    return (
        <div>
            <Link to="/admin" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                ← Back to Administration
            </Link>
            <h1 className="page-title" style={{ marginTop: 8 }}>
                Audit Log
            </h1>
            <div className="toolbar">
                <input placeholder="Search table or user…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 280 }} />
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{filtered.length} entries</span>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
                <table>
                    <thead>
                        <tr>
                            <th>When</th>
                            <th>Table</th>
                            <th>Record</th>
                            <th>Action</th>
                            <th>Field</th>
                            <th>Old</th>
                            <th>New</th>
                            <th>By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((r) => (
                            <tr key={r.AuditID}>
                                <td>{formatDateTime(r.ChangedDate)}</td>
                                <td>{r.TableName}</td>
                                <td>{r.RecordID}</td>
                                <td>{r.ActionType}</td>
                                <td>{r.FieldName}</td>
                                <td>{r.OldValue}</td>
                                <td>{r.NewValue}</td>
                                <td>{r.ChangedByName}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
