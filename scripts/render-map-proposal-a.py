from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageFilter
import json,random,math
BASE=Path(__file__).resolve().parents[1];OUT=BASE/'outputs/map-proposal-a';OUT.mkdir(parents=True,exist_ok=True)
T=48;W=128;H=60;rng=random.Random(1130)
rooms=[('A','灯火の入口',4,19,14,16,0),('B','古い泉の庭',9,3,19,13,2),('C','旅商人の休憩所',5,42,22,12,11),('D','蒼い転送台',34,43,14,11,12),('E','精霊樹の大広間',34,19,25,19,2),('F','苔むした祭壇',38,3,18,11,2),('G','石の守護者の間',65,4,17,13,8),('H','紫糸の巣',64,35,19,16,9),('I','滝音の橋庭',87,20,12,12,0),('J','封印された宝物庫',87,3,17,12,8),('K','紅蓮の試練',88,40,16,13,13),('L','地下水の泉',51,46,10,10,2),('M','結晶門の聖域',106,18,19,24,9)]
rows=[['#']*W for _ in range(H)];material={}
def carve(x,y,w,h,frame=0,chamfer=0):
 for yy in range(y,y+h):
  for xx in range(x,x+w):
   if not(0<=xx<W and 0<=yy<H):continue
   if chamfer and ((xx-x)+(yy-y)<chamfer or (x+w-1-xx)+(yy-y)<chamfer or (xx-x)+(y+h-1-yy)<chamfer or (x+w-1-xx)+(y+h-1-yy)<chamfer):continue
   rows[yy][xx]='.';material[xx,yy]=frame
for id,name,x,y,w,h,f in rooms:carve(x,y,w,h,f,2)
paths=[(15,14,3,7),(13,33,3,10),(17,26,18,3),(27,8,12,3),(44,13,3,7),(55,9,11,3),(58,31,9,3),(65,31,3,6),(40,37,3,8),(47,48,6,3),(60,48,6,3),(79,16,3,8),(79,21,9,3),(79,29,3,8),(81,29,7,3),(92,14,3,7),(92,31,3,10),(82,44,7,3),(98,26,9,3)]
for p in paths:carve(*p,frame=0)
bridges=[{'x':15,'y':15,'w':3,'h':5,'vertical':True},{'x':13,'y':35,'w':3,'h':7,'vertical':True},{'x':23,'y':26,'w':7,'h':3,'vertical':False},{'x':56,'y':9,'w':9,'h':3,'vertical':False},{'x':40,'y':38,'w':3,'h':5,'vertical':True},{'x':83,'y':29,'w':4,'h':3,'vertical':False},{'x':92,'y':15,'w':3,'h':5,'vertical':True},{'x':92,'y':32,'w':3,'h':8,'vertical':True},{'x':83,'y':44,'w':5,'h':3,'vertical':False},{'x':99,'y':26,'w':7,'h':3,'vertical':False}]
# Every bridge is an exact, constant-width deck; no extra floor under its side rails.
for b in bridges:
 carve(b['x'],b['y'],b['w'],b['h'])
 if b['vertical']:
  for yy in range(b['y'],b['y']+b['h']):
   for xx in [b['x']-1,b['x']+b['w']]:rows[yy][xx]='#';material.pop((xx,yy),None)
 else:
  for xx in range(b['x'],b['x']+b['w']):
   for yy in [b['y']-1,b['y']+b['h']]:rows[yy][xx]='#';material.pop((xx,yy),None)
objects=[];solids=[]
def obj(atlas,frame,x,y,w,h,solid=None,ground=False,key=None):
 objects.append(dict(atlas=atlas,frame=frame,x=x,y=y,w=w,h=h,ground=ground,**({'key':key} if key else {})))
 if solid:solids.append(dict(x=solid[0],y=solid[1],w=solid[2],h=solid[3]))
