import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { StatusBadge } from '../utils';
import BarcodeScanner from '../components/BarcodeScanner';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 50;

interface Item {
    ItemID: number;
    LegacyItemCode: string | null;
    ItemDescription: string;
    CategoryName: string;
    UnitName: string;
    LocationCode: string;
    TotalAvailable: number;
    ReorderPoint: number | null;
    StockStatus: string;
    IsActive: number;
    BarcodeValue: string | null;
}

export default function Inventory() {
    const [items, setItems] = useState<Item[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [page, setPage] = useState(1);

    useEffect(() => {
        api.get('/api/inventory').then(setItems).catch((e) => setError(e.message));
    }, []);

    const filtered = useMemo(() => {
        return items.filter((i) => {
            if (statusFilter !== 'All' && i.StockStatus !== statusFilter) return false;
            if (search && !i.ItemDescription.toLowerCase().includes(search.toLowerCase()) && !(i.LegacyItemCode || '').includes(search) && !(i.BarcodeValue || '').includes(search)) {
                return false;
            }
            return true;
        });
    }, [items, search, statusFilter]);

    useEffect(() => setPage(1), [search, statusFilter]);

    const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    if (error) return <div className="error-banner">{error}</div>;

    return (
        <div>
            <div className="page-heading scan-page-heading"><BarcodeScanner onScan={setSearch} /><div><span className="eyebrow">CATALOG</span><h1 className="page-title">Inventory</h1><p className="page-subtitle">Search, scan and inspect every controlled item.</p></div></div>
            <div className="toolbar">
                <input placeholder="Search name, code or barcode…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 300 }} />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    {['All', 'OK', 'Low Stock', 'Reorder', 'Out of Stock', 'Inactive'].map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{filtered.length} items</span>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
                <table>
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Item</th>
                            <th>Category</th>
                            <th>Location</th>
                            <th>Available</th>
                            <th>Unit</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map((i) => (
                            <tr key={i.ItemID}>
                                <td>{i.LegacyItemCode}</td>
                                <td>
                                    <Link to={`/inventory/${i.ItemID}`}>{i.ItemDescription}</Link>
                                </td>
                                <td>{i.CategoryName}</td>
                                <td>{i.LocationCode}</td>
                                <td>{i.TotalAvailable}</td>
                                <td>{i.UnitName}</td>
                                <td>
                                    <StatusBadge status={i.StockStatus} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </div>
    );
}
