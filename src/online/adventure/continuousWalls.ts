import type Phaser from 'phaser';
import {stationAt} from './stations';
import {streamTerrain,TERRAIN_CHUNK} from './terrainChunks';
import {ADVENTURE_CONFIG as C} from './layout';
import {createMasonryPainter,createWallGrid,WALL_MATERIAL_KEY} from './wallMasonry';

const TILE = 48;
const ground = (x: number, y: number) => C.rows[y]?.[x] === '.';
const wall = createWallGrid({width: C.width, height: C.height, ground, exclude: (x, y) => !!stationAt(x, y)});
const chunksWithWalls = new Set<string>();
for (let y = 0; y < C.height; y++) {
  for (let x = 0; x < C.width; x++) {
    if (!wall(x, y) && !(ground(x, y) && (wall(x, y - 1) || wall(x, y + 1) || wall(x - 1, y) || wall(x + 1, y)))) continue;
    chunksWithWalls.add(`${Math.floor(x / TERRAIN_CHUNK) * TERRAIN_CHUNK},${Math.floor(y / TERRAIN_CHUNK) * TERRAIN_CHUNK}`);
  }
}

/** Static terrain below the actor layer. The raised cap stays within its blocked footprint. */
export function drawContinuousWalls(scene: Phaser.Scene) {
  const atlas = scene.textures.get(WALL_MATERIAL_KEY).getSourceImage() as HTMLImageElement;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TERRAIN_CHUNK * TILE;
  const ctx = canvas.getContext('2d')!;
  const paint = createMasonryPainter(ctx, atlas, wall, ground, C.fountain);

  streamTerrain(scene, C.width, C.height, (cx, cy) => {
    if (!chunksWithWalls.has(`${cx},${cy}`)) return {destroy() {}};
    const key = 'maze-masonry-' + cx + '-' + cy;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    paint(cx, cy, TERRAIN_CHUNK, TERRAIN_CHUNK);
    const chunk = document.createElement('canvas');
    chunk.width = canvas.width;
    chunk.height = canvas.height;
    chunk.getContext('2d')!.drawImage(canvas, 0, 0);
    scene.textures.addCanvas(key, chunk);
    const image = scene.add.image(cx * TILE, cy * TILE, key).setOrigin(0).setDepth(-4);
    return {destroy() {image.destroy();scene.textures.remove(key);chunk.width = chunk.height = 1;}};
  });
  scene.events.once('shutdown', () => {canvas.width = canvas.height = 1;});
}
