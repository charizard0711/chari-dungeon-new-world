/** Shared by the browser and the trusted replay worker. Bump when game rules change. */
export const RULESET = 'depth-turns-v1';
// Ranking criteria stay the same. The server tags new seeds with the loot revision.
export const LOOT_REVISION = 'loot-v4';
export const PREVIOUS_LOOT_REVISION = 'loot-v2';
export const MAX_COMMANDS = 30_000;
export type RankedDifficulty = 'normal' | 'hard' | 'master';
export const rankedDifficulties: RankedDifficulty[] = ['normal', 'hard', 'master'];
export interface Standing {
  cleared: boolean;
  floor: number;
  bossRoom: boolean;
  arrivalTurns: number;
  turns: number;
}
export interface LeaderboardEntry extends Standing {
  rank: number;
  name: string;
  mine: boolean;
  finishedAt: string;
}
export interface RunTicket {
  id: string;
  seed: string;
  ruleset: string;
  difficulty: RankedDifficulty;
  name: string;
  gender: 'male' | 'female';
  expiresAt: string;
}
export interface Command { op: string; args: (string | number | boolean)[] }
export interface RankedRun {
  ticket: RunTicket | null;
  name: string;
  commands: Command[];
  eligible: boolean;
  reason?: string;
}
export interface Submission { run: RankedRun; result: Standing }
export type SubmissionStatus = 'queued' | 'verifying' | 'verified' | 'rejected';

export function normalizeName(raw: string): { name: string; key: string } {
  if (typeof raw !== 'string' || raw.length > 100) throw new Error('名前は2〜12文字で入力してください。');
  const name = raw.normalize('NFKC').trim();
  if ([...name].length < 2 || [...name].length > 12) throw new Error('名前は2〜12文字で入力してください。');
  if (!/^[\p{L}\p{N}ー_・]+$/u.test(name)) throw new Error('名前には文字・数字・「ー」「_」「・」を使えます。');
  return { name, key: name.toLowerCase() };
}
export const rankTurns = (s: Standing) => s.cleared ? s.turns : s.arrivalTurns;
export const depth = (s: Standing) => s.floor * 2 + (s.bossRoom ? 1 : 0);
export const floorLabel = (s: Standing) => s.cleared ? '30階 踏破' : `${s.floor}${s.bossRoom ? '.5' : ''}階`;
export function compareStandings(a: Standing, b: Standing): number {
  return Number(b.cleared) - Number(a.cleared) || depth(b) - depth(a) || rankTurns(a) - rankTurns(b);
}
export function exactObject(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
}
export function validStanding(value: unknown): value is Standing {
  if (!exactObject(value, ['cleared','floor','bossRoom','arrivalTurns','turns'])) return false;
  const s = value as unknown as Standing;
  return typeof s.cleared === 'boolean' && typeof s.bossRoom === 'boolean'
    && Number.isInteger(s.floor) && s.floor >= 1 && s.floor <= 30
    && Number.isInteger(s.turns) && s.turns >= 0 && s.turns <= 1_000_000
    && Number.isInteger(s.arrivalTurns) && s.arrivalTurns >= 0 && s.arrivalTurns <= s.turns
    && (!s.cleared || s.floor === 30 && s.bossRoom);
}
