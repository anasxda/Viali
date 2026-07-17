import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';

interface SupplierDetailData {
    SupplierID: number;
    SupplierName: string;
    ContactPerson: string | null;
    Email: string | null;
    Phone: string | null;
    Address: string | null;
    items: { ItemID: number; ItemDescription: string; LegacyItemCode: string | null }[];
}

export default function SupplierDetail() {
    const { id } = useParams();
    const [supplier, setSupplier] = useState<SupplierDetailData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.get(`/api/suppliers/${id}`).then(setSupplier).catch((e) => setError(e.message));
    }, [id]);

    if (error) return <div className="error-banner">{error}</div>;
    if (!supplier) return <p>Loading…</p>;

    return (
        <div>
            <Link to="/suppliers" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                ← Back to Suppliers
            </Link>
            <h1 className="page-title" style={{ marginTop: 8 }}>
                {supplier.SupplierName}
            </h1>

            <div className="card" style={{ marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <Field label="Contact Person" value={supplier.ContactPerson} />
                <Field label="Email" value={supplier.Email} />
                <Field label="Phone" value={supplier.Phone} />
                <Field label="Address" value={supplier.Address} />
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '14px 18px', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>Items Supplied</div>
                <table>
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Item</th>
                        </tr>
                    </thead>
                    <tbody>
                        {supplier.items.map((i) => (
                            <tr key={i.ItemID}>
                                <td>{i.LegacyItemCode}</td>
                                <td>
                                    <Link to={`/inventory/${i.ItemID}`}>{i.ItemDescription}</Link>
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