def pond(x,y,w,h):
 for yy in range(y,y+h):
  for xx in range(x,x+w):material[xx,yy]=5
 solids.append(dict(x=x,y=y,w=w,h=h))
pond(12,5,7,4);pond(52,48,5,3)
# Low courtyard edging uses the same walkable paving, with moss/grass garden pockets.
for id,name,x,y,w,h,f in rooms:
 for yy in range(y,y+h):
  for xx in range(x,x+w):
   if (xx,yy) not in material:continue
   edge=min(xx-x,x+w-1-xx,yy-y,y+h-1-yy)
   if f in [2] and edge<2:material[xx,yy]=2
   elif f==2 and id=='E':material[xx,yy]=0 if 43<=xx<=49 or 26<=yy<=29 else 3
   elif f==2 and id=='B':material[xx,yy]=0 if 20<=xx<=23 or 10<=yy<=12 else material[xx,yy]
# Paved main plaza, ringed with gardens rather than objects in the walking lanes.
obj('arch',7,46,31,13,10,ground=True)
obj('old',0,46,28,8.5,8.5,(45,27,3,2))
obj('old',1,39,49,5.5,5.5,(38,48,3,2))
obj('detail',14,10,26,2,2,(10,26,1,1))
obj('arch',5,11,22,5,5,(9,21,1,1));obj('arch',5,22,7,5,5,(20,6,1,1))
obj('arch',6,16,7,3,5,(16,6,1,1));obj('arch',6,54,50,3,5,(54,49,1,1))
obj('detail',9,47,7,5,4,(46,6,3,2));obj('detail',8,12,46,5,4,(10,44,4,2))
obj('npc',4,13,48,1.33,1.33,(13,48,1,1))
for x,y in [(8,47),(18,45),(22,50)]:obj('detail',6,x,y,2,1.6,(x,y,1,1))
for x,y in [(9,50),(20,45)]:obj('detail',7,x,y,1.6,1.5,(x,y,1,1))
obj('detail',5,19,51,3,1.5,(18,51,3,1))
# Corner columns belong to explicit collision cells, never invisible whole-image boxes.
for id,name,x,y,w,h,f in rooms:
 for px,py in [(x+2,y+2),(x+w-3,y+2),(x+2,y+h-3),(x+w-3,y+h-3)]:
  if rows[py][px]=='.':obj('detail',1,px,py,1.5,3,(px,py,1,1))
 for px,py in [(x+3,y+1),(x+w-4,y+h-2)]:
  if f in [2,0,11]:obj('detail',2,px,py,2.5,1.5)
for x,y in [(36,23),(55,23),(36,34),(55,34),(12,12),(25,6),(40,6),(53,9),(7,30),(24,45),(53,52)]:obj('detail',12,x,y,2.6,2,(x,y,1,1))
for x,y in [(39,23),(53,33),(12,10),(26,11),(53,6),(54,52),(89,25),(97,28)]:obj('detail',3,x,y,1.6,1.2)
for x,y in [(40,35),(53,35)]:obj('detail',5,x,y,3,1.5,(x-1,y,3,1))
# Mark entrance and exits of each bridge with low lanterns, leaving the deck clear.
for b in bridges:
 for x,y in ([(b['x']-1,b['y']-1),(b['x']+b['w'],b['y']+b['h'])] if b['vertical'] else [(b['x']-1,b['y']-1),(b['x']+b['w'],b['y']+b['h'])]):
  if 0<=x<W and 0<=y<H and rows[y][x]=='.':obj('detail',4,x,y,1.2,2.3,(x,y,1,1))
