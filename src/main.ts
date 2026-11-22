import {installGamePresentation} from './online/presentation';
import {Audio} from './audio/manager';
import { installLocalization } from './i18n';
import { DEV_TOOLS, VERIFIER } from './buildFlags';
import { installScreenSizing } from './menuPresentation';
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { UIScene } from './scenes/UIScene';

import { GAME_W, GAME_H } from './layout';
export { GAME_W, GAME_H };

const config: Phaser.Types.Core.GameConfig = {
  // Avoid GPU texture copies in the private verifier; game rules remain shared.
  type: VERIFIER ? Phaser.CANVAS : Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  audio: { noAudio: new URLSearchParams(location.search).get('mute') === '1' },
  backgroundColor: '#0b0e14',
  // 元のアセット画像に近づけるため、ドット絵の強制拡大(NEAREST)はやめて
  // スムーズ表示(アンチエイリアス)にする
  pixelArt: false,
  antialias: true,
  roundPixels: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, TitleScene, UIScene]
};

// The game uses right-click for actions, including DOM overlays above the canvas.
document.addEventListener('contextmenu', event => event.preventDefault(), {capture: true});

installLocalization();
const game = new Phaser.Game(config);
installScreenSizing(game);
installGamePresentation(game,Audio);
// Never expose game state on window in the publicly deployed build.
if (DEV_TOOLS || VERIFIER) (window as any).__game = game;
if (VERIFIER) Object.defineProperty(window, '__RANKING_VERIFIER_BUILD__', {value:true});
