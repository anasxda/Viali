import { useEffect, useRef, useState } from 'react';

interface Props { onScan: (value: string) => void; label?: string; compact?: boolean }
type Detector = { detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> };

export default function BarcodeScanner({ onScan, label = 'Scan barcode', compact }: Props) {
    const [open, setOpen] = useState(false), [value, setValue] = useState(''), [camera, setCamera] = useState(false), [error, setError] = useState('');
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    function close() { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; setCamera(false); setOpen(false); setError(''); }
    function submit() { const code = value.trim(); if (code) { onScan(code); setValue(''); setOpen(false); } }
    async function startCamera() {
        const BarcodeDetector = (window as unknown as { BarcodeDetector?: new () => Detector }).BarcodeDetector;
        if (!BarcodeDetector) return setError('Camera scanning is not supported by this browser. Use a handheld scanner or enter the code.');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            streamRef.current = stream; setCamera(true);
            setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; void videoRef.current.play(); } });
            const detector = new BarcodeDetector();
            const poll = async () => {
                if (!streamRef.current || !videoRef.current) return;
                try { const codes = await detector.detect(videoRef.current); if (codes[0]?.rawValue) { onScan(codes[0].rawValue); close(); return; } } catch { /* next frame */ }
                requestAnimationFrame(poll);
            };
            requestAnimationFrame(poll);
        } catch { setError('Camera access was unavailable. Check browser permissions or use a handheld scanner.'); }
    }
    useEffect(() => () => streamRef.current?.getTracks().forEach(t => t.stop()), []);
    return <>
        <button type="button" className={compact ? 'btn btn-secondary btn-icon' : 'btn btn-secondary'} onClick={() => setOpen(true)} title={label}><span className="icon-glyph">▥</span>{compact ? null : label}</button>
        {open && <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && close()}><div className="card scanner-card">
            <div className="modal-heading"><div><span className="eyebrow">FAST CAPTURE</span><h2>Scan a barcode</h2></div><button type="button" className="btn btn-ghost btn-icon" onClick={close}>×</button></div>
            <p className="muted">Use a USB/Bluetooth reader, enter the number, or scan with this device's camera.</p>
            {error && <div className="error-banner">{error}</div>}
            {camera ? <div className="camera-frame"><video ref={videoRef} muted playsInline /><div className="scan-line" /></div> : <div className="scanner-input-row"><input autoFocus value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Scan or enter barcode…"/><button type="button" className="btn btn-primary" onClick={submit}>Use code</button></div>}
            {!camera && <button type="button" className="btn btn-secondary camera-button" onClick={startCamera}>Use camera</button>}
        </div></div>}
    </>;
}
