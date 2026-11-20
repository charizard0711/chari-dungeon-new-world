import type Phaser from 'phaser';
import { VERIFIER } from './buildFlags';
import { MONSTER_DEFS } from './data';
import { DIRECTIONAL_MONSTERS, directionArtForFloor } from './monsterDirections';
import { MONSTER_ANIMATIONS } from './monsterAnimation';
import optimizedPaths from './optimizedAssetPaths.json';
import { showLoading, updateLoading, finishLoading } from './loadingScreen';
import { SHARED_COMBAT_EFFECTS, ensureCombatEffectTextures } from './combatEffectArt';

type Entry = { kind: 'image' | 'spritesheet'; key: string; path: string; config?: Phaser.Types.Loader.FileTypes.ImageFrameConfig };
const manifest = new Map<string, Entry>();
const loaded = new Set<string>();
const assetUrl = (path: string) => (optimizedPaths as Record<string, string>)[path] ?? path;
export function assetManifest() { return [...manifest.values()]; }
let chain: Promise<void> = Promise.resolve();
const titleKeys = new Set(['title-menu-frame','title_citadel_v1','title_map_background','title_golden_crossed_swords',
  'ui_obsidian_panel','ui_obsidian_castle','ui_difficulty_hard','ui_difficulty_master','ui_modal_frame','ui_close_button']);

/** Record the existing manifest while keeping boot limited to the title. */
export function captureBootAssets(scene: Phaser.Scene): () => void {
  manifest.clear(); loaded.clear(); chain = Promise.resolve();
  const loader = scene.load;
  loader.maxParallelDownloads = 4;
  const image = loader.image.bind(loader), sheet = loader.spritesheet.bind(loader);
  const record = (entry: Entry) => {
    manifest.set(entry.key, entry);
    // Verification uses the built-in small fallback textures, never downloaded artwork.
    if (VERIFIER) return loader;
    if (titleKeys.has(entry.key) || /(?:player-painted-v1|smooth-walk-v1)\/(male|female)-leather\./.test(entry.path)) {
      loader.once(`filecomplete-${entry.kind}-${entry.key}`, () => loaded.add(entry.key));
      if (entry.kind === 'image') image(entry.key, assetUrl(entry.path));
      else sheet(entry.key, assetUrl(entry.path), entry.config!);
    }
    return loader;
  };
  loader.image = ((key: string, path: string) => record({ kind: 'image', key, path })) as typeof loader.image;
  loader.spritesheet = ((key: string, path: string, config: Entry['config']) => record({ kind: 'spritesheet', key, path, config })) as typeof loader.spritesheet;
  return () => { loader.image = image; loader.spritesheet = sheet; scene.registry.set('assetManifest', [...manifest.values()]); };
}