# Guardians, treasury, larger combat clearings and a distinct crystal sanctuary.
obj('arch',7,73,12,10,8,ground=True);obj('arch',7,73,46,11,9,ground=True)
obj('arch',8,115,22,13,10,(111,20,2,2));solids.append(dict(x=120,y=20,w=2,h=2))
obj('old',6,116,23,2.8,3,(116,23,1,1));obj('old',3,109,23,3,4,(109,23,1,1));obj('old',3,122,35,3,4,(122,35,1,1))
for x,y in [(66,37),(80,47),(108,19),(123,20),(108,37),(123,38),(90,42),(101,49)]:obj('detail',10,x,y,2.5,3,(x,y,1,1))
for x,y in [(68,8),(78,13),(69,42),(78,47),(110,30),(121,30),(90,44),(101,44)]:obj('detail',15,x,y,1.2,1.6,(x,y,1,1))
for x,y in [(89,25),(96,23),(89,29)]:obj('arch',6,x,y,3,6,(x,y,1,1))
for x,y in [(90,7),(94,6),(99,9)]:obj('chest',1,x,y,.9,.9,(x,y,1,1))
obj('chest',0,50,9,.9,.9,(50,9,1,1));obj('chest',0,23,13,.9,.9,(23,13,1,1));obj('chest',0,80,48,.9,.9,(80,48,1,1))
# Gate footprints span the complete passage; they remain meaningful in the imported layout.
gates=[dict(id='amber',x=92,y=16,w=3,h=1,key='amber'),dict(id='violet',x=103,y=26,w=1,h=3,key='violet')]
obj('old',2,93,17,4,4);obj('old',2,103,28,3,4)
enemies=[dict(id='guardian',key='guardian',x=73,y=10),dict(id='weaver',key='weaver',x=73,y=43),dict(id='vesper',key='vesper',x=116,y=31),dict(id='mush',key='mush',x=24,y=11),dict(id='jelly',key='jelly',x=20,y=27),dict(id='moss',key='moss',x=53,y=25),dict(id='ghost',key='ghost',x=56,y=53),dict(id='bat',key='bat',x=31,y=9),dict(id='spider',key='spider',x=69,y=38),dict(id='guard',key='guard',x=96,y=10),dict(id='wisp',key='wisp',x=96,y=48)]
# Physical bases for the six columns baked into each dais illustration.
for pts in [[(42,24),(50,24),(40,27),(52,27),(42,30),(50,30)],[(70,6),(76,6),(69,9),(77,9),(70,11),(76,11)],[(70,40),(77,40),(69,43),(78,43),(70,45),(77,45)]]:
 for x,y in pts:solids.append(dict(x=x,y=y,w=1,h=1))
spawn=dict(x=10,y=29)
def blocked(x,y,keys=('amber','violet')):
 return not(0<=x<W and 0<=y<H) or rows[y][x]!='.' or any(r['x']<=x<r['x']+r['w'] and r['y']<=y<r['y']+r['h'] for r in solids) or any(g['key'] not in keys and g['x']<=x<g['x']+g['w'] and g['y']<=y<g['y']+g['h'] for g in gates)
# Flood-fill actual cells, not drawn arrows. This is also the importable collision contract.
def reachable(keys):
 seen={(spawn['x'],spawn['y'])};q=list(seen)
 for x,y in q:
  for xx,yy in [(x+1,y),(x-1,y),(x,y+1),(x,y-1)]:
   if (xx,yy) not in seen and not blocked(xx,yy,keys):seen.add((xx,yy));q.append((xx,yy))
 return seen
seen=reachable(('amber','violet'))
for id,name,x,y,w,h,f in rooms:assert any((xx,yy) in seen for xx in range(x+3,x+w-3) for yy in range(y+3,y+h-3)),name
assert (116,31) not in reachable(('amber',)), 'Boss gate must block entry'
assert (96,10) not in reachable(('violet',)), 'Treasury must require amber key'
for e in enemies:assert (e['x'],e['y']) in seen,('enemy unreachable',e['id'])
assert (42,31) in seen,'Preview player must stand on an accessible cell'
for b in bridges:
 for yy in range(b['y'],b['y']+b['h']):
  for xx in range(b['x'],b['x']+b['w']):assert not blocked(xx,yy),('bridge obstructed',xx,yy)
