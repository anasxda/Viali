import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { formatDate } from '../utils';
import { printHtmlDocument, printPageShell, escapeHtml } from '../printDocument';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 50;

interface ReportDef {
    key: string;
    label: string;
    endpoint: string;
}

const REPORTS: ReportDef[] = [
    { key: 'balance', label: 'Current Inventory Balance', endpoint: '/api/reports/current-inventory-balance' },
    { key: 'lowstock', label: 'Low Stock', endpoint: '/api/reports/low-stock' },
    { key: 'expiring', label: 'Expiring Batches', endpoint: '/api/reports/expiring-batches' },
    { key: 'expired', label: 'Expired Batches', endpoint: '/api/reports/expired-batches' },
    { key: 'movements', label: 'Movement History', endpoint: '/api/reports/movement-history' },
    { key: 'stockin', label: 'Stock In Transactions', endpoint: '/api/reports/stock-in-transactions' },
    { key: 'stockout', label: 'Stock Out Transactions', endpoint: '/api/reports/stock-out-transactions' },
];

// Columns hidden from generic report tables (internal ids / noise).
const HIDDEN_COLS = new Set([
    'ItemID',
    'BatchID',
    'SupplierID',
    'MovementTypeID',
    'CategoryID',
    'UnitID',
    'LocationID',
    'HazardID',
    'HazardDescription',
    'ManufacturerID',
    'CreatedByUserID',
    'ModifiedByUserID',
    'ReceivedByUserID',
]);

function humanize(key: string) {
    return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

// Builds a standalone, print-optimized HTML document for the report - the
// browser's own "Print" dialog (Save as PDF / physical printer) is used to
// produce the actual PDF, so no extra PDF library is needed.
function buildPrintDocument(opts: { title: string; generatedBy: string; columns: string[]; rows: Record<string, unknown>[] }) {
    const { title, generatedBy, columns, rows } = opts;
    const headerCells = columns.map((c) => `<th>${escapeHtml(humanize(c))}</th>`).join('');
    const bodyRows = rows
        .map((row) => `<tr>${columns.map((c) => `<td>${escapeHtml(formatCell(c, row[c]))}</td>`).join('')}</tr>`)
        .join('');

    return printPageShell({
        title,
        subtitle: `${rows.length} record${rows.length === 1 ? '' : 's'}`,
        generatedBy,
        bodyHtml: `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`,
    });
}

export default function Reports() {
    const { user } = useAuth();
    const [active, setActive] = useState<ReportDef | null>(null);
    const [rows, setRows] = useState<Record<string, unknown>[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<{ ItemID: number; ItemDescription: string; CategoryName: string | null }[]>([]);
    const [category, setCategory] = useState('');
    const [page, setPage] = useState(1);

    useEffect(() => {
        api.get('/api/inventory').then((r) => setItems(r)).catch(() => {});
    }, []);

    function runReport(def: ReportDef) {
        setActive(def);
        setPage(1);
        setError(null);
        setLoading(true);
        api
            .get(def.endpoint)
            .then(setRows)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }

    const categories = Array.from(new Set(items.map((i) => i.CategoryName).filter((name): name is string => Boolean(name)))).sort();
    const visibleRows = category ? rows.filter((row) => row.CategoryName === category) : rows;
    const pageRows = visibleRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const columns = visibleRows.length ? Object.keys(visibleRows[0]).filter((c) => !HIDDEN_COLS.has(c)) : [];

    function printReport() {
        if (!active || !visibleRows.length) return;
        const title = category ? `${active.label} - ${category}` : active.label;
        printHtmlDocument(buildPrintDocument({ title, generatedBy: user?.fullName ?? '', columns, rows: visibleRows }));
    }

    return (
        <div>
            <h1 className="page-title">Reports</h1>
            <div className="reports-layout">
                <div className="card" style={{ padding: 8 }}>
                    {REPORTS.map((r) => (
                        <button
                            key={r.key}
                            className="btn btn-ghost"
                            style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                marginBottom: 2,
                                background: active?.key === r.key ? 'var(--teal-100)' : 'transparent',
                                color: active?.key === r.key ? 'var(--teal-600)' : 'var(--text)',
                            }}
                            onClick={() => runReport(r)}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

                <div>
                    {active && (
                        <div className="toolbar">
                            <label htmlFor="report-category" style={{ fontSize: 13, fontWeight: 600 }}>Category</label>
                            <select id="report-category" className="report-category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
                                <option value="">All categories</option>
                                {categories.map((name) => <option key={name} value={name}>{name}</option>)}
                            </select>
                        </div>
                    )}

                    {error && <div className="error-banner">{error}</div>}
                    {!active && <p style={{ color: 'var(--text-muted)' }}>Select a report from the left.</p>}
                    {loading && <p>Loading…</p>}

                    {active && !loading && visibleRows.length === 0 && !error && (
                        <p style={{ color: 'var(--text-muted)' }}>No records.</p>
                    )}

                    {visibleRows.length > 0 && (
                        <>
                            <div className="toolbar">
                                <button className="btn btn-secondary" onClick={printReport}>
                                    🖨 Print / Save PDF
                                </button>
                            </div>
                            <div className="card" style={{ padding: 0, overflow: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            {columns.map((c) => (
                                                <th key={c}>{humanize(c)}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageRows.map((row, idx) => (
                                            <tr key={(page - 1) * PAGE_SIZE + idx}>
                                                {columns.map((c) => (
                                                    <td key={c}>{formatCell(c, row[c])}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination page={page} pageSize={PAGE_SIZE} total={visibleRows.length} onPageChange={setPage} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function formatCell(col: string, value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (col.toLowerCase().includes('date')) return formatDate(String(value));
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (col === 'IsActive' || col === 'IsResolved') return value ? 'Yes' : 'No';
    return String(value);
}
