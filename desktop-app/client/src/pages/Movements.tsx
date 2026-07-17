import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatDateTime } from '../utils';

interface Movement {
    MovementID: number;
    MovementDate: string;
    ItemDescription: string;
    BatchNumber: string;
    MovementTypeName: string;
    Quantity: number;
    Purpose: string | null;
    Remarks: string | null;
    PerformedBy: string;
}

export default function Movements() {
    const [rows, setRows] = useState<Movement[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        api.get('/api/movements').then(setRows).catch((e) => setError(e.message));
    }, []);

    const filtered = rows.filter(
        (r) =>
            !search ||
            r.ItemDescription?.toLowerCase().includes(search.toLowerCase()) ||
            r.BatchNumber?.toLowerCase().includes(search.toLowerCase())
    );

    if (error) return <div className="error-banner">{error}</div>;

    return (
        <div>
            <h1 className="page-title">Stock Movements</h1>
            <div className="toolbar">
                <input placeholder="Search item or batch…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 280 }} />
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{filtered.length} movements</span>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Item</th>
                            <th>Batch</th>
                            <th>Type</th>
                            <th>Qty</th>
                            <th>Purpose</th>
                            <th>Performed By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((m) => (
                            <tr key={m.MovementID}>
                                <td>{formatDateTime(m.MovementDate)}</td>
                                <td>{m.ItemDescription}</td>
                                <td>{m.BatchNumber}</td>
                                <td>{m.MovementTypeName}</td>
                                <td>{m.Quantity}</td>
                                <td>{m.Purpose}</td>
                                <td>{m.PerformedBy}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