function belongs(entry: Entry, floor: number, event: boolean, ending: boolean): boolean {
  if (ending) return entry.key === 'ending_dawn' || entry.key.startsWith('defeat_') || entry.key === 'quest_crest';
  if (entry.key === 'ending_dawn' || entry.key.startsWith('defeat_')) return false;
  if (SHARED_COMBAT_EFFECTS.has(entry.key)) return true;
  // The codex can display every species, including previously discovered event enemies.
  // Load portraits and direction sheets on entry; keep terrain and effects streamed.
  if (MONSTER_DEFS.some(def => def.key === entry.key)
    || DIRECTIONAL_MONSTERS.some(art => art.textureKey === entry.key)) return true;
  if (/halloween|\/hw_|\/golden-/.test(entry.path) || entry.key.startsWith('hw_')) return event;
  const depth = entry.path.match(/(?:ruins-low-v1|water-v1|volcano-v1|thunder-v1|final-depths-v1)\/(\d+)\//)
    ?? entry.path.match(/ruins-floor-v1\/(\d+)\./);
  if (depth) return !event && Number(depth[1]) === floor;
  const direction = DIRECTIONAL_MONSTERS.find(art => art.textureKey === entry.key);
  // Early-floor bosses use monsters whose ordinary spawn floor is later.
  if (!event && direction && (entry.key === directionArtForFloor(floor, 'male').textureKey
    || entry.key === directionArtForFloor(floor, 'female').textureKey)) return true;
  const animation = MONSTER_ANIMATIONS.find(art => art.motionKey === entry.key || art.attackKey === entry.key);
  if (animation && DIRECTIONAL_MONSTERS.some(art => art.monsterKey === animation.monsterKey)) return false;
  const monster = MONSTER_DEFS.find(def => def.key === (direction?.monsterKey ?? animation?.monsterKey ?? entry.key));
  if (monster) return event ? monster.key.startsWith('m_hw_') : monster.minFloor <= floor;
  return true;
}

function provideGateFallback(scene: Phaser.Scene, entry: Entry) {
  if (scene.textures.exists(entry.key)) return;
  const sourceKey = /^(terrain_stairs|terrain_boss_descent|hw_stairs)$/.test(entry.key) ? 'stairs'
    : /^(terrain_boss_(entry_|gate|chain_gate)|terrain_treasury_door|hw_gate)/.test(entry.key) ? 'door' : undefined;
  if (!sourceKey || !scene.textures.exists(sourceKey)) return;
  const source = scene.textures.get(sourceKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const fallback = scene.textures.createCanvas(entry.key, source.width, source.height);
  if (!fallback) return;
  fallback.context.drawImage(source, 0, 0);
  fallback.refresh();
  // Do not mark it loaded: a later floor load can still recover the real artwork.
}

export function ensureSceneAssets(scene: Phaser.Scene, floor = 1, event = false, ending = false, loadingMode: 'entry' | 'stairs' = 'entry'): Promise<void> {
  if (VERIFIER) {
    // Keep the same texture/animation availability as the real game: attack facing
    // and timing depend on those branches. Only the bitmap pixels are unnecessary.
    for (const entry of manifest.values()) {
      if (loaded.has(entry.key) || !belongs(entry,floor,event,ending)) continue;
      if (!scene.textures.exists(entry.key)) {
        const texture=scene.textures.createCanvas(entry.key,1,1);
        if (entry.kind==='spritesheet' && texture) {
          for(let frame=0;frame<256;frame++)texture.add(frame,0,0,0,1,1);
        }
      }
      loaded.add(entry.key);
    }
    return Promise.resolve();
  }
  const run = async () => {
    let remaining = [...manifest.values()].filter(entry => !loaded.has(entry.key) && belongs(entry, floor, event, ending));
    if (!remaining.length && loadingMode !== 'stairs') return;
    const total = remaining.length;
    showLoading(0, loadingMode === 'stairs' ? `第${floor}層へ続く階段を下りています…` : 'ダンジョンの画像を読み込み中…', loadingMode);
    const startedAt = performance.now();
    try {
      for (let attempt = 0; attempt < 3 && remaining.length; attempt++) {
        await new Promise<void>(resolve => {
          const completions: { event: string; callback: () => void }[] = [];
          const progress = (value: number) => updateLoading((total - remaining.length + remaining.length * value) / total,
            attempt ? '画像を再取得しています…' : 'ダンジョンの画像を読み込み中…');
          scene.load.maxParallelDownloads = 4;
          scene.load.on('progress', progress);
          scene.load.once('complete', () => {
            scene.load.off('progress', progress);
            for (const { event, callback } of completions) scene.load.off(event, callback);
            resolve();
          });
          for (const entry of remaining) {
            const temporary = `stream_${entry.key}`;
            const callback = () => {
              if (!scene.textures.exists(temporary)) return;
              if (scene.textures.exists(entry.key)) scene.textures.remove(entry.key);
              if (scene.textures.renameTexture(temporary, entry.key)) loaded.add(entry.key);
            };
            const event = `filecomplete-${entry.kind}-${temporary}`;
            completions.push({ event, callback }); scene.load.once(event, callback);
            // A failed optimized image may be a stale cache entry or a decode failure.
            // Retry the original artwork, then bypass its cache instead of repeating one URL.
            const path = attempt === 0 ? assetUrl(entry.path) : attempt === 1 ? entry.path
              : `${entry.path}${entry.path.includes('?') ? '&' : '?'}assetRetry=${Date.now()}`;
            const xhr = { responseType: 'blob' as const, timeout: 20000 };
            if (entry.kind === 'image') scene.load.image(temporary, path, xhr);
            else scene.load.spritesheet(temporary, path, entry.config!, xhr);
          }
          scene.load.start();
        });
        remaining = remaining.filter(entry => !loaded.has(entry.key));
      }
      if (remaining.length) {
        for (const entry of remaining) provideGateFallback(scene, entry);
        console.warn('画像の取得を再試行しました。利用できる代替表示を使用:', remaining.map(e => e.key));
      }
      if (!ending) ensureCombatEffectTextures(scene);
      const boot = scene.scene.get('BootScene') as Phaser.Scene & { prepareGameTextures?: () => void };
      if (!ending) boot.prepareGameTextures?.();
    } finally {
      if (loadingMode === 'stairs') {
        updateLoading(1, `第${floor}層に到着しました`);
        await new Promise(resolve => setTimeout(resolve, Math.max(0, 600 - (performance.now() - startedAt))));
      }
      finishLoading();
    }
  };
  chain = chain.then(run, run);
  return chain;
}
