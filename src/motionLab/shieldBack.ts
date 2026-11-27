const backs=new WeakMap<HTMLImageElement,HTMLCanvasElement>();
const SIZE=96;

/** Paint the inside of the shield using the silhouette of its own item art. */
export function shieldBack(face:HTMLImageElement){
 const cached=backs.get(face);
 if(cached)return cached;
 const back=document.createElement('canvas');
 back.width=back.height=SIZE;
 const g=back.getContext('2d')!;
 g.drawImage(face,0,0,SIZE,SIZE);
 const pixels=g.getImageData(0,0,SIZE,SIZE).data;
 let x0=SIZE,y0=SIZE,x1=0,y1=0;
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  if(pixels[(y*SIZE+x)*4+3]<128)continue;
  x0=Math.min(x0,x);x1=Math.max(x1,x);
  y0=Math.min(y0,y);y1=Math.max(y1,y);
 }
 if(x1<=x0||y1<=y0)return back;
 const cx=(x0+x1)/2,cy=(y0+y1)/2,w=x1-x0,h=y1-y0;

 // Leave the colored rim visible. The recessed lining covers the outer emblem.
 g.globalCompositeOperation='source-atop';
 g.fillStyle='rgba(18,13,20,.36)';
 g.fillRect(0,0,SIZE,SIZE);
 const lining=document.createElement('canvas');
 lining.width=lining.height=SIZE;
 const inner=lining.getContext('2d')!;
 const leather=inner.createLinearGradient(cx-w/2,cy-h/2,cx+w/2,cy+h/2);
 leather.addColorStop(0,'#85705c');
 leather.addColorStop(.52,'#59453e');
 leather.addColorStop(1,'#2a2530');
 inner.fillStyle=leather;
 inner.fillRect(0,0,SIZE,SIZE);
 inner.fillStyle='rgba(27,20,24,.25)';
 for(const seam of [-.2,0,.2])inner.fillRect(cx+w*seam,y0,1.3,h);
 inner.fillStyle='#292029';
 inner.fillRect(cx-w*.32,cy-5,w*.64,10);
 inner.fillStyle='#a27644';
 inner.fillRect(cx-w*.3,cy-3,w*.6,6);
 for(const x of [cx-w*.25,cx+w*.25]){
  inner.fillStyle='#e6cc9d';
  inner.fillRect(x-1.5,cy-1.5,3,3);
 }
 inner.globalCompositeOperation='destination-in';
 inner.drawImage(face,cx*(1-.78),cy*(1-.82),SIZE*.78,SIZE*.82);
 g.drawImage(lining,0,0);
 g.globalCompositeOperation='source-over';
 backs.set(face,back);
 return back;
}
