// Gameplay has its own PRNG. Particle effects and frame timing never consume it.
import { LOOT_REVISION, PREVIOUS_LOOT_REVISION } from './model';
let state: number | undefined;
let legacyLoot = false;
let legacyBread = false;
let legacyKatana = false;
export const usesLegacyLoot = () => legacyLoot;
export const usesLegacyBread = () => legacyBread;
export const usesLegacyKatana = () => legacyKatana;
export function seedRun(seed: string) {
  legacyKatana = !seed.startsWith(`${LOOT_REVISION}:`);
  legacyBread = legacyKatana && !seed.startsWith('loot-v3:');
  legacyLoot = legacyBread && !seed.startsWith(`${PREVIOUS_LOOT_REVISION}:`);
  let hash = 2166136261;
  for (const ch of seed) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  state = hash >>> 0;
}
export function randomState() { return state; }
export function restoreRandom(value: number | undefined) { state = value; if (value === undefined) legacyLoot = legacyBread = legacyKatana = false; }
export function runRandom(): number {
  if (state === undefined) return Math.random();
  state = (state + 0x6d2b79f5) >>> 0;
  let n = state;
  n = Math.imul(n ^ n >>> 15, n | 1);
  n ^= n + Math.imul(n ^ n >>> 7, n | 61);
  return ((n ^ n >>> 14) >>> 0) / 4294967296;
}
export function runShuffle<T>(values: T[]): T[] {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(runRandom() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}
