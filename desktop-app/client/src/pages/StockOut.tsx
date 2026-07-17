import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { StatusBadge } from '../utils';
import SearchableSelect from '../components/SearchableSelect';
import HazardSymbols from '../components/HazardSymbol';
import BarcodeScanner from '../components/BarcodeScanner';

interface ItemOption {
    ItemID: number;
    ItemDescription: string;
    BarcodeValue: string | null;
    LegacyItemCode: string | null;
}
interface Batch {
    BatchID: number;
    BatchNumber: string;
    QuantityRemaining: number;
    LocationCode: string | null;
}
interface ItemDetail {
    ItemID: number;
    ItemDescription: string;
    CategoryName: string | null;
    UnitName: string | null;
    LocationCode: string | null;
    HazardName: string | null;
    HazardDescription: string | null;
    ManufacturerName: string | null;
    CASNumber: string | null;
    PhysicalState: string | null;
    TotalAvailable: number;
    StockStatus: string;
    batches: Batch[];
}
interface LowStockWarning {
    itemId: number;
    itemDescription: string;
    stockStatus: string;
    totalAvailable: number;
    reorderPoint: number | null;
    minStockLevel: number | null;
    notifyRecipients: string[];
}

const PURPOSE_OPTIONS = ['Lab Use', 'Damaged / Spillage', 'Expired', 'Other'];

