interface PaginationProps {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pageCount);
    const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const end = Math.min(safePage * pageSize, total);

    if (total <= pageSize) return null;

    return (
        <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 12 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Showing {start}–{end} of {total}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="btn btn-secondary" disabled={safePage === 1} onClick={() => onPageChange(safePage - 1)}>
                    Previous
                </button>
                <span style={{ fontSize: 13 }}>Page {safePage} of {pageCount}</span>
                <button className="btn btn-secondary" disabled={safePage === pageCount} onClick={() => onPageChange(safePage + 1)}>
                    Next
                </button>
            </div>
        </div>
    );
}
