import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { RULESET, LOOT_REVISION, normalizeName, type LeaderboardEntry, type RankedDifficulty, type RunTicket, type Submission, type SubmissionStatus } from './model';

const env = (import.meta as any).env ?? {};
const api = String(env.VITE_RANKING_API_URL ?? '').replace(/\/$/, '');
const url = String(env.VITE_SUPABASE_URL ?? '');
const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '');
export const rankingConfigured = !!(api && url && key);
export class RankingRequestError extends Error { constructor(message: string, public status: number) { super(message); } }
const NAME_KEY = 'chari-dungeon.ranking.name.v1';
let client: SupabaseClient | undefined;
let signingIn: Promise<string> | undefined;
function auth() {
  return client ??= createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'chari-dungeon.ranking.auth.v1' } });
}
export async function hasIdentity() { return rankingConfigured && !!(await auth().auth.getSession()).data.session; }
export function savedName() { try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; } }
export function saveName(name: string) {
  try { localStorage.setItem(NAME_KEY, name); }
  catch { throw new Error('名前を保存できません。ブラウザの保存設定をご確認ください。'); }
}
async function token(captchaToken?: string): Promise<string> {
  client = auth();
  const { data: { session } } = await client.auth.getSession();
  if (session) return session.access_token;
  signingIn ??= client.auth.signInAnonymously({ options: { captchaToken } }).then(({ data, error }) => {
    if (error || !data.session) throw new Error('本人確認に失敗しました。接続を確認して、もう一度お試しください。');
    return data.session.access_token;
  }).finally(() => { signingIn = undefined; });
  return signingIn;
}
export async function request<T>(path: string, body?: unknown, captchaToken?: string): Promise<T> {
  if (!rankingConfigured) throw new Error('ランキングは準備中です。');
  const publicRead = path.startsWith('/leaderboard') || path === '/names/check';
  const bearer = publicRead ? (await auth().auth.getSession()).data.session?.access_token : await token(captchaToken);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${api}${path}`, {
      method: body === undefined ? 'GET' : 'POST', signal: controller.signal,
      headers: { ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    const data = await res.json();
    if (!res.ok) throw new RankingRequestError(data.message ?? '接続できませんでした。時間をおいてお試しください。', res.status);
    return data as T;
  } catch (error) {
    if (error instanceof TypeError || error instanceof DOMException) throw new Error('通信できませんでした。接続を確認して再試行してください。');
    throw error;
  } finally { clearTimeout(timer); }
}
export const checkName = (name: string, captcha?: string) => request<{ available: boolean }>('/names/check', {name:normalizeName(name).name}, captcha);
export async function reserveName(name: string, captcha?: string) {
  const result = await request<{ name: string }>('/names/reserve', {name:normalizeName(name).name}, captcha);
  saveName(result.name);
  return result.name;
}
export const startRankedRun = (difficulty: RankedDifficulty, gender: 'male' | 'female') =>
  request<RunTicket>('/runs', { difficulty, gender, ruleset: RULESET, lootRevision: LOOT_REVISION, requestId: crypto.randomUUID() });
export const fetchLeaderboard = (difficulty: RankedDifficulty) =>
  request<{ entries: LeaderboardEntry[]; own: LeaderboardEntry | null; participants?: number }>(`/leaderboard?difficulty=${difficulty}&ruleset=${RULESET}`);
export const sendSubmission = (submission: Submission) => request<{ status: SubmissionStatus }>(`/runs/${submission.run.ticket!.id}/finish`, {
  commands: submission.run.commands, claimed: submission.result
});
export const getSubmissionStatus = (id: string) => request<{ status: SubmissionStatus; message?: string }>(`/runs/${id}`);
