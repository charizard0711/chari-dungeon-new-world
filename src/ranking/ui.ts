import type Phaser from 'phaser';
import { fetchLeaderboard, hasIdentity, rankingConfigured, reserveName, savedName, startRankedRun } from './api';
import { floorLabel, rankTurns, type RankedDifficulty, type RankedRun } from './model';
import { flushSubmissions } from './outbox';
import './ranking.css';

import { translate } from '../i18n';

const names = { normal: 'ノーマル', hard: 'ハード', master: 'マスター' };
// User-requested temporary aggregation: registered names + 50 visits on 2026-10-11.
// Includes overlaps; this is not a unique-account or currently-online count.
const participationCount = (registered: number) => registered + (Date.now() < Date.parse('2026-10-19T00:00:00+09:00') ? 50 : 0);
function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', cls = '') {
  const node = document.createElement(tag); node.textContent = translate(text); node.className = cls; return node;
}
function modal(scene: Phaser.Scene, label: string, onClose?: () => void) {
  const overlay = element('div', '', 'ranking-overlay');
  const panel = element('section', '', 'ranking-panel');
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', translate(label));
  const oldFocus = document.activeElement as HTMLElement | null;
  const inputEnabled = scene.input.enabled;
  const keyboardEnabled = scene.input.keyboard?.enabled;
  scene.input.enabled = false;
  if (scene.input.keyboard) scene.input.keyboard.enabled = false;
  const header=element('header','','ranking-heading');
  header.append(element('p', 'CHARI DUNGEON', 'ranking-eyebrow'), element('h1', label));
  panel.append(header);
  const close = element('button', '', 'ranking-close'); close.type = 'button';
  close.setAttribute('aria-label',translate('閉じる'));close.title=translate('閉じる');
  panel.append(close); overlay.append(panel); document.body.append(overlay);
  let closed = false;
  const dispose = () => {
    if (closed) return; closed = true;
    overlay.remove(); scene.input.enabled = inputEnabled;
    if (scene.input.keyboard) scene.input.keyboard.enabled = keyboardEnabled ?? true;
    scene.events.off('shutdown', dispose); panel.removeEventListener('keydown', trap);
    oldFocus?.focus(); onClose?.();
  };
  const trap = (event: KeyboardEvent) => {
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); dispose(); }
    if (event.key === 'Tab') {
      const nodes = [...panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]')];
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  };
  panel.addEventListener('keydown', trap); close.onclick = dispose;
  overlay.addEventListener('click',event=>{if(event.target===overlay)dispose();});
  scene.events.once('shutdown', dispose);
  close.focus();
  return { panel, dispose, active: () => !closed };
}

