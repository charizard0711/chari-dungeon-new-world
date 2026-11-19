import type Phaser from 'phaser';

// These assets originated in the event, but normal weapons also use them.
export const SHARED_COMBAT_EFFECTS = new Set(['fx_hw_freeze', 'fx_hw_aura_a', 'fx_hw_aura_b', 'fx_hw_barrier']);

/** A local drawing keeps combat readable even after all artwork retries fail. */
export function ensureCombatEffectTextures(scene: Phaser.Scene) {
  for (const key of SHARED_COMBAT_EFFECTS) {
    if (scene.textures.exists(key)) continue;
    const g = scene.add.graphics();
    if (key === 'fx_hw_freeze') {
      for (const [x, y, height] of [[32, 78, 48], [55, 76, 67], [79, 84, 57], [96, 90, 35]]) {
        g.fillStyle(0x78dfff, .42).fillTriangle(x - 12, y + 28, x, y - height, x + 14, y + 28);
        g.lineStyle(2, 0xd9faff, .85).strokeTriangle(x - 12, y + 28, x, y - height, x + 14, y + 28);
        g.lineStyle(1, 0xffffff, .7).lineBetween(x, y - height, x + 3, y + 23);
      }
    } else if (key === 'fx_hw_barrier') {
      g.fillStyle(0x6bbcff, .16).fillEllipse(64, 64, 105, 115);
      g.lineStyle(3, 0xd2eeff, .9).strokeEllipse(64, 64, 105, 115);
      g.lineStyle(1, 0x86dfff, .65).strokeEllipse(64, 64, 92, 101);
    } else {
      for (let radius = 53; radius > 4; radius -= 7) {
        g.fillStyle(key === 'fx_hw_aura_a' ? 0xffd879 : 0x9af1ff, .055).fillCircle(64, 64, radius);
      }
    }
    g.generateTexture(key, 128, 128);
    g.destroy();
  }
}
