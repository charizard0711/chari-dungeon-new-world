import { translate } from './i18n';
import { createLoadingTipPicker } from './loadingTips';
const screen = () => document.getElementById('loading-screen');
const nextTip = createLoadingTipPicker();
let tipTimer: ReturnType<typeof setInterval> | undefined;

function showNextTip(root: HTMLElement) {
  const tip=root.querySelector<HTMLElement>('.loading-tip');
  if(tip) { tip.dataset.source=nextTip(); tip.textContent=translate(tip.dataset.source); }
}

export function showLoading(progress = 0, label = '動画の再生を準備中…', mode: 'boot' | 'entry' | 'stairs' = 'boot') {
  clearInterval(tipTimer);tipTimer=undefined;
  const root = screen();
  if (!root) return;
  root.dataset.mode = mode;
  root.querySelector('h2')!.textContent = translate(mode === 'stairs' ? 'さらに深い階層へ…' : 'ダンジョンの扉を開いています…');
  root.style.removeProperty('display');
  if(mode !== 'boot') {
    showNextTip(root);
    tipTimer=setInterval(()=>{if(!document.hidden && root.style.display !== 'none')showNextTip(root);},7000);
  }
  updateLoading(progress, label);
}

export function updateLoading(progress: number, label: string) {
  const root = screen();
  if (!root) return;
  const value = Math.min(100, Math.max(0, Math.round(progress * 100)));
  root.querySelector<HTMLElement>('.loading-fill')!.style.width = `${value}%`;
  const status=root.querySelector<HTMLElement>('.loading-status')!;
  status.dataset.source=label;
  status.textContent = translate(label);
  root.querySelector<HTMLElement>('.loading-percent')!.textContent = `${value}%`;
  root.querySelector('[role="progressbar"]')!.setAttribute('aria-valuenow', String(value));
}

export function finishLoading() {
  clearInterval(tipTimer);tipTimer=undefined;
  const root = screen();
  if (root) root.style.display = 'none';
}
