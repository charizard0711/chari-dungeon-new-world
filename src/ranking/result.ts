import type Phaser from 'phaser';
import { GAME_H, GAME_W } from '../layout';
import { enqueueSubmission, flushSubmissions, submissionState, watchSubmissions } from './outbox';
import { showLeaderboard } from './ui';
import { translate } from '../i18n';
import type { RankedDifficulty, RankedRun, Standing } from './model';

export function addRankingResult(scene: Phaser.Scene, stats: { rankedRun?: RankedRun; standing?: Standing; rankingSaveError?: boolean; difficulty?: RankedDifficulty }) {
  const run = stats.rankedRun, cx = GAME_W / 2, phone = GAME_W < 700;
  const title = scene.add.text(cx, 22, '', {
    fontFamily: '"Yu Gothic UI"', fontSize: '13px', color: '#e3d0a2', backgroundColor: '#0b1b22cc', padding: { x: 16, y: 6 }
  }).setOrigin(.5).setDepth(100);
  title.setData('localeLiteral',true);
  const localizeTitle=()=>title.setText(run?.name ? `${translate('冒険者')}  ${run.name}` : translate('冒険の記録'));
  localizeTitle();window.addEventListener('chari-language-changed',localizeTitle);
  title.once('destroy',()=>window.removeEventListener('chari-language-changed',localizeTitle));
  const status = scene.add.text(cx, GAME_H - (phone ? 24 : 30), '', {
    fontFamily: '"Yu Gothic UI"', fontSize: phone ? '11px' : '13px', color: '#c8dccf', align: 'center',
    wordWrap: { width: GAME_W - 28 }, backgroundColor: '#0b1b22dd', padding: { x: 10, y: 8 }
  }).setOrigin(.5).setDepth(100).setName('ranking-status').setInteractive({ useHandCursor: true });
  let storageFailed = !!stats.rankingSaveError;
  const refresh = () => {
    if (!status.active) return;
    if (storageFailed) { status.setText('記録を保存できませんでした · タップして再送'); return; }
    if (!run?.eligible || !run.ticket) { status.setText(`${run?.reason ?? 'ランキング対象外の冒険です。'}\nランキングを見る ›`); return; }
    const item = submissionState(run.ticket.id);
    const label = item?.status === 'rejected' ? `${item.message ?? '記録を検証できませんでした。'}\nランキングを見る ›`
      : item?.message ? '通信を確認してください · タップして再送'
      : item?.status === 'verified' ? '登録完了 · ランキングを見る ›'
      : item?.status === 'verifying' ? '記録を検証しています · ランキングを見る ›'
      : '記録を送信しています…';
    status.setText(label);
  };
  status.on('pointerdown', async () => {
    if (storageFailed && run && stats.standing) {
      try { enqueueSubmission({ run, result: stats.standing }); storageFailed = false; } catch { /* retry remains available */ }
      refresh(); return;
    }
    if (run?.ticket && submissionState(run.ticket.id)?.message && submissionState(run.ticket.id)?.status !== 'rejected') { await flushSubmissions(); refresh(); }
    else showLeaderboard(scene, stats.difficulty ?? 'normal');
  });
  title.setInteractive({useHandCursor:true}).on('pointerdown', () => showLeaderboard(scene, stats.difficulty ?? 'normal'));
  const unsubscribe = watchSubmissions(refresh);
  const timer = scene.time.addEvent({ delay: 5000, loop: true, callback: () => { void flushSubmissions(); } });
  scene.events.once('shutdown', () => { unsubscribe(); timer.remove(); });
  refresh();
}
