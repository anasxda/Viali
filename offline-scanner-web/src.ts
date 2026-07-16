import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import './style.css';

type Scan = { code: string; date: string };
const key = 'viali-offline-scan-history-v1';
const video = document.querySelector<HTMLVideoElement>('#video')!;
const scanButton = document.querySelector<HTMLButtonElement>('#scan')!;
const stopButton = document.querySelector<HTMLButtonElement>('#stop')!;
const cameraWrap = document.querySelector<HTMLElement>('#camera-wrap')!;
const status = document.querySelector<HTMLElement>('#status')!;
const history = document.querySelector<HTMLElement>('#history')!;
const empty = document.querySelector<HTMLElement>('#empty')!;
const clear = document.querySelector<HTMLButtonElement>('#clear')!;
const result = document.querySelector<HTMLElement>('#result')!;
const lastCode = document.querySelector<HTMLElement>('#last-code')!;
let controls: IScannerControls | undefined;
let locked = false;

const load = (): Scan[] => {
  try { return JSON.parse(localStorage.getItem(key) || '[]') as Scan[]; }
  catch { return []; }
};

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]!);

function render() {
  const scans = load();
  empty.hidden = scans.length > 0;
  clear.hidden = scans.length === 0;
  history.innerHTML = scans.map(item => `<div class="row"><span class="barcode">▥</span><div><strong>${escapeHtml(item.code)}</strong><small>${new Date(item.date).toLocaleString()}</small></div></div>`).join('');
}

function saveCode(raw: string) {
  const code = raw.trim();
  if (!code) return;
  const scans = load();
  scans.unshift({ code, date: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(scans.slice(0, 100)));
  lastCode.textContent = code;
  result.hidden = false;
  status.textContent = `Scanned ${code}`;
  navigator.vibrate?.(100);
  render();
}

function stopCamera() {
  controls?.stop();
  controls = undefined;
  video.srcObject = null;
  cameraWrap.hidden = true;
  stopButton.hidden = true;
  scanButton.hidden = false;
  locked = false;
}

scanButton.addEventListener('click', async () => {
  status.textContent = 'Starting camera…';
  scanButton.disabled = true;
  try {
    const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 120 });
    controls = await reader.decodeFromConstraints(
      { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } },
      video,
      (scanResult) => {
        if (!scanResult || locked) return;
        locked = true;
        saveCode(scanResult.getText());
        window.setTimeout(stopCamera, 350);
      }
    );
    cameraWrap.hidden = false;
    stopButton.hidden = false;
    scanButton.hidden = true;
    status.textContent = 'Camera is active — point it at a barcode.';
  } catch (error) {
    console.error(error);
    status.textContent = 'Camera could not start. Allow camera access in Safari Settings and try again.';
  } finally { scanButton.disabled = false; }
});

stopButton.addEventListener('click', () => { stopCamera(); status.textContent = 'Camera stopped.'; });
document.querySelector<HTMLFormElement>('#manual-form')!.addEventListener('submit', event => {
  event.preventDefault();
  const input = document.querySelector<HTMLInputElement>('#manual')!;
  saveCode(input.value);
  input.value = '';
});
clear.addEventListener('click', () => { localStorage.removeItem(key); result.hidden = true; render(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stopCamera(); });

render();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