export async function prepareRankedRun(difficulty: RankedDifficulty, gender: 'male' | 'female'): Promise<RankedRun> {
  const name = savedName();
  if (!name || rankingConfigured && !await hasIdentity()) throw new Error('最初に冒険者の名前を登録してください。');
  if (!rankingConfigured) return { ticket: null, name, commands: [], eligible: false, reason: 'ランキング準備中の冒険です。' };
  await reserveName(name);
  const ticket = await startRankedRun(difficulty, gender);
  void flushSubmissions();
  return { ticket, name: ticket.name, commands: [], eligible: true };
}
export function showLeaderboard(scene: Phaser.Scene, initial: RankedDifficulty = 'normal') {
  const m = modal(scene, '迷宮の記録');
  m.panel.classList.add('ranking-board');
  m.panel.querySelector('header')!.append(element('p', '深くへ。そして、少ない手数で。', 'ranking-intro'));
  const participants = element('p', '', 'ranking-participants');
  participants.setAttribute('aria-live', 'polite');
  m.panel.querySelector('header')!.append(participants);
  const tabs = element('div', '', 'ranking-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', translate('難易度'));
  const body = element('div','','ranking-body'); body.setAttribute('role', 'tabpanel'); body.setAttribute('aria-live', 'polite');
  const rules=element('details','','ranking-rules');
  rules.append(element('summary','順位の決まり方'),element('p', '全クリア → 到達階が深い順 → 到達までのターン数が少ない順。同じ記録は同順位。攻撃も1ターンに数えます。全クリアは総ターン数で比較します。', 'ranking-muted'));
  m.panel.append(tabs, rules, body);
  const footer=element('footer','','ranking-footer'),back=element('button','戻る','ranking-back');
  back.type='button';back.onclick=m.dispose;footer.append(back);m.panel.append(footer);
  let revision = 0;
  const buttons = new Map<RankedDifficulty, HTMLButtonElement>();
  const load = async (difficulty: RankedDifficulty) => {
    const current = ++revision;
    buttons.forEach((b, mode) => { b.setAttribute('aria-selected', String(mode === difficulty)); b.tabIndex = mode === difficulty ? 0 : -1; });
    body.setAttribute('aria-label',translate(names[difficulty]));body.dataset.empty='true';body.scrollTop=0;
    body.replaceChildren(element('p', rankingConfigured ? '冒険者の記録を読み込んでいます…' : 'ランキングは準備中です。', 'ranking-empty'));
    if (!rankingConfigured) { body.append(element('p', 'サーバー接続後、検証済みの冒険がここに並びます。', 'ranking-muted')); return; }
    try {
      const data = await fetchLeaderboard(difficulty);
      if (!m.active() || current !== revision) return;
      participants.textContent = Number.isSafeInteger(data.participants) && data.participants! >= 0
        ? translate(`${participationCount(data.participants!)}人参加中`) : '';
      body.replaceChildren();
      if (!data.entries.length) { body.append(element('p', 'まだ記録がありません。最初の足跡を残そう。', 'ranking-empty')); return; }
      body.dataset.empty='false';
      const wrap = element('div', '', 'ranking-table-wrap');
      const table = element('table');
      const head = element('thead'), row = element('tr');
      for (const title of ['順位', '冒険者', '到達階', 'ターン']) { const th = element('th', title); th.scope = 'col'; row.append(th); }
      head.append(row); table.append(head);
      const rows = element('tbody');
      for (const entry of data.entries) {
        const tr = element('tr'); if (entry.mine) tr.className = 'ranking-mine';
        const nameCell=element('td'); nameCell.textContent=entry.name;
        tr.append(element('td', String(entry.rank), entry.rank <= 3 ? 'ranking-medal' : ''), nameCell, element('td', floorLabel(entry)), element('td', rankTurns(entry).toLocaleString()));
        rows.append(tr);
      }
      table.append(rows); wrap.append(table); body.append(wrap);
      if (data.own) body.append(element('p', `あなたのベスト：${data.own.rank}位 · ${floorLabel(data.own)} · ${rankTurns(data.own).toLocaleString()}ターン`, 'ranking-personal'));
      body.append(element('p', '各難易度で1人1件の自己ベストを掲載しています。', 'ranking-muted'));
    } catch (e) {
      if (!m.active() || current !== revision) return;
      body.replaceChildren(element('p', (e as Error).message, 'ranking-notice'));
      const retry = element('button', '再読み込み', 'ranking-primary'); retry.onclick = () => void load(difficulty); body.append(retry);
    }
  };
  for (const difficulty of ['normal', 'hard', 'master'] as const) {
    const b = element('button', names[difficulty]); b.setAttribute('role', 'tab'); b.onclick = () => void load(difficulty);
    b.onkeydown = event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const modes = ['normal', 'hard', 'master'] as const, idx = modes.indexOf(difficulty);
      const next = modes[(idx + (event.key === 'ArrowRight' ? 1 : 2)) % 3]; buttons.get(next)?.focus(); void load(next);
    };
    tabs.append(b); buttons.set(difficulty, b);
  }
  void load(initial);
}

