import json,re
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
p=root/'public/previews/floor-one-maze/layout.json';d=json.loads(p.read_text(encoding='utf-8'))
if 'cooperative' not in d:
 old=d['W'];d['W']=107
 for row in d['grid']:row.extend([0]*(107-old))
 for y in [36,37]:
  for x in range(84,105):d['grid'][y][x]=1
 for y in range(38,41):
  for x in range(89,94):d['grid'][y][x]=1
 for y in range(32,39):
  for x in range(98,105):d['grid'][y][x]=1
 d['rooms'].append(dict(id=11,name='協力の宝物室',x=98,y=32,w=7,h=7,detail='別の仲間が右のパネルを踏むと橋が上昇。最後の人が戻ると下降。金箱確定。'))
 d['cooperative']={'bridge':{'x':94,'y':36,'w':4,'h':2},'room':{'x':98,'y':32,'w':7,'h':7},'panel':{'x':92,'y':39},'chest':{'x':101,'y':34}}
 p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
ids=['entry','spring','store','hall','barracks','spider','golem','treasury','boss','blessing','coop']
areas=[dict(id=ids[r['id']-1],name=r['name'],label=str(r['id']),x=r['x'],y=r['y'],w=r['w'],h=r['h'],sx=r['x']+2,sy=r['y']+r['h']-3,color=4685152) for r in d['rooms']];areas[0].update(sx=49,sy=77)
def prop(id,kind,x,y,frame=0,atlas='detail',w=.9,h=.9):return dict(id=id,kind=kind,x=x,y=y,frame=frame,atlas=atlas,w=w,h=h,size=43,chestType='common',ground=False)
props=[prop('entry_crystal','portal',49,74,14,w=2,h=2),prop('blessing','blessing',5,35,w=2,h=2),prop('spring','heal',22,62,9,w=3,h=3),prop('merchant','merchant',77,65,4,'npc',1.3,1.3),prop('stairs','stairs',50,6,6,'old',2,2)]
# Preserve legacy chest ids where possible so already-opened rewards stay opened.
legacy=['shrine','treasure','garden_chest','spider_chest','treasure_west','treasure_east']
for i,(x,y) in enumerate(d['chestCandidates']):props.append(prop(legacy[i] if i<len(legacy) else 'maze_chest_'+str(i),'chest',x,y,0,'chest'))
props.append(prop('coop_gold','chest',101,34,0,'chest'));props[-1]['chestType']='rare'
gates=[dict(id='amber',x=68,y=12,w=1,h=2,key='amber',visual=dict(atlas='old',frame=2,x=68,y=13,w=1,h=2,ground=False)),dict(id='boss',x=49,y=24,w=2,h=1,key='both',visual=dict(atlas='old',frame=2,x=49.5,y=24,w=2,h=2,ground=False))]
oldsource=(root/'src/online/adventure/mapAConfig.ts').read_text(encoding='utf-8')
if 'MAP_A_BASE_ENEMIES=[' in oldsource:
 old=json.loads(re.search(r'export const MAP_A_BASE_ENEMIES=(\[.*?\]);',oldsource).group(1));(root/'scripts/previews/legacy-enemies.json').write_text(json.dumps(old))
else:old=json.loads((root/'scripts/previews/legacy-enemies.json').read_text())
enemies=[];taken={(p['x'],p['y']) for p in props}
roomorder=[1,4,3,6,5,7,2,2,6,5,7,4]
for i,e in enumerate(old):
 r=areas[roomorder[i]];x,y=r['x']+r['w']//2,r['y']+r['h']//2
 if e['id']=='guardian':r=areas[6];x,y=r['x']+8,r['y']+8
 if e['id']=='weaver':r=areas[5];x,y=r['x']+7,r['y']+7
 if e.get('boss'):x,y=50,10
 while (x,y) in taken:x+=1
 e.update(x=x,y=y);enemies.append(e);taken.add((x,y))
for i in range(36):
 r=areas[[1,2,3,4,5,6,7][i%7]];cells=[(x,y) for y in range(r['y']+2,r['y']+r['h']-2) for x in range(r['x']+2,r['x']+r['w']-2) if (x,y) not in taken];x,y=cells[(i*19)%len(cells)];taken.add((x,y));base=old[i%8].copy();base.update(id='maze_mob_'+str(i),x=x,y=y);enemies.append(base)
objects=[]
for r in areas:
 for x in set((r['x']+3,r['x']+r['w']-4)):objects.append(dict(atlas='detail',frame=4,x=x,y=r['y']+1,w=1,h=1.8,ground=False))
materials=[];frames=[0,4,5,6,7,8,9,10,11,4,10]
for y,row in enumerate(d['grid']):
 for x,v in enumerate(row):
  if v:
   r=next((r for r in d['rooms'] if r['x']<=x<r['x']+r['w'] and r['y']<=y<r['y']+r['h']),None);materials.append(dict(x=x,y=y,frame=frames[r['id']-1] if r else (x*7+y*11)%4))
cfg=dict(version=5,width=d['W'],height=d['H'],spawn={'x':49,'y':77},rows=[''.join('.' if v else '#' for v in row) for row in d['grid']],areas=areas,props=props,gates=gates,enemies=enemies,traps=[],solids=[],objects=objects,bridges=[],materials=materials,cooperative=d['cooperative'],fountain=d['fountain'],boss={'x':41,'y':3,'w':18,'h':20,'exit':{'x':49,'y':23,'w':2,'h':2},'pads':[{'x':47+i*2,'y':15} for i in range(4)]})
(root/'src/online/adventure/floor1-maze.json').write_text(json.dumps(cfg,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
(root/'src/online/adventure/mapAConfig.ts').write_text("import plan from './floor1-maze.json';\nexport const MAP_A=plan;\nexport const MAP_A_AREAS=plan.areas;\nexport const MAP_A_PROPS=plan.props;\nexport const MAP_A_GATES=plan.gates;\nexport const MAP_A_BASE_ENEMIES=plan.enemies;\nexport const MAP_A_ENEMIES=plan.enemies;\nexport const MAP_A_SCENERY=plan.objects;\n",encoding='utf-8')
# Cut equal animation frames; no recolouring or repainting of generated art.
im=Image.open(root/'public/assets/online/maze-v1/chests.png');w,h=im.width//2,im.height//2
for i,name in enumerate(['common','common-open','rare','rare-open']):im.crop((i%2*w,i//2*h,(i%2+1)*w,(i//2+1)*h)).save(root/f'public/assets/online/maze-v1/{name}.png')
print('Generated maze config',len(enemies),'enemies',len(props),'props')
