import type { ReactElement } from 'react';

interface SymbolDef {
    key: string;
    title: string;
    match: (name: string) => boolean;
    pictogram: ReactElement;
}

const iconProps = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const SYMBOLS: SymbolDef[] = [
    { key: 'explosive', title: 'Explosive', match: n => n.includes('explos'), pictogram: <g {...iconProps}><path d="m7 15 3-5-1-4 4 3 3-2-1 5 3 3-5-1-3 3Z"/><path d="M5 7 3.5 5.5M6 4.5 5.5 2.5M12 4l1-2M17 6l2-1"/></g> },
    { key: 'flame', title: 'Flammable', match: n => n.includes('flammable') || n.includes('pyrophoric'), pictogram: <path {...iconProps} d="M12 3c1.5 3.3-2.2 4.8-.4 7.4.7 1 2.1.3 2.1-1.1 2.5 2 3.8 4.4 2.6 7.1-1.1 2.5-3.5 3.7-6.2 3.6-3-.1-5.6-2.4-5.6-5.5 0-3.4 2.8-5.2 4.4-7.9.9-1.5 1.4-3.4 1.3-5.3C10.8 4 11.5 3.5 12 3Z"/> },
    { key: 'oxidizer', title: 'Oxidizing', match: n => n.includes('oxidiz'), pictogram: <g {...iconProps}><circle cx="12" cy="15" r="4.2"/><path d="M12 3c1.4 2.1-.3 3.1-.7 4.5-.3 1.1.5 2 1.5 1.7 1-.3 1.2-1.3.8-2.2 1.8 1.3 2.7 3.1 2.3 5"/></g> },
    { key: 'gas', title: 'Gas under pressure', match: n => n.includes('compressed gas') || n.includes('gas under pressure') || n.includes('pressurized gas'), pictogram: <g {...iconProps}><rect x="5" y="9" width="13" height="6" rx="2"/><path d="M18 10.5h2M8 9V7h3v2"/></g> },
    { key: 'corrosive', title: 'Corrosive', match: n => n.includes('corrosive') || n.includes('caustic'), pictogram: <g {...iconProps}><path d="m5 6 5 2M14 5l5 2M8 8l-2 3M17 7l-2 4"/><path d="M3 17h8M12 17h9M4 14c2-1 4-1 6 1M13 14c2-2 4-2 6 0"/><path d="M5 4h5M14 3h5"/></g> },
    { key: 'toxic', title: 'Acute toxicity', match: n => n.includes('toxic') || n.includes('poison'), pictogram: <g {...iconProps}><path d="M12 4a5 5 0 0 0-5 5c0 2 1 3.4 2.2 4.3V16h5.6v-2.7C16 12.4 17 11 17 9a5 5 0 0 0-5-5Z"/><circle cx="10" cy="9" r=".8" fill="currentColor" stroke="none"/><circle cx="14" cy="9" r=".8" fill="currentColor" stroke="none"/><path d="m9 19 6-2M9 17l6 2"/></g> },
    { key: 'health', title: 'Serious health hazard', match: n => n.includes('carcinogen') || n.includes('health hazard') || n.includes('mutagen') || n.includes('reproductive') || n.includes('sensitizer') || n.includes('aspiration'), pictogram: <g {...iconProps}><circle cx="12" cy="6" r="2.4"/><path d="M7 20c.2-5 1.5-8 5-8s4.8 3 5 8"/><path d="m12 13 1 2-1 3-1-3 1-2Z"/></g> },
    { key: 'irritant', title: 'Irritant / harmful', match: n => n.includes('irritant') || n.includes('harmful'), pictogram: <g {...iconProps}><path d="M12 5v9"/><circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/></g> },
    { key: 'environment', title: 'Environmental hazard', match: n => n.includes('environment') || n.includes('aquatic'), pictogram: <g {...iconProps}><path d="M4 18h17M8 17l3-10M8 11l-3-2M10 12l3-2"/><path d="M14 16c2-3 5-3 7-1-2 2-5 3-7 1Z"/></g> },
];

export function getHazardSymbols(hazardName: string | null | undefined): SymbolDef[] {
    if (!hazardName || hazardName.toLowerCase() === 'not specified') return [];
    const lower = hazardName.toLowerCase();
    return SYMBOLS.filter(symbol => symbol.match(lower));
}

export default function HazardSymbols({ hazardName, size = 'sm' }: { hazardName: string | null | undefined; size?: 'sm' | 'md' }) {
    const symbols = getHazardSymbols(hazardName);
    if (!symbols.length) return null;
    return <span className={`hazard-symbols hazard-symbols-${size}`} aria-label={`Hazards: ${symbols.map(s => s.title).join(', ')}`}>
        {symbols.map(({ key, title, pictogram }) => <span className="ghs-symbol" key={key} title={title}><svg viewBox="0 0 24 24" aria-hidden="true">{pictogram}</svg></span>)}
    </span>;
}
