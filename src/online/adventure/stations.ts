import {ADVENTURE_CONFIG as C} from './layout';
export const STATIONS=C.railway.stations;
export function stationAt(x:number,y:number){return STATIONS.find(s=>x>=s.x&&x<s.x+s.w&&y>=s.y&&y<s.y+s.h);}
export function prepareStationArt(scene:any){const texture=scene.textures.get('station_modules_v4');if(texture.has('part-0'))return;const img=texture.getSourceImage();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d')!;ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,img.width,img.height).data;
for(let i=0;i<16;i++){const x0=Math.round(i%4*img.width/4),y0=Math.round(Math.floor(i/4)*img.height/4),x1=Math.round((i%4+1)*img.width/4),y1=Math.round((Math.floor(i/4)+1)*img.height/4);let left=x1,top=y1,right=x0,bottom=y0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(pixels[(y*img.width+x)*4+3]>180){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}texture.add('part-'+i,0,left,top,right-left+1,bottom-top+1);}
const roof=texture.get('part-4');texture.add('part-16',0,roof.cutX,roof.cutY,roof.cutWidth,Math.round(roof.cutHeight*.42));
for(let i=0;i<2;i++)texture.add('floor-'+i,0,Math.round((i+.365)*img.width/4),Math.round(.365*img.height/4),Math.round(.25*img.width/4),Math.round(.25*img.height/4));}
export function mountStationArchitecture(scene:any){prepareStationArt(scene);const T=48,objects:any[]=[];
const art=(frame:number,x:number,y:number,w:number,h:number,depth:number)=>{const o=scene.add.image(x*T,y*T,'station_modules_v4','part-'+frame).setOrigin(0,1).setDisplaySize(w*T,h*T).setDepth(depth);objects.push(o);return o;};
for(const s of STATIONS){const floor=scene.make.image({x:0,y:0,key:'station_modules_v4',frame:'floor-'+(s.cream?0:1),add:false}).setOrigin(0).setDisplaySize(T,T),rt=scene.add.renderTexture(s.x*T,s.y*T,s.w*T,s.h*T).setOrigin(0).setDepth(-1.8);objects.push(rt);rt.beginDraw();for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){const wx=s.x+x;floor.setFrame('floor-'+((s.cream?wx>=s.platformX&&wx<s.trackX:wx>s.trackX&&wx<=s.platformX+2)?1:s.cream?0:1));rt.batchDraw(floor,x*T,y*T);}rt.endDraw();floor.destroy();
const line=scene.add.graphics().setDepth(-1.65);objects.push(line);const edge=s.cream?s.trackX:s.trackX+1;line.fillStyle(0xd0a953).fillRect(edge*T-4,s.y*T+T,7,(s.h-2)*T);line.lineStyle(1,0xffe1a0).lineBetween(edge*T-5,(s.y+1)*T,edge*T-5,(s.y+s.h-1)*T);
for(let x=s.x+1;x<s.x+s.w-1;x+=3){if(Math.abs(x-s.gateX)>2)art(s.cream?2:3,x,s.y+1,3,2,s.y+.95);if(s.cream||x+3<=54||x>55)art(s.cream?2:3,x,s.y+s.h,3,2,s.y+s.h+.8);}
for(let y=s.y+2;y<s.y+s.h;y+=3){art(8,s.x,y,1,3,y+.8);art(8,s.x+s.w-1,y,1,3,y+.8);}
for(let y=s.y+2;y<s.y+s.h-4;y+=2)art(16,s.platformX,y+2,2,2,y+2.2);
const title=scene.add.text((s.gateX+.5)*T,(s.gateY-1.4)*T,s.name,{fontFamily:'Meiryo',fontSize:'17px',fontStyle:'bold',color:'#ffe5a4',stroke:'#11232d',strokeThickness:4}).setOrigin(.5,1).setDepth(s.gateY+2);objects.push(title);
}
for(const p of C.railway.decor){art(p.frame,p.x,p.y+p.h,p.w,p.h,p.frame===15?-1.7:p.y+p.h-.1);}
return{destroy(){for(const o of objects)o.destroy();}};
}