config=dict(name='First floor / Map proposal A',tileSize=T,width=W,height=H,rows=[''.join(r) for r in rows],materials=[dict(x=x,y=y,frame=f) for (x,y),f in material.items()],areas=[dict(id=id,name=n,x=x,y=y,w=w,h=h) for id,n,x,y,w,h,f in rooms],objects=objects,solids=solids,bridges=bridges,gates=gates,enemies=enemies,spawn=spawn)
(OUT/'layout.json').write_text(json.dumps(config,ensure_ascii=False,indent=2),encoding='utf8')
# Render with precisely the same image frames, anchors and cell coordinates as the import data.
def load(p):return Image.open(BASE/'public/assets'/p).convert('RGBA')
sheets={'floor':load('online/adventure-v2/floors.webp'),'arch':load('online/adventure-v2/architecture.webp'),'detail':load('online/adventure-v2/props.webp'),'old':load('online/adventure-v1/props.webp'),'bridge':load('online/exploration-v3/bridges.webp'),'npc':load('online/warehouse-v1/npcs.webp')}
# Find the existing directional NPC sprite sheet, preserving actual character scale.
if sheets['npc'] is None:
 candidates=list((BASE/'public/assets/online').glob('*npc*'));sheets['npc']=Image.open(candidates[0]).convert('RGBA') if candidates else None
framecache={}
def frame(atlas,i):
 k=(atlas,i)
 if k in framecache:return framecache[k]
 if atlas=='chest':im=load('items/chests-centered/treasure-chest-'+('rare' if i else 'common')+'.png')
 else:
  im=sheets[atlas]
  if im is None:return Image.new('RGBA',(64,64))
  cols={'floor':4,'arch':3,'detail':4,'old':3,'bridge':2,'npc':4}[atlas];size=128 if atlas=='floor' else 512 if atlas=='bridge' else 256 if atlas!='npc' else im.width//4
  x=i%cols*size;y=i//cols*size;im=im.crop((x,y,x+size,y+size))
 framecache[k]=im;return im
im=Image.new('RGBA',(W*T,H*T),(6,18,28,255))
# Quiet blue-black chasm; a soft floor shadow gives depth without an invented perspective.
mask=Image.new('L',im.size);md=ImageDraw.Draw(mask)
for (x,y) in material:md.rectangle((x*T,y*T,(x+1)*T,(y+1)*T),fill=220)
shadow=mask.filter(ImageFilter.GaussianBlur(30));im.alpha_composite(Image.merge('RGBA',(Image.new('L',im.size,0),Image.new('L',im.size,0),Image.new('L',im.size,0),shadow)),(0,35))
def paste(im2,x,y,w,h):
 im2=im2.resize((max(1,round(w)),max(1,round(h))),Image.Resampling.LANCZOS);im.alpha_composite(im2,(round(x),round(y)))
# Southern cliff faces, behind their own plateaus. Continuous strips share a baseline.
for y in range(H-1):
 x=0
 while x<W:
  if rows[y][x]=='.' and rows[y+1][x]=='#':
   start=x
   while x<W and rows[y][x]=='.' and rows[y+1][x]=='#':x+=1
   for xx in range(start,x,3):paste(frame('arch',0),(xx-.1)*T,(y+.25)*T,min(3.2,x-xx+.2)*T,2.7*T)
  else:x+=1
for (x,y),f in material.items():
 if any(b['x']<=x<b['x']+b['w'] and b['y']<=y<b['y']+b['h'] for b in bridges):continue
 tile=frame('floor',f)
 if f==0 and (x*17+y*7)%13==0:tile=frame('floor',1)
 paste(tile,x*T,y*T,T,T)
