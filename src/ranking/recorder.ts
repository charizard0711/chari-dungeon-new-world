import type { GameScene } from '../scenes/GameScene';
import { DEV_TOOLS, VERIFIER } from '../buildFlags';
import { exactObject, MAX_COMMANDS, type Command, type RankedRun, type Standing, type RunTicket } from './model';

declare global {
  interface Window {
    __RANKING_REPLAY__?: { ticket: RunTicket; result?: Standing; ready?: boolean; error?: string };
  }
}
export const isReplay = () => (DEV_TOOLS || VERIFIER) && typeof window !== 'undefined' && !!window.__RANKING_REPLAY__;
const INDEX_OPS = ['useItem', 'equipWeapon', 'equipShield', 'equipArmor', 'sellWeapon', 'sellShield', 'sellArmor'];
const NO_ARGS = ['tryDescend', 'useWeaponSkill'];
const ITEM_KINDS = ['potion','stone','shieldstone','repair','torch','warp','seal','revive','invis','floorkey','candykey','dynamite','mystery_bread','skill_drink','slime_scroll','boss5_scroll'];
export function validCommand(value: unknown): value is Command {
  if (!exactObject(value, ['op','args'])) return false;
  const c = value as unknown as Command;
  if (typeof c.op !== 'string' || !Array.isArray(c.args) || c.args.some(a => !['string','number','boolean'].includes(typeof a))) return false;
  const a = c.args, index = (v: unknown) => Number.isInteger(v) && Number(v) >= 0 && Number(v) < 512;
  if (INDEX_OPS.includes(c.op)) return a.length === 1 && index(a[0]);
  if (NO_ARGS.includes(c.op)) return a.length === 0;
  if (c.op === 'playerAct') return a.length === 2 && typeof a[0] === 'string' && ['up','down','left','right'].includes(a[0]) && typeof a[1] === 'boolean';
  if (c.op === 'attackTarget') return a.length === 2 && a.every(index);
  if (c.op === 'repairEquipment') return a.length === 2 && ['weapon','shield'].includes(String(a[0])) && index(a[1]);
  if (c.op === 'unequipEquipment') return a.length === 1 && ['weapon','shield'].includes(String(a[0]));
  if (c.op === 'buyItem') return a.length === 1 && ['potion','repair','slime_scroll','boss5_scroll'].includes(String(a[0]));
  if (c.op === 'sellItem') return a.length === 1 && ITEM_KINDS.includes(String(a[0]));
  if (c.op === 'gachaPull') return a.length === 1 && ['weapon','armor'].includes(String(a[0]));
  if (c.op === 'claimSecretQuest') return a.length === 1 && /^w_[a-z0-9_]{1,64}$/.test(String(a[0]));
  return false;
}
export function invalidateRun(run: RankedRun | undefined, reason: string) {
  if (!run) return; run.eligible = false; run.reason = reason;
}
/** Enforce forced-sale and inventory ownership rules without trusting the UI overlay. */
export function actionAllowed(scene: GameScene, c: Command): boolean {
  if (scene.busy || scene.gameEnded || scene.reviving || (scene as any).assetsLoading) return false;
  const equipmentOps = ['equipWeapon','equipShield','equipArmor','unequipEquipment','sellWeapon','sellShield','sellArmor'];
  if (scene.pendingEquipment && !equipmentOps.includes(c.op)) return false;
  const collections: Record<string, unknown[]> = {
    useItem: scene.player.inventory, equipWeapon: scene.player.weapons, sellWeapon: scene.player.weapons,
    equipShield: scene.player.shields, sellShield: scene.player.shields,
    equipArmor: scene.player.armors, sellArmor: scene.player.armors,
  };
  if (collections[c.op] && !collections[c.op][Number(c.args[0])]) return false;
  if (c.op === 'repairEquipment' && !(c.args[0] === 'weapon' ? scene.player.weapons : scene.player.shields)[Number(c.args[1])]) return false;
  return true;
}
/** Only outer player actions are recorded; internal skill follow-ups keep their original behavior. */
export function installRecorder(scene: GameScene) {
  let nesting = 0;
  const target = scene as any;
  const originals = new Map<string, (...args: any[]) => any>();
  for (const op of [...INDEX_OPS, ...NO_ARGS, 'playerAct', 'attackTarget', 'repairEquipment', 'unequipEquipment', 'buyItem', 'sellItem', 'gachaPull', 'claimSecretQuest']) {
    const original = target[op]; originals.set(op, original);
    target[op] = function (...args: any[]) {
      if (nesting) return original.apply(scene, args);
      if (scene.busy || scene.gameEnded || (scene as any).reviving) return;
      const run = scene.rankedRun;
      let serialized: Command['args'] = args;
      if (op === 'playerAct') serialized = [args[0], !!args[1]?.moveOnly];
      if (op === 'useWeaponSkill' || op === 'tryDescend') serialized = [];
      if (op === 'gachaPull') serialized = [args[0] ?? 'weapon'];
      if (op === 'repairEquipment') serialized = [args[0], (args[0] === 'weapon' ? scene.player.weapons : scene.player.shields as any[]).indexOf(args[1])];
      const command = { op, args: serialized };
      if (!validCommand(command) || !actionAllowed(scene, command)) return;
      if (run?.ticket && !isReplay()) {
        if (run.commands.length >= MAX_COMMANDS) invalidateRun(run, '操作記録の上限に達したため、この冒険はランキング対象外です。');
        else run.commands.push(command);
      }
      nesting++;
      const finish = () => { nesting--; scene.saveRun(); };
      try {
        const value = original.apply(scene, args);
        if (value && typeof value.then === 'function') return value.catch((error: unknown) => {
          invalidateRun(run, '行動処理でエラーが発生しました。'); throw error;
        }).finally(finish);
        finish(); return value;
      } catch (error) { finish(); invalidateRun(run, '行動処理でエラーが発生しました。'); throw error; }
    };
  }
  scene.events.once('shutdown', () => { for (const [op, fn] of originals) target[op] = fn; });
}
export async function replayCommand(scene: GameScene, c: Command) {
  if (!isReplay() || !validCommand(c) || !actionAllowed(scene, c)) throw new Error('ILLEGAL_ACTION');
  const args: any[] = [...c.args];
  if (c.op === 'playerAct') args[1] = { moveOnly: args[1] };
  if (c.op === 'repairEquipment') args[1] = (args[0] === 'weapon' ? scene.player.weapons : scene.player.shields)[args[1]];
  await (scene as any)[c.op](...args);
}
