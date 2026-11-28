export const WALL_MATERIAL_KEY = 'maze_stone_wall';
export const WALL_MATERIAL_PATH = 'assets/online/maze-stone-v2/masonry.webp';

const TILE = 48;
const CAP_INSET = 16;

type CellTest = (x: number, y: number) => boolean;
type WallLayout = {
  width: number;
  height: number;
  ground: CellTest;
  exclude?: CellTest;
};

export function createWallGrid({width, height, ground, exclude}: WallLayout): CellTest {
  const occupied = Array.from({length: height}, (_, y) =>
    Array.from({length: width}, (_, x) => {
      if (ground(x, y) || exclude?.(x, y)) return false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (ground(x + dx, y + dy)) return true;
        }
      }
      return false;
    }),
  );
  return (x, y) => occupied[y]?.[x] ?? false;
}

function materialPattern(ctx: CanvasRenderingContext2D, atlas: CanvasImageSource,
  sy: number, width: number, height: number, displayHeight = height, offsetY = 0) {
  const swatch = document.createElement('canvas');
  swatch.width = width;
  swatch.height = displayHeight + offsetY;
  swatch.getContext('2d')!.drawImage(atlas, 0, sy, width, height, 0, offsetY, width, displayHeight);
  return ctx.createPattern(swatch, 'repeat')!;
}

/** Paint a stationary, world-aligned wall chunk. Each pixel belongs to a single chunk. */
export function createMasonryPainter(ctx: CanvasRenderingContext2D, atlas: CanvasImageSource,
  wall: CellTest, ground: CellTest) {
  const top = materialPattern(ctx, atlas, 0, 288, 96);
  const face = materialPattern(ctx, atlas, 96, 192, 22, CAP_INSET, TILE - CAP_INSET);
  const n = CAP_INSET;

  function shade(x: number, y: number, w: number, h: number, dx: number, dy: number, near: string, far: string) {
    const gradient = ctx.createLinearGradient(x + Math.max(0, -dx), y + Math.max(0, -dy),
      x + Math.max(0, dx), y + Math.max(0, dy));
    gradient.addColorStop(0, near);
    gradient.addColorStop(1, far);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
  }

  const slopeLight = {
    north: ['#17150fe0', '#3b32247d', '#e1cda857'], west: ['#1d1914d4', '#56493673', '#e1cda845'],
    south: ['#0d0c0bf0', '#30261c87', '#a88b6650'], east: ['#16130fe8', '#2d241a9c', '#a88b6635'],
  };
  function slope(points: number[], x: number, y: number, dx: number, dy: number, side: keyof typeof slopeLight, masonry = false) {
    const gradient = ctx.createLinearGradient(x, y, x + dx, y + dy);
    const [outer, inner, rim] = slopeLight[side];
    gradient.addColorStop(0, outer);
    gradient.addColorStop(.86, inner);
    gradient.addColorStop(.94, inner);
    gradient.addColorStop(1, rim);
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
    ctx.closePath();
    if (masonry) {
      ctx.fillStyle = face;
      ctx.fill();
    }
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  return (startX: number, startY: number, width: number, height: number) => {
    ctx.save();
    ctx.translate(-startX * TILE, -startY * TILE);
    for (let y = startY; y < startY + height; y++) {
      for (let x = startX; x < startX + width; x++) {
        const l = x * TILE, t = y * TILE, r = l + TILE, b = t + TILE;
        if (!wall(x, y)) {
          if (!ground(x, y)) continue;
          // Contact shadows are confined to the walkable tile next to an exposed wall.
          if (wall(x, y - 1)) shade(l, t, TILE, 11, 0, 11, '#080603a5', '#08060300');
          if (wall(x - 1, y)) shade(l, t, 8, TILE, 8, 0, '#0806038a', '#08060300');
          if (wall(x + 1, y)) shade(r - 5, t, 5, TILE, -5, 0, '#08060365', '#08060300');
          if (wall(x, y + 1)) shade(l, t + TILE - 4, TILE, 4, 0, -4, '#08060356', '#08060300');
          continue;
        }

        const north = !wall(x, y - 1), south = !wall(x, y + 1);
        const west = !wall(x - 1, y), east = !wall(x + 1, y);
        ctx.fillStyle = top;
        ctx.fillRect(l, t, TILE, TILE);

        // The top is inset along exposed edges only. Joined edges retain the full cap.
        if (north) slope([l,t,r,t,r-(east?n:0),t+n,l+(west?n:0),t+n],l,t,0,n,'north');
        if (south) slope([l,b,r,b,r-(east?n:0),b-n,l+(west?n:0),b-n],l,b,0,-n,'south',true);
        if (west) slope([l,t,l+n,t+(north?n:0),l+n,b-(south?n:0),l,b],l,t,n,0,'west');
        if (east) slope([r,t,r-n,t+(north?n:0),r-n,b-(south?n:0),r,b],r,t,-n,0,'east');

        // When both neighbors connect but the diagonal is empty, the two slopes turn into this tile.
        for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
          if ((dx < 0 ? west : east) || (dy < 0 ? north : south) || wall(x + dx, y + dy)) continue;
          const cx = dx < 0 ? l : r, cy = dy < 0 ? t : b;
          const insetX = cx - dx * n, insetY = cy - dy * n;
          slope([cx,cy,insetX,cy,insetX,insetY],cx,cy,-dx*n,0,dx < 0 ? 'west' : 'east');
          slope([cx,cy,cx,insetY,insetX,insetY],cx,cy,0,-dy*n,dy < 0 ? 'north' : 'south',dy > 0);
        }
      }
    }
    ctx.restore();
  };
}
