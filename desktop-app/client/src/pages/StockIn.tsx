import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { api } from '../api';
import SearchableSelect from '../components/SearchableSelect';
import BarcodeScanner from '../components/BarcodeScanner';

interface ItemOption {
    ItemID: number;
    ItemDescription: string;
    LocationID: number | null;
    HazardID: number | null;
    BarcodeValue: string | null;
    LegacyItemCode: string | null;
}
interface SupplierOption {
    SupplierID: number;
    SupplierName: string;
}
interface LocationOption {
    LocationID: number;
    LocationCode: string;
}
interface HazardOption {
    HazardID: number;
    HazardName: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function StockIn() {
    const [items, setItems] = useState<ItemOption[]>([]);
    const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
    const [locations, setLocations] = useState<LocationOption[]>([]);
    const [hazards, setHazards] = useState<HazardOption[]>([]);
    const [form, setForm] = useState({
        itemId: '',
        supplierId: '',
        locationId: '',
        hazardId: '',
        batchNumber: '',
        certificateNumber: '',
        receivedDate: today(),
        expiryDate: '',
        quantity: '',
        remarks: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [addingHazard, setAddingHazard] = useState(false);
    const [newHazardName, setNewHazardName] = useState('');
    const [newHazardDescription, setNewHazardDescription] = useState('');
    const [savingHazard, setSavingHazard] = useState(false);

    function loadHazards() {
        return api.get('/api/admin/reference/hazard-classes').then((rows: HazardOption[]) => setHazards(rows));
    }

    useEffect(() => {
        api.get('/api/inventory').then((rows: ItemOption[]) => setItems(rows)).catch(() => {});
        api.get('/api/suppliers').then((rows: SupplierOption[]) => setSuppliers(rows)).catch(() => {});
        api.get('/api/admin/reference/locations').then((rows: LocationOption[]) => setLocations(rows)).catch(() => {});
        loadHazards().catch(() => {});
    }, []);

    function set<K extends keyof typeof form>(key: K, value: string) {
        setForm((f) => ({ ...f, [key]: value }));
    }

    // Defaults storage location and hazard class to the item's usual values
    // once an item is picked, but the person receiving stock can still
    // change either - a batch doesn't always land in the same place, and an
    // item that's never had a hazard set can get one here.
    function setItemId(v: string) {
        const picked = items.find((i) => String(i.ItemID) === v);
        setForm((f) => ({
            ...f,
            itemId: v,
            locationId: picked?.LocationID ? String(picked.LocationID) : f.locationId,
            hazardId: picked?.HazardID ? String(picked.HazardID) : f.hazardId,
        }));
    }

    function selectBarcode(code: string) {
        const normalized = code.trim().toLowerCase();
        const match = items.find((i) => i.BarcodeValue?.toLowerCase() === normalized || i.LegacyItemCode?.toLowerCase() === normalized);
        if (!match) return setError(`No inventory item is linked to barcode “${code}”.`);
        setError(null);
        setItemId(String(match.ItemID));
    }

    async function addHazardClass() {
        if (!newHazardName.trim()) return;
        setSavingHazard(true);
        try {
            const created = await api.post('/api/admin/reference/hazard-classes', {
                HazardName: newHazardName.trim(),
                HazardDescription: newHazardDescription.trim() || null,
            });
            await loadHazards();
            set('hazardId', String(created.HazardID));
            setAddingHazard(false);
            setNewHazardName('');
            setNewHazardDescription('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not add hazard class');
        } finally {
            setSavingHazard(false);
        }
    }

    async function submit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        if (!form.itemId) {
            setError('Please select an item.');
            return;
        }
        setBusy(true);
        try {
            const batch = await api.post('/api/stock/in', {
                itemId: Number(form.itemId),
                supplierId: form.supplierId ? Number(form.supplierId) : null,
                locationId: form.locationId ? Number(form.locationId) : null,
                hazardId: form.hazardId ? Number(form.hazardId) : null,
                batchNumber: form.batchNumber,
                certificateNumber: form.certificateNumber,
                receivedDate: form.receivedDate,
                expiryDate: form.expiryDate || null,
                quantity: Number(form.quantity),
                remarks: form.remarks,
            });
            setSuccess(`Posted batch "${batch.BatchNumber}" — ${batch.QuantityReceived} received.`);
            setForm({
                itemId: '',
                supplierId: '',
                locationId: '',
                hazardId: '',
                batchNumber: '',
                certificateNumber: '',
                receivedDate: today(),
                expiryDate: '',
                quantity: '',
                remarks: '',
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Stock-in failed');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div>
            <div className="page-heading scan-page-heading"><BarcodeScanner onScan={selectBarcode} /><div><span className="eyebrow">INBOUND OPERATIONS</span><h1 className="page-title">Receive stock</h1><p className="page-subtitle">Capture a new batch with traceable receiving details.</p></div></div>
            {error && <div className="error-banner">{error}</div>}
            {success && <div className="card" style={{ background: 'var(--green-100)', color: 'var(--green-600)', marginBottom: 16 }}>{success}</div>}

            <form className="card" style={{ maxWidth: 640 }} onSubmit={submit}>
                <Row label="Item *">
                    <SearchableSelect
                        id="stockin-item"
                        value={form.itemId}
                        onChange={setItemId}
                        placeholder="Type to search items…"
                        options={items.map((i) => ({ value: String(i.ItemID), label: i.ItemDescription }))}
                    />
                </Row>
                <Row label="Supplier">
                    <SearchableSelect
                        id="stockin-supplier"
                        value={form.supplierId}
                        onChange={(v) => set('supplierId', v)}
                        placeholder="Type to search suppliers… (optional)"
                        options={suppliers.map((s) => ({ value: String(s.SupplierID), label: s.SupplierName }))}
                    />
                </Row>
                <Row label="Storage Location">
                    <SearchableSelect
                        id="stockin-location"
                        value={form.locationId}
                        onChange={(v) => set('locationId', v)}
                        placeholder="Type to search locations…"
                        options={locations.map((l) => ({ value: String(l.LocationID), label: l.LocationCode }))}
                    />
                </Row>
                <Row label="Hazard Class (if applicable)">
                    <SearchableSelect
                        id="stockin-hazard"
                        value={form.hazardId}
                        onChange={(v) => set('hazardId', v)}
                        placeholder="Type to search hazard classes… (optional)"
                        options={hazards.map((h) => ({ value: String(h.HazardID), label: h.HazardName }))}
                    />
                    {!addingHazard ? (
                        <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ marginTop: 6, padding: '4px 0', fontSize: 12.5 }}
                            onClick={() => setAddingHazard(true)}
                        >
                            + Write a new hazard class
                        </button>
                    ) : (
                        <div style={{ marginTop: 8, padding: 10, border: '1px solid var(--border)', borderRadius: 8, background: '#fafbfd' }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                <input
                                    autoFocus
                                    placeholder="Hazard name (e.g. Flammable)"
                                    value={newHazardName}
                                    onChange={(e) => setNewHazardName(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                            </div>
                            <textarea
                                placeholder="Description (optional)"
                                value={newHazardDescription}
                                onChange={(e) => setNewHazardDescription(e.target.value)}
                                rows={2}
                                style={{ width: '100%', marginBottom: 8 }}
                            />
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setAddingHazard(false);
                                        setNewHazardName('');
                                        setNewHazardDescription('');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button type="button" className="btn btn-primary" disabled={savingHazard || !newHazardName.trim()} onClick={addHazardClass}>
                                    {savingHazard ? 'Saving…' : 'Save hazard class'}
                                </button>
                            </div>
                        </div>
                    )}
                </Row>
                <Row label="Batch Number">
                    <input id="stockin-batch" value={form.batchNumber} onChange={(e) => set('batchNumber', e.target.value)} style={{ width: '100%' }} />
                </Row>
                <Row label="Certificate Number">
                    <input id="stockin-cert" value={form.certificateNumber} onChange={(e) => set('certificateNumber', e.target.value)} style={{ width: '100%' }} />
                </Row>
                <Row label="Received Date">
                    <input id="stockin-received" type="date" value={form.receivedDate} onChange={(e) => set('receivedDate', e.target.value)} />
                </Row>
                <Row label="Expiry Date">
                    <input id="stockin-expiry" type="date" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} />
                </Row>
                <Row label="Quantity Received *">
                    <input id="stockin-qty" type="number" min="0" step="any" required value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
                </Row>
                <Row label="Remarks">
                    <textarea id="stockin-remarks" value={form.remarks} onChange={(e) => set('remarks', e.target.value)} style={{ width: '100%' }} rows={2} />
                </Row>
                <button className="btn btn-primary" disabled={busy} type="submit">
                    {busy ? 'Posting…' : 'Post Stock In'}
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
