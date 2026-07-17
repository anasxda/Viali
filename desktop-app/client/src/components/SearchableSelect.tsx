import { useEffect, useRef, useState } from 'react';

export interface SearchableOption {
    value: string;
    label: string;
    sublabel?: string;
}

interface SearchableSelectProps {
    id?: string;
    options: SearchableOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    emptyText?: string;
}

// A type-to-search dropdown - replaces a plain <select> for long lists
// (e.g. 500+ inventory items) where scrolling to find an entry is painful.
export default function SearchableSelect({
    id,
    options,
    value,
    onChange,
    placeholder = 'Type to search…',
    disabled,
    emptyText = 'No matches',
}: SearchableSelectProps) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(0);
    const rootRef = useRef<HTMLDivElement>(null);

    const selected = options.find((o) => o.value === value) || null;

    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery('');
            }
        }
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const filtered = query
        ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
        : options;

    function pick(opt: SearchableOption) {
        onChange(opt.value);
        setQuery('');
        setOpen(false);
    }

    function onKeyDown(e: React.KeyboardEvent) {
        if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
            setOpen(true);
            return;
        }
        if (!open) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filtered[highlight]) pick(filtered[highlight]);
        } else if (e.key === 'Escape') {
            setOpen(false);
            setQuery('');
        }
    }

    return (
        <div ref={rootRef} style={{ position: 'relative', width: '100%' }}>
            <input
                id={id}
                disabled={disabled}
                autoComplete="off"
                placeholder={disabled ? emptyText : placeholder}
                value={open ? query : selected?.label || ''}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setHighlight(0);
                    if (!open) setOpen(true);
                }}
                onFocus={() => {
                    setOpen(true);
                    setQuery('');
                }}
                onKeyDown={onKeyDown}
                style={{ width: '100%' }}
            />
            {open && !disabled && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: 4,
                        maxHeight: 280,
                        overflowY: 'auto',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        boxShadow: '0 8px 24px rgba(16, 24, 40, 0.12)',
                        zIndex: 50,
                    }}
                >
                    {filtered.length === 0 && (
                        <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-muted)' }}>{emptyText}</div>
                    )}
                    {filtered.map((opt, i) => (
                        <div
                            key={opt.value}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                pick(opt);
                            }}
                            onMouseEnter={() => setHighlight(i)}
                            style={{
                                padding: '8px 12px',
                                fontSize: 14,
                                cursor: 'pointer',
                                background: i === highlight ? 'var(--teal-100)' : 'transparent',
                            }}
                        >
                            {opt.label}
                            {opt.sublabel && (
                                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>{opt.sublabel}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
