import type Phaser from 'phaser';
import {crystalPanel} from './online/crystalHud';

/** Nine-slicing preserves the painted jewels and filigree on both small and large panels. */
export function addPaintedModalFrame(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
  if(scene.sys.settings.key==='OnlineUIScene')return crystalPanel(scene,x-width/2,y-height/2,width,height).setName('painted-modal-frame');
  const scale = width < 500 ? .18 : .22;
  return scene.add.nineslice(x, y, 'ui_modal_frame', undefined,
    width / scale, height / scale, 256, 256, 256, 256).setScale(scale).setName('painted-modal-frame');
}
