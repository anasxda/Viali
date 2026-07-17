export function formatDate(value: string | null | undefined) {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
}

export function formatDateTime(value: string | null | undefined) {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString();
}

const STATUS_CLASS: Record<string, string> = {
    OK: 'badge-ok',
    'Low Stock': 'badge-warn',
    Reorder: 'badge-warn',
    'Out of Stock': 'badge-danger',
    Inactive: 'badge-muted',
    Expired: 'badge-danger',
    'Expiring Soon': 'badge-warn',
    Open: 'badge-warn',
    Resolved: 'badge-ok',
    Active: 'badge-ok',
};

export function StatusBadge({ status }: { status: string }) {
    return <span className={`badge ${STATUS_CLASS[status] || 'badge-muted'}`}>{status}</span>;
}
