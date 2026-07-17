import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { StatusBadge, formatDate } from '../utils';
import HazardSymbols from '../components/HazardSymbol';
import BarcodeScanner from '../components/BarcodeScanner';
import { useAuth } from '../AuthContext';

interface Batch {
    BatchID: number;
    BatchNumber: string;
    CertificateNumber: string | null;
    ExpiryDate: string | null;
    QuantityReceived: number;
    QuantityRemaining: number;
    ReceivedDate: string;
    SupplierName: string | null;
    LocationCode: string | null;
    IsActive: number;
}

interface ItemDetailData {
    ItemID: number;
    ItemDescription: string;
    LegacyItemCode: string | null;
    BarcodeValue: string | null;
    CategoryName: string;
    UnitName: string;
    LocationCode: string;
    HazardName: string;
    HazardDescription: string | null;
    ManufacturerName: string;
    CASNumber: string | null;
    PhysicalState: string | null;
    MinStockLevel: number | null;
    ReorderPoint: number | null;
    MaxStockLevel: number | null;
    TotalAvailable: number;
    StockStatus: string;
    batches: Batch[];
}

export default function ItemDetail() {
    const { user } = useAuth();
    const { id } = useParams();
    const [item, setItem] = useState<ItemDetailData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [savingBarcode, setSavingBarcode] = useState(false);

    useEffect(() => {
        api.get(`/api/inventory/${id}`).then(setItem).catch((e) => setError(e.message));
    }, [id]);

    async function saveBarcode(barcode: string) {
        if (!item) return;
        setSavingBarcode(true); setError(null);
        try {
            const result = await api.put(`/api/inventory/${item.ItemID}/barcode`, { barcode });
            setItem({ ...item, BarcodeValue: result.BarcodeValue });
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not save barcode'); }
        finally { setSavingBarcode(false); }
    }

    if (error) return <div className="error-banner">{error}</div>;
    if (!item) return <p>Loading…</p>;

    return (
        <div>
            <Link to="/inventory" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                ← Back to Inventory
            </Link>
            <div className="page-heading"><div><span className="eyebrow">ITEM PROFILE</span><h1 className="page-title">{item.ItemDescription}</h1><StatusBadge status={item.StockStatus} /></div></div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    <Field label="Legacy Code" value={item.LegacyItemCode} />
                    <Field label="Barcode" value={item.BarcodeValue} />
                    <Field label="Category" value={item.CategoryName} />
                    <Field label="Location" value={item.LocationCode} />
                    <Field label="Unit" value={item.UnitName} />
                    <Field label="Manufacturer" value={item.ManufacturerName} />
                    <Field label="CAS Number" value={item.CASNumber} />
                    <Field label="Physical State" value={item.PhysicalState} />
                    <Field label="Total Available" value={String(item.TotalAvailable)} />
                    <Field label="Min Stock Level" value={item.MinStockLevel != null ? String(item.MinStockLevel) : null} />
                    <Field label="Reorder Point" value={item.ReorderPoint != null ? String(item.ReorderPoint) : null} />
                    <Field label="Max Stock Level" value={item.MaxStockLevel != null ? String(item.MaxStockLevel) : null} />
                </div>

                {user?.isAdmin && <div className="barcode-assignment"><div><strong>Barcode identity</strong><span>{item.BarcodeValue || 'No barcode assigned'}</span></div><div className="toolbar" style={{ margin: 0 }}><BarcodeScanner onScan={saveBarcode} label={item.BarcodeValue ? 'Replace barcode' : 'Assign barcode'} />{item.BarcodeValue && <button className="btn btn-ghost" disabled={savingBarcode} onClick={() => saveBarcode('')}>Remove</button>}</div></div>}

                <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 14 }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Hazard Class</div>
                    <div style={{ marginTop: 4 }}>
                        {item.HazardName && item.HazardName !== 'Not Specified' ? (
                            <>
                                <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <HazardSymbols hazardName={item.HazardName} />
                                    {item.HazardName}
                                </span>
                                {item.HazardDescription && (
                                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '6px 0 0' }}>{item.HazardDescription}</p>
                                )}
                            </>
                        ) : (
                            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>None specified</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '14px 18px', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>Batches</div>
                <table>
                    <thead>
                        <tr>
                            <th>Batch #</th>
                            <th>Certificate</th>
                            <th>Supplier</th>
                            <th>Location</th>
                            <th>Received</th>
                            <th>Expiry</th>
                            <th>Received Qty</th>
                            <th>Remaining</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {item.batches.map((b) => (
                            <tr key={b.BatchID}>
                                <td>{b.BatchNumber}</td>
                                <td>{b.CertificateNumber}</td>
                                <td>{b.SupplierName}</td>
                                <td>{b.LocationCode}</td>
                                <td>{formatDate(b.ReceivedDate)}</td>
                                <td>{formatDate(b.ExpiryDate)}</td>
                                <td>{b.QuantityReceived}</td>
                                <td>{b.QuantityRemaining}</td>
                                <td>
                                    <StatusBadge status={b.IsActive ? 'Active' : 'Inactive'} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Field({ label, value }: { label: string; value: string | null }) {
    return (
        <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 14, marginTop: 2 }}>{value || '—'}</div>
        </div>
    );
}
