import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { printHtmlDocument, printPageShell, escapeHtml } from '../printDocument';

interface Item {
    ItemID: number;
    LegacyItemCode: string | null;
    ItemDescription: string;
    CategoryName: string | null;
    LocationCode: string | null;
    UnitName: string | null;
    TotalAvailable: number;
    IsActive: number;
}

interface AdjustedResult {
    itemId: number;
    itemDescription: string;
    systemQty: number;
    countedQty: number;
    difference: number;
}
interface SkippedResult {
    itemId: number;
    itemDescription: string;
    reason: string;
}
interface SubmitResult {
    adjusted: AdjustedResult[];
    skipped: SkippedResult[];
}

// Counted-quantity inputs are kept in a separate map (keyed by ItemID) so
// typing into one row never re-renders the whole 500+ row list.
export default function PhysicalCount() {
    const { user } = useAuth();
    const [items, setItems] = useState<Item[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [counts, setCounts] = useState<Record<number, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<SubmitResult | null>(null);

    function load() {
        api
            .get('/api/inventory')
            .then((rows: Item[]) => setItems(rows.filter((i) => i.IsActive)))
            .catch((e) => setError(e.message));
    }
    useEffect(load, []);

    const filtered = useMemo(() => {
        const categoryItems = category ? items.filter((i) => i.CategoryName === category) : items;
        if (!search) return categoryItems;
        const q = search.toLowerCase();
        return categoryItems.filter((i) => i.ItemDescription.toLowerCase().includes(q) || (i.LegacyItemCode || '').toLowerCase().includes(q));
    }, [items, search, category]);

    const categories = useMemo(() => Array.from(new Set(items.map((i) => i.CategoryName).filter((name): name is string => Boolean(name)))).sort(), [items]);

    const changedCount = useMemo(() => {
        return items.filter((i) => {
            const raw = counts[i.ItemID];
            if (raw === undefined || raw === '') return false;
            const counted = Number(raw);
            return Number.isFinite(counted) && counted !== i.TotalAvailable;
        }).length;
    }, [items, counts]);

    function setCount(itemId: number, value: string) {
        setCounts((c) => ({ ...c, [itemId]: value }));
    }

    function printCountSheet() {
        const rows = filtered
            .map(
                (i) =>
                    `<tr><td>${escapeHtml(i.LegacyItemCode || '')}</td><td>${escapeHtml(i.ItemDescription)}</td><td>${escapeHtml(i.LocationCode || '')}</td><td>${escapeHtml(i.UnitName || '')}</td><td>${i.TotalAvailable}</td><td></td></tr>`
            )
            .join('');
        const html = printPageShell({
            title: 'Physical Count Sheet',
            subtitle: `${filtered.length} items — write the counted quantity in the blank column`,
            generatedBy: user?.fullName ?? '',
            bodyHtml: `<table><thead><tr><th>Code</th><th>Item</th><th>Location</th><th>Unit</th><th>System Qty</th><th>Counted Qty</th></tr></thead><tbody>${rows}</tbody></table>`,
        });
        printHtmlDocument(html);
    }

    async function submitCount() {
        const payload = items
            .map((i) => ({ itemId: i.ItemID, countedQty: counts[i.ItemID] }))
            .filter((e) => e.countedQty !== undefined && e.countedQty !== '')
            .map((e) => ({ itemId: e.itemId, countedQty: Number(e.countedQty) }))
            .filter((e) => Number.isFinite(e.countedQty) && e.countedQty >= 0);

        if (!payload.length) {
            setError('Enter at least one counted quantity first.');
            return;
        }

        setSubmitting(true);
        setError(null);
        setResult(null);
        try {
            const res: SubmitResult = await api.post('/api/stock/physical-count', { items: payload });
            setResult(res);
            setCounts({});
            load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not submit the physical count');
        } finally {
            setSubmitting(false);
        }
    }

    if (error && !items.length) return <div className="error-banner">{error}</div>;

    return (
        <div>
            <h1 className="page-title">Physical Count</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: -8, marginBottom: 16 }}>
                Print a count sheet, do the count on paper, then type the counted quantities below and submit - only rows
                where the counted quantity differs from the system quantity get adjusted.
            </p>
            {error && <div className="error-banner">{error}</div>}

            {result && (
                <div className="card" style={{ marginBottom: 16, background: 'var(--green-100)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--green-600)', marginBottom: 6 }}>
                        {result.adjusted.length} item{result.adjusted.length === 1 ? '' : 's'} adjusted
                    </div>
                    {result.adjusted.length > 0 && (
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                            {result.adjusted.map((a) => (
                                <li key={a.itemId}>
                                    {a.itemDescription}: {a.systemQty} → {a.countedQty} ({a.difference > 0 ? '+' : ''}
                                    {a.difference})
                                </li>
                            ))}
                        </ul>
                    )}
                    {result.skipped.length > 0 && (
                        <>
                            <div style={{ fontWeight: 700, color: '#92620a', margin: '10px 0 4px' }}>Skipped</div>
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#92620a' }}>
                                {result.skipped.map((s) => (
                                    <li key={s.itemId}>
                                        {s.itemDescription}: {s.reason}
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            )}

            <div className="toolbar">
                <select aria-label="Inventory category" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: 220 }}>
                    <option value="">All categories</option>
                    {categories.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <input placeholder="Search item name or code…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 280 }} />
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{filtered.length} items</span>
                <div style={{ flex: 1 }} />
                <button className="btn btn-secondary" onClick={printCountSheet}>
                    🖨 Print Count Sheet
                </button>
                <button className="btn btn-primary" disabled={submitting || changedCount === 0} onClick={submitCount}>
                    {submitting ? 'Submitting…' : `Submit Count (${changedCount})`}
                </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
                <table>
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Item</th>
                            <th>Location</th>
                            <th>Unit</th>
                            <th>System Qty</th>
                            <th>Counted Qty</th>
                            <th>Difference</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((i) => (
                            <CountRow key={i.ItemID} item={i} value={counts[i.ItemID] ?? ''} onChange={(v) => setCount(i.ItemID, v)} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function CountRow({ item, value, onChange }: { item: Item; value: string; onChange: (v: string) => void }) {
    const counted = value === '' ? null : Number(value);
    const diff = counted !== null && Number.isFinite(counted) ? counted - item.TotalAvailable : null;
    return (
        <tr>
            <td>{item.LegacyItemCode}</td>
            <td>{item.ItemDescription}</td>
            <td>{item.LocationCode}</td>
            <td>{item.UnitName}</td>
            <td>{item.TotalAvailable}</td>
            <td>
                <input
                    type="number"
                    min="0"
                    step="any"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={{ width: 90 }}
                    placeholder="—"
                />
            </td>
            <td style={{ color: diff == null || diff === 0 ? 'var(--text-muted)' : diff > 0 ? 'var(--green-600)' : 'var(--red-600)', fontWeight: diff ? 700 : 400 }}>
                {diff == null ? '—' : diff > 0 ? `+${diff}` : diff}
            </td>
        </tr>
    );
}
