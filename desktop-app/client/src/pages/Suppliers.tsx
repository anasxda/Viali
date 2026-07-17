import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { StatusBadge } from '../utils';

interface Supplier {
    SupplierID: number;
    SupplierName: string;
    ContactPerson: string | null;
    Email: string | null;
    Phone: string | null;
    StatusText: string;
}

export default function Suppliers() {
    const [rows, setRows] = useState<Supplier[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.get('/api/suppliers').then(setRows).catch((e) => setError(e.message));
    }, []);

    if (error) return <div className="error-banner">{error}</div>;

    return (
        <div>
            <h1 className="page-title">Suppliers</h1>
            <div className="card" style={{ padding: 0 }}>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Contact</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((s) => (
                            <tr key={s.SupplierID}>
                                <td>
                                    <Link to={`/suppliers/${s.SupplierID}`}>{s.SupplierName}</Link>
                                </td>
                                <td>{s.ContactPerson}</td>
                                <td>{s.Email}</td>
                                <td>{s.Phone}</td>
                                <td>
                                    <StatusBadge status={s.StatusText} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
