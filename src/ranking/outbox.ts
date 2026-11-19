import { getSubmissionStatus, rankingConfigured, RankingRequestError, sendSubmission } from './api';
import type { Submission, SubmissionStatus } from './model';

const KEY = 'chari-dungeon.ranking.outbox.v1.';
interface Pending { submission: Submission; status: SubmissionStatus; message?: string }
let running: Promise<void> | undefined;
const updates = new EventTarget();
function read(): Pending[] {
  const rows: Pending[] = [];
  try { for (let i=0; i<localStorage.length; i++) {
    const key=localStorage.key(i); if (!key?.startsWith(KEY)) continue;
    try { const row=JSON.parse(localStorage.getItem(key)!); if(row?.submission?.run?.ticket?.id) rows.push(row); } catch { /* ignore only malformed rows */ }
  } } catch { /* UI will report storage errors on write */ }
  return rows;
}
function write(row: Pending) { localStorage.setItem(KEY+row.submission.run.ticket!.id,JSON.stringify(row)); updates.dispatchEvent(new Event('change')); }
export function submissionState(id: string) { return read().find(row => row.submission.run.ticket?.id === id); }
export function watchSubmissions(fn: () => void) { updates.addEventListener('change', fn); return () => updates.removeEventListener('change', fn); }
export function enqueueSubmission(submission: Submission) {
  if (!submission.run.ticket || !submission.run.eligible) return;
  const rows = read();
  if (!rows.some(row => row.submission.run.ticket?.id === submission.run.ticket!.id)) {
    // Per-run keys prevent concurrent tabs from overwriting other pending records.
    write({ submission: structuredClone(submission), status: 'queued' });
    const complete=rows.filter(row=>row.status==='verified'||row.status==='rejected');
    for(const row of complete.slice(0,Math.max(0,complete.length-20))) localStorage.removeItem(KEY+row.submission.run.ticket!.id);
  }
  void flushSubmissions();
}
export function flushSubmissions(): Promise<void> {
  if (running) return running;
  if (!rankingConfigured) return Promise.resolve();
  running = (async () => {
    for (const item of read()) {
      if (item.status === 'verified' || item.status === 'rejected') continue;
      try {
        const result = item.status === 'queued' ? await sendSubmission(item.submission)
          : await getSubmissionStatus(item.submission.run.ticket!.id);
        item.status = result.status; item.message = undefined;
        if (item.status === 'verified' || item.status === 'rejected') item.submission.run.commands = [];
      } catch (error) {
        item.message = (error as Error).message;
        if(error instanceof RankingRequestError && [400,403,404,409,410,413].includes(error.status)) item.status='rejected';
      }
      try { write(item); } catch { break; }
    }
  })().finally(() => { running = undefined; });
  return running;
}
window.addEventListener('online', () => void flushSubmissions());
window.addEventListener('storage', e => { if(e.key?.startsWith(KEY)) updates.dispatchEvent(new Event('change')); });