export default function StockOut() {
    const { user } = useAuth();
    const [items, setItems] = useState<ItemOption[]>([]);
    const [itemId, setItemId] = useState('');
    const [itemDetail, setItemDetail] = useState<ItemDetail | null>(null);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [batchId, setBatchId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [purposes, setPurposes] = useState<string[]>([]);
    const [remarks, setRemarks] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [warning, setWarning] = useState<LowStockWarning | null>(null);

    useEffect(() => {
        api.get('/api/inventory').then((rows: ItemOption[]) => setItems(rows)).catch(() => {});
    }, []);

    useEffect(() => {
        if (!itemId) {
            setItemDetail(null);
            setBatches([]);
            setBatchId('');
            return;
        }
        api
            .get(`/api/inventory/${itemId}`)
            .then((detail: ItemDetail) => {
                setItemDetail(detail);
                const withStock = detail.batches.filter((b) => b.QuantityRemaining > 0);
                setBatches(withStock);
                setBatchId(withStock.length ? String(withStock[0].BatchID) : '');
            })
            .catch(() => {});
    }, [itemId]);

    const selectedBatch = batches.find((b) => String(b.BatchID) === batchId);

    function selectBarcode(code: string) {
        const normalized = code.trim().toLowerCase();
        const match = items.find((i) => i.BarcodeValue?.toLowerCase() === normalized || i.LegacyItemCode?.toLowerCase() === normalized);
        if (!match) return setError(`No inventory item is linked to barcode “${code}”.`);
        setError(null);
        setItemId(String(match.ItemID));
    }

    async function submit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        if (!batchId) {
            setError('Please select an item and batch.');
            return;
        }
        if (!purposes.length) {
            setError('Please check at least one purpose.');
            return;
        }
        if (purposes.includes('Other') && !remarks.trim()) {
            setError('Please write the reason in Remarks when Purpose is "Other".');
            return;
        }
        setBusy(true);
        try {
            const result = await api.post('/api/stock/out', {
                batchId: Number(batchId),
                quantity: Number(quantity),
                purpose: purposes.join(', '),
                remarks,
            });
            setSuccess(`Posted. Batch remaining quantity is now ${result.QuantityRemaining}.`);
            setQuantity('');
            setPurposes([]);
            setRemarks('');
            if (result.lowStockWarning) setWarning(result.lowStockWarning);
            // Refresh the item details and batches for the item.
            const detail: ItemDetail = await api.get(`/api/inventory/${itemId}`);
            setItemDetail(detail);
            const withStock = detail.batches.filter((b) => b.QuantityRemaining > 0);
            setBatches(withStock);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Stock-out failed');
        } finally {
            setBusy(false);
        }
    }

    function acknowledgeWarning(mail: { href: string }) {
        // Leaves "To" empty on purpose - opens a blank draft in the PC's
        // default mail app (Outlook) and lets the person sending it choose
        // the recipients themselves.
        window.location.href = mail.href;
        setWarning(null);
    }

    function buildNotifyEmail(w: LowStockWarning) {
        const subject = `Low Stock Alert: ${w.itemDescription}`;
        const body =
            `Hello,\n\n` +
            `Stock for "${w.itemDescription}" is now ${w.stockStatus} after a Stock Out.\n\n` +
            `Available: ${w.totalAvailable}\n` +
            `Reorder Point: ${w.reorderPoint ?? '—'}\n` +
            `Min Stock Level: ${w.minStockLevel ?? '—'}\n\n` +
            `Reported by: ${user?.fullName ?? ''}\n` +
            `Date: ${new Date().toLocaleString()}\n\n` +
            `Please arrange replenishment.`;
        return { subject, body, href: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
    }

    return (
        <div>
            <div className="page-heading scan-page-heading"><BarcodeScanner onScan={selectBarcode} /><div><span className="eyebrow">OUTBOUND OPERATIONS</span><h1 className="page-title">Issue stock</h1><p className="page-subtitle">Select or scan an item, then record its destination.</p></div></div>
            {error && <div className="error-banner">{error}</div>}
            {success && <div className="card" style={{ background: 'var(--green-100)', color: 'var(--green-600)', marginBottom: 16 }}>{success}</div>}

            {warning && (() => {
                const mail = buildNotifyEmail(warning);
                return (
                    <div className="modal-overlay">
                        <div className="card" style={{ maxWidth: 460, background: '#fff' }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                                <span className="badge badge-warn">{warning.stockStatus}</span>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{warning.itemDescription}</div>
                            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 14 }}>
                                This item just dropped to <strong>{warning.totalAvailable}</strong> available
                                {warning.reorderPoint != null ? ` (reorder point: ${warning.reorderPoint})` : ''}. Press OK to
                                notify supervisor via email.
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-primary" onClick={() => acknowledgeWarning(mail)}>
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <form className="card" style={{ maxWidth: 640 }} onSubmit={submit}>
                <Row label="Item *">
                    <SearchableSelect
                        id="stockout-item"
                        value={itemId}
                        onChange={setItemId}
                        placeholder="Type to search items…"
                        options={items.map((i) => ({ value: String(i.ItemID), label: i.ItemDescription }))}
                    />
                </Row>

                {itemDetail && (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 10,
                            padding: 12,
                            marginBottom: 14,
                            background: '#fafbfd',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                        }}
                    >
                        <DetailField label="Location" value={itemDetail.LocationCode} />
                        <DetailField label="Category" value={itemDetail.CategoryName} />
                        <DetailField label="Unit" value={itemDetail.UnitName} />
                        <DetailField label="Manufacturer" value={itemDetail.ManufacturerName} />
                        <DetailField label="CAS Number" value={itemDetail.CASNumber} />
                        <DetailField label="Physical State" value={itemDetail.PhysicalState} />
                        <div>
                            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Stock Status</div>
                            <div style={{ marginTop: 3 }}>
                                <StatusBadge status={itemDetail.StockStatus} />
                            </div>
                        </div>
                        <DetailField label="Total Available" value={String(itemDetail.TotalAvailable)} />

                        <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 2 }}>
                            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Hazard</div>
                            <div style={{ marginTop: 4 }}>
                                {itemDetail.HazardName && itemDetail.HazardName !== 'Not Specified' ? (
                                    <>
                                        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                            <HazardSymbols hazardName={itemDetail.HazardName} />
                                            {itemDetail.HazardName}
                                        </span>
                                        {itemDetail.HazardDescription && (
                                            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '6px 0 0' }}>{itemDetail.HazardDescription}</p>
                                        )}
                                    </>
                                ) : (
                                    <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>None specified</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <Row label="Batch *">
                    <SearchableSelect
                        id="stockout-batch"
                        value={batchId}
                        onChange={setBatchId}
                        disabled={!batches.length}
                        placeholder="Type to search batches…"
                        emptyText={itemId ? 'No batches with stock' : 'Select an item first'}
                        options={batches.map((b) => ({
                            value: String(b.BatchID),
                            label: b.BatchNumber,
                            sublabel: `${b.QuantityRemaining} available${b.LocationCode ? ` · ${b.LocationCode}` : ''}`,
                        }))}
                    />
                </Row>
                <Row label="Quantity to Issue *">
                    <input
                        id="stockout-qty"
                        type="number"
                        min="0"
                        step="any"
                        max={selectedBatch?.QuantityRemaining}
                        required
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                    />
                    {selectedBatch && (
                        <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-muted)' }}>Available: {selectedBatch.QuantityRemaining}</span>
                    )}
                </Row>
                <Row label="Purpose * (check all that apply)">
                    <div className="purpose-options">
                        {PURPOSE_OPTIONS.map((p) => (
                            <label key={p}>
                                <input type="checkbox" checked={purposes.includes(p)} onChange={(e) => setPurposes((current) => e.target.checked ? [...current, p] : current.filter((value) => value !== p))} />
                                {p}
                            </label>
                        ))}
                    </div>
                </Row>
                <Row label={purposes.includes('Other') ? 'Remarks * (write the reason)' : 'Remarks'}>
                    <textarea
                        id="stockout-remarks"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        style={{ width: '100%' }}
                        rows={2}
                        placeholder={purposes.includes('Other') ? 'Explain why stock is being issued…' : undefined}
                    />
                </Row>
                <button className="btn btn-primary" disabled={busy || !batchId || !purposes.length} type="submit">
                    {busy ? 'Posting…' : 'Post Stock Out'}
                </button>
            </form>
        </div>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5, color: 'var(--text-muted)' }}>{label}</label>
            {children}
        </div>
    );
}

function DetailField({ label, value }: { label: string; value: string | null }) {
    return (
        <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 14, marginTop: 3 }}>{value || '—'}</div>
        </div>
    );
}
