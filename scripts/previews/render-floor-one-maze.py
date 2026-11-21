"""Local proposal renderer. Uses the approved collision grid; no live game changes.
Run from project root: python scripts/previews/render-floor-one-maze.py
Each floor image is exactly one 48px gameplay cell. Walls occupy only solid cells.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/previews/floor-one-maze'
ASSETS = ROOT / 'public/assets'
data = json.loads((OUT / 'layout.json').read_text(encoding='utf-8-sig'))
T = 48
W,H = data['W'],data['H']
grid, rooms = data['grid'],data['rooms']
atlas = Image.open(OUT / 'tiles.png').convert('RGBA')
tw,th = atlas.width//4,atlas.height//4
tiles = [atlas.crop((i%4*tw,i//4*th,(i%4+1)*tw,(i//4+1)*th)).resize((T,T),Image.Resampling.LANCZOS) for i in range(16)]
wall = Image.open(ASSETS/'terrain/ruins-low-v1/1/wall-a.png').convert('RGBA').resize((T,T),Image.Resampling.LANCZOS)
bosswall = Image.open(ASSETS/'treasury/gilded-wall.png').convert('RGBA').resize((T,T),Image.Resampling.LANCZOS)
floorframes={1:0,2:4,3:5,4:6,5:7,6:8,7:9,8:10,9:11,10:4}
canvas = Image.new('RGBA',(W*T,H*T),'#0b1018')
d = ImageDraw.Draw(canvas)
def floor(x,y): return 0<=x<W and 0<=y<H and grid[y][x]==1
def room_at(x,y): return next((r for r in rooms if r['x']<=x<r['x']+r['w'] and r['y']<=y<r['y']+r['h']),None)
for y in range(H):
 for x in range(W):
  if floor(x,y):
   r=room_at(x,y)
   f=floorframes[r['id']] if r else (x*7+y*11)%4
   canvas.alpha_composite(tiles[f],(x*T,y*T))
   d.rectangle((x*T,y*T,(x+1)*T-1,(y+1)*T-1),outline='#252b3070',width=1)
  elif any(floor(x+dx,y+dy) for dx in [-1,0,1] for dy in [-1,0,1]):
   # Existing raised masonry is readable as a wall rather than another floor slab.
   # It stays entirely inside its solid cell, preserving both walkable lanes.
   boss = next(r for r in rooms if r['id']==9)
   nearboss=boss['x']-1<=x<=boss['x']+boss['w'] and boss['y']-1<=y<=boss['y']+boss['h']
   canvas.alpha_composite(bosswall if nearboss else wall,(x*T,y*T))

props=Image.open(ASSETS/'online/adventure-v2/props.webp').convert('RGBA')
def prop(frame,x,y,w=1.5,h=1.8):
 im=props.crop((frame%4*256,frame//4*256,frame%4*256+256,frame//4*256+256)).resize((int(w*T),int(h*T)),Image.Resampling.LANCZOS)
 canvas.alpha_composite(im,(int((x+.5-w/2)*T),int((y+1-h)*T)))
# Small wall lamps, kept clear of doorways and treasure cells.
for r in rooms:
 for x in set((r['x']+3,r['x']+r['w']-4)): prop(4,x,r['y']+1,1,1.8)
original_prop=prop
def prop(frame,x,y,w=1.5,h=1.8): original_prop(frame,x+data.get('offsetX',0),y,w,h)
prop(14,37,74,1.6,2)
prop(9,10,62,3,3)
prop(7,64,63,2,2)
prop(6,67,65,2,2)
prop(1,33,48,1.2,2)
prop(1,44,48,1.2,2)
prop(7,13,36,1.6,1.8)
prop(10,65,37,2.3,2.8)
prop(15,8,10,1.3,1.6)
prop(15,15,10,1.3,1.6)
prop(15,33,13,1.3,1.6)
prop(15,43,13,1.3,1.6)
if data.get('fountain'):
 f=data['fountain'];im=Image.open(ASSETS/'terrain/objects/healing-fountain-pixel.png').convert('RGBA').resize((T*2,T*2),Image.Resampling.LANCZOS)
 canvas.alpha_composite(im,(int((f['x']-.5)*T),int((f['y']-1)*T)))
base=canvas.copy()
for kind in ('common','gold'):
 im=Image.open(ASSETS/f'items/chests-centered/treasure-chest-{"rare" if kind=="gold" else "common"}.png').convert('RGBA').resize((43,43),Image.Resampling.LANCZOS)
 for x,y in data[kind]: canvas.alpha_composite(im,(x*T+2,y*T+3))
for g in data['gates']:
 x,y,w,h=[g[k] for k in ('x','y','w','h')]
 d.rectangle((x*T+2,y*T+2,(x+w)*T-3,(y+h)*T-3),fill='#47344c',outline='#d7b978',width=3)
 for xx in range(x*T+8,(x+w)*T-3,12):d.line((xx,y*T+3,xx,(y+h)*T-4),fill='#dfc38b',width=3)

canvas.convert('RGB').save(OUT/'map.webp',quality=94)
# Background layers let the browser genuinely reroll chest types, without regenerating geometry.
base.alpha_composite(canvas.crop((0,0,1,1)),(0,0))
bd=ImageDraw.Draw(base)
for g in data['gates']:
 x,y,w,h=[g[k] for k in ('x','y','w','h')]
 base.paste(canvas.crop((x*T,y*T,(x+w)*T,(y+h)*T)),(x*T,y*T))
base.convert('RGB').save(OUT/'background.webp',quality=94)
font=ImageFont.truetype('C:/Windows/Fonts/meiryob.ttc',27)
for r in rooms:
 text=f"{r['id']}  {r['name']}"
 box=d.textbbox((0,0),text,font=font);bw=box[2]+24
 x=int((r['x']+r['w']/2)*T-bw/2);y=(r['y']+r['h']-2)*T
 d.rounded_rectangle((x,y,x+bw,y+43),radius=8,fill='#0b1425ef',outline='#a79970',width=1)
 d.text((x+12,y+3),text,font=font,fill='#f0e6cc')
 bd.rounded_rectangle((x,y,x+bw,y+43),radius=8,fill='#0b1425ef',outline='#a79970',width=1)
 bd.text((x+12,y+3),text,font=font,fill='#f0e6cc')
base.convert('RGB').save(OUT/'background-labeled.webp',quality=94)
canvas.convert('RGB').save(OUT/'map-labeled.webp',quality=94)
canvas.convert('RGB').resize((W*20,H*20),Image.Resampling.LANCZOS).save(OUT/'overview.jpg',quality=94)
canvas.crop((19*T,32*T,56*T,61*T)).convert('RGB').save(OUT/'detail.jpg',quality=95)
ox=data.get('offsetX',0)
canvas.crop(((27+ox)*T,1*T,(49+ox)*T,26*T)).convert('RGB').save(OUT/'boss-detail.jpg',quality=95)
canvas.crop((0,30*T,31*T,45*T)).convert('RGB').save(OUT/'fountain-detail.jpg',quality=95)
assert len(data['common'])==35 and len(data['gold'])==6
assert all(floor(x,y) for x,y in data['common']+data['gold'])
print(f'Rendered {W}x{H} grid at {T}px/cell, 10 rooms, 41 treasure positions. Live layout untouched.')
