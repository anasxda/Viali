import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api';
import HazardSymbols from '../../components/HazardSymbol';

const RESOURCE_DEFS: Record<string, { label: string; idCol: string; cols: string[] }> = {
    roles: { label: 'Roles', idCol: 'RoleID', cols: ['RoleName'] },
    categories: { label: 'Categories', idCol: 'CategoryID', cols: ['CategoryName'] },
    units: { label: 'Units', idCol: 'UnitID', cols: ['UnitName'] },
    locations: { label: 'Locations', idCol: 'LocationID', cols: ['LocationCode'] },
    'hazard-classes': { label: 'Hazard Classes', idCol: 'HazardID', cols: ['HazardName', 'HazardDescription'] },
    manufacturers: { label: 'Manufacturers', idCol: 'ManufacturerID', cols: ['ManufacturerName'] },
    'movement-types': { label: 'Movement Types', idCol: 'MovementTypeID', cols: ['MovementTypeName', 'StockEffect'] },
};

export default function AdminReferenceData() {
    const { resource } = useParams();
    const def = resource ? RESOURCE_DEFS[resource] : null;
    const [rows, setRows] = useState<Record<string, unknown>[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [newRow, setNewRow] = useState<Record<string, string>>({});
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editRow, setEditRow] = useState<Record<string, string>>({});

    function load() {
        if (!resource) return;
        api.get(`/api/admin/reference/${resource}`).then(setRows).catch((e) => setError(e.message));
    }
    useEffect(load, [resource]);

    if (!def) return <div className="error-banner">Unknown reference list.</div>;
    const isHazards = resource === 'hazard-classes';
    const columnLabel = (column: string) => column.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();

    async function addRow(e: FormEvent) {
        e.preventDefault();
        try {
            await api.post(`/api/admin/reference/${resource}`, newRow);
            setNewRow({});
            load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Add failed');
        }
    }

    function startEdit(row: Record<string, unknown>) {
        setEditingId(row[def!.idCol] as number);
        const draft: Record<string, string> = {};
        def!.cols.forEach((c) => (draft[c] = String(row[c] ?? '')));
        setEditRow(draft);
    }

    async function saveEdit(id: number) {
        try {
            await api.put(`/api/admin/reference/${resource}/${id}`, editRow);
            setEditingId(null);
            load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Update failed');
        }
    }

    async function removeRow(id: number) {
        try {
            await api.del(`/api/admin/reference/${resource}/${id}`);
            load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed');
        }
    }

    return (
        <div>
            <Link to="/admin" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                ← Back to Administration
            </Link>
            <h1 className="page-title" style={{ marginTop: 8 }}>
                {def.label}
            </h1>
            {error && <div className="error-banner">{error}</div>}

            <form className="card" onSubmit={addRow} style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                {def.cols.map((c) => (
                    <div key={c}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>{columnLabel(c)}</label>
                        <input value={newRow[c] || ''} onChange={(e) => setNewRow({ ...newRow, [c]: e.target.value })} />
                    </div>
                ))}
                <button className="btn btn-primary" type="submit">
                    Add
                </button>
            </form>

            <div className="card reference-table-card" style={{ padding: 0 }}>
                <table>
                    <thead>
                        <tr>
                            {isHazards && <th className="hazard-symbol-column">Symbol</th>}
                            {def.cols.map((c) => (
                                <th key={c}>{columnLabel(c)}</th>
                            ))}
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const id = row[def.idCol] as number;
                            const isEditing = editingId === id;
                            return (
                                <tr key={id}>
                                    {isHazards && <td className="hazard-symbol-cell"><HazardSymbols hazardName={String(row.HazardName ?? '')} size="md" /></td>}
                                    {def.cols.map((c) => (
                                        <td key={c}>
                                            {isEditing ? (
                                                <input value={editRow[c] || ''} onChange={(e) => setEditRow({ ...editRow, [c]: e.target.value })} />
                                            ) : (
                                                String(row[c] ?? '')
                                            )}
                                        </td>
                                    ))}
                                    <td style={{ display: 'flex', gap: 6 }}>
                                        {isEditing ? (
                                            <>
                                                <button className="btn btn-primary" onClick={() => saveEdit(id)}>
                                                    Save
                                                </button>
                                                <button className="btn btn-ghost" onClick={() => setEditingId(null)}>
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button className="btn btn-secondary" onClick={() => startEdit(row)}>
                                                    Edit
                                                </button>
                                                <button className="btn btn-danger" onClick={() => removeRow(id)}>
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
