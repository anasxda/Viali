import { Link } from 'react-router-dom';

const REFERENCE_RESOURCES = [
    { resource: 'roles', label: 'Roles' },
    { resource: 'categories', label: 'Categories' },
    { resource: 'units', label: 'Units' },
    { resource: 'locations', label: 'Locations' },
    { resource: 'hazard-classes', label: 'Hazard Classes' },
    { resource: 'manufacturers', label: 'Manufacturers' },
    { resource: 'movement-types', label: 'Movement Types' },
];

export default function AdminMenu() {
    return (
        <div>
            <h1 className="page-title">Administration</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <MenuCard to="/admin/users" title="User Management" desc="Add users, set roles, activate / deactivate access." />
                <MenuCard to="/admin/audit-log" title="Audit Log" desc="Read-only trail of every create/edit/delete/resolve action." />
                <MenuCard to="/admin/inventory-check" title="Monthly Inventory Check" desc="Set the supervisor email and mark this month's check as done." />
                {REFERENCE_RESOURCES.map((r) => (
                    <MenuCard key={r.resource} to={`/admin/reference/${r.resource}`} title={r.label} desc={`Manage the ${r.label.toLowerCase()} lookup list.`} />
                ))}
            </div>
        </div>
    );
}

function MenuCard({ to, title, desc }: { to: string; title: string; desc: string }) {
    return (
        <Link to={to} className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{desc}</div>
        </Link>
    );
}
