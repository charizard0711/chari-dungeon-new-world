import {openModalMotion} from './modalMotion';
import Phaser from 'phaser';
import { addPaintedModalFrame } from './paintedModal';

/** A painted guide panel with wrapping after localization. */
export function createGuideModal(scene: Phaser.Scene, steps: readonly (readonly [string, string])[], onClose: () => void) {
  const { width: screenW, height: screenH } = scene.scale;
  const width = Math.min(screenW - 24, scene.sys.settings.key==='OnlineUIScene'?920:600), height = Math.min(screenH - 40, scene.sys.settings.key==='OnlineUIScene'?680:440);
  const x = (screenW - width) / 2, y = (screenH - height) / 2, online=scene.sys.settings.key==='OnlineUIScene';
  const card = scene.add.container(0, 0).setDepth(400).setName('controls-guide-modal');
  const shade = scene.add.rectangle(screenW / 2, screenH / 2, screenW, screenH, 0x02080c, .84).setInteractive();
  const panel = addPaintedModalFrame(scene,screenW/2,screenH/2,width,height);
  const fontFamily = '"Yu Gothic UI", "Meiryo", sans-serif';
  const title = scene.add.text(x + 30, y + 30, '', { fontFamily, fontSize: width < 400 ? '18px' : '21px', color: '#ffe4aa', fontStyle: 'bold', wordWrap:{width:width-90,useAdvancedWrap:true} });
  const body = scene.add.text(x + 30, y + 108, '', { fontFamily, fontSize: '15px', color: '#e0e9de', lineSpacing: 7, wordWrap:{width:width-60,useAdvancedWrap:true} }).setName('controls-guide-body');
  let step = 0;
  const close = () => { card.destroy(true); onClose(); };
  const nextBackground = online?scene.add.rectangle(x+width-110,y+height-43,180,38,0x21323e).setStrokeStyle(1,0x8ba6b6):scene.add.image(x + width - 110, y + height - 43,'title-menu-frame').setDisplaySize(180,90);
  const next = scene.add.text(x + width - 110, y + height - 43, '', { fontFamily, fontSize: '14px', color: '#ffe4aa', padding: { x: 12, y: 12 } }).setOrigin(.5).setName('controls-guide-next').setInteractive({ useHandCursor: true });
  const skip = scene.add.text(x + 24, y + height - 38, '閉じる', { fontFamily, fontSize: '14px', color: '#b8c8bc', padding: { x: 8, y: 10 } }).setOrigin(0, .5).setInteractive({ useHandCursor: true }).on('pointerdown', close);
  const render = () => {
    title.setText(`${step + 1}/${steps.length}　${steps[step][0]}`);
    body.setText(steps[step][1]);
    next.setText(step === steps.length - 1 ? '冒険を始める' : '次へ ›');
  };
  next.on('pointerdown', () => { if (step === steps.length - 1) close(); else { step++; render(); } });
  if(online)title.setPosition(x+width/2,y+24).setOrigin(.5,0).setColor('#e8eff4');
  card.add([shade, panel, title, body, nextBackground, next, skip]); render();if(online)openModalMotion(scene,card,screenW/2,screenH/2);
  return card;
}
