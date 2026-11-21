from pathlib import Path
from PIL import Image
import shutil
root=Path(__file__).resolve().parents[1]
source=Path('C:/Users/masam/.codex/generated_images/01a1ed2e-c820-70d0-8428-db389f5c65b9')
out=root/'public/assets/online/town-garden-v2'
art=root/'art/town-layout-v2'
out.mkdir(parents=True,exist_ok=True)
def save_crop(im,box,name):
    tile=im.crop(box)
    if tile.mode=='RGBA':
        bb=tile.getchannel('A').getbbox()
        if bb: tile=tile.crop(bb)
    tile.thumbnail((512,512),Image.Resampling.LANCZOS)
    tile.save(out/(name+'.webp'),quality=92)
for prefix,name in [('exec-0ab4ec7f','buildings'),('exec-630abd10','garden-props')]:
    path=next(source.glob(prefix+'*.png'));shutil.copy2(path,art/(name+'-source.png'))
    im=Image.open(path);w,h=im.size
    if name=='buildings':
        for i in range(12):save_crop(im,(round(i%4*w/4),round(i//4*h/3),round((i%4+1)*w/4),round((i//4+1)*h/3)),'house-'+str(i))
    else:
        names=['wallH','wallV','post','gate','oak','cypress','shrub','flowers','lamp','bench','statue','banner']
        # Asset edges are not exactly aligned to nominal cells: use observed gutters.
        boxes=[(25,105,390,280),(480,10,610,335),(770,0,985,335),(1030,0,1448,335),
               (0,335,410,711),(475,345,650,711),(710,400,1040,690),(1040,380,1448,690),
               (115,711,260,1086),(350,780,710,1060),(760,711,990,1086),(1090,711,1340,1086)]
        for name,box in zip(names,boxes):save_crop(im,box,name)
print('Saved twelve buildings and twelve separate garden props:',out)
path=next(source.glob('exec-3043f466*.png'));shutil.copy2(path,art/'terrain-source.png')
im=Image.open(path);w,h=im.size
for i in range(6):save_crop(im,(round(i%3*w/3),round(i//3*h/2),round((i%3+1)*w/3),round((i//3+1)*h/2)),'tile-'+str(i))
