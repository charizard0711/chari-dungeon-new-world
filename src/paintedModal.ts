import type Phaser from 'phaser';

/** Nine-slicing preserves the painted jewels and filigree on both small and large panels. */
export function addPaintedModalFrame(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
  const scale = width < 500 ? .18 : .22;
  return scene.add.nineslice(x, y, 'ui_modal_frame', undefined,
    width / scale, height / scale, 256, 256, 256, 256).setScale(scale).setName('painted-modal-frame');
}