# A visible 48px cell grid is retained in the exact-size export.
gd=ImageDraw.Draw(im)
for x,y in material:gd.rectangle((x*T,y*T,(x+1)*T,(y+1)*T),outline=(11,25,25,45),width=1)
for b in bridges:
 bw=(b['w']+(.55 if b['vertical'] else 0))*T;bh=(b['h']+(0 if b['vertical'] else .55))*T
 paste(frame('bridge',0 if b['vertical'] else 1),(b['x']+b['w']/2)*T-bw/2,(b['y']+b['h']/2)*T-bh/2,bw,bh)
def paintobj(o):paste(frame(o['atlas'],o['frame']),(o['x']+.5-o['w']/2)*T,(o['y']+1-o['h'])*T,o['w']*T,o['h']*T)
for o in objects:
 if o['ground']:paintobj(o)
# Add sprite actors using current production sprites, not oversized concept characters.
actor_refs={'guardian':('online/adventure-v2/guardians.webp',256,0,82),'weaver':('online/adventure-v2/guardians.webp',256,4,82),'vesper':('online/adventure-v2/vesper.webp',256,0,114),'jelly':('online/exploration-v3/mobs-a.webp',192,0,54),'bat':('online/exploration-v3/mobs-a.webp',192,12,54),'moss':('online/exploration-v3/mobs-b.webp',192,0,54),'ghost':('online/exploration-v3/mobs-b.webp',192,12,54),'spider':('online/exploration-v3/mobs-c.webp',192,0,54),'guard':('online/exploration-v3/mobs-c.webp',192,12,54),'wisp':('online/exploration-v3/mobs-d.webp',192,0,54),'mush':('online/exploration-v3/mobs-d.webp',192,12,54)}
items=[(o['y']+.65,'obj',o) for o in objects if not o['ground']]+[(e['y']+.85,'enemy',e) for e in enemies]
for depth,kind,o in sorted(items,key=lambda a:a[0]):
 if kind=='obj':paintobj(o)
 else:
  path,size,idx,px=actor_refs[o['key']];sheet=load(path);sprite=sheet.crop((idx%4*size,idx//4*size,(idx%4+1)*size,(idx//4+1)*size));paste(sprite,(o['x']+.5)*T-px/2,(o['y']+.95)*T-px,px,px)
hero=load('characters/smooth-walk-v1/male-leather.webp');size=96
# Read actual frame dimensions from the source sheet: eighteen walk frames per direction.
# The player's visual remains 64px, independently of the overview export scale.
hero=hero.crop((0,0,size,size));
for px,py in [(spawn['x'],spawn['y']),(42,31)]:paste(hero,(px+.5)*T-32,(py+.45)*T-32,64,64)
clean=im.copy();clean.convert('RGB').save(OUT/'map-full-48px.png',optimize=True)
fontpath='C:/Windows/Fonts/YuGothM.ttc';font=ImageFont.truetype(fontpath,25);small=ImageFont.truetype(fontpath,18)
d=ImageDraw.Draw(im)
for id,name,x,y,w,h,f in rooms:
 text=f'{id}  {name}';cx=(x+w/2)*T;cy=(y+h-1.4)*T;box=d.textbbox((0,0),text,font=font);tw=box[2]-box[0]
 d.rounded_rectangle((cx-tw/2-12,cy-6,cx+tw/2+12,cy+34),radius=8,fill=(4,17,24,205),outline=(188,166,104,150),width=1);d.text((cx-tw/2,cy-2),text,font=font,fill=(245,225,171,255))
im.convert('RGB').save(OUT/'map-labeled-48px.png',optimize=True)
im.convert('RGB').resize((3072,1440),Image.Resampling.LANCZOS).save(OUT/'map-overview.jpg',quality=95)
# Real game viewport, at 1:1 cell and player scale, with no zoom cheat.
clean.crop((int(42*T-370),int(31*T-260),int(42*T+370),int(31*T+260))).convert('RGB').save(OUT/'actual-camera-740x520.png')
print('Rendered actual-size map, overview and 740x520 viewport. Walkable cells:',len(seen),'objects:',len(objects),'bridges:',len(bridges))
