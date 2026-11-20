import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_MODULE||'C:/Users/masam/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const generated=process.env.TOWN_ART_SOURCE_DIR||'C:/Users/masam/.codex/generated_images/01a1ed2e-c820-70d0-8428-db389f5c65b9/';
const originals={necklaces:'exec-5b393e96-adca-4a78-9e09-3a82f60c243e.png',light:'exec-7ac7e5d6-872a-4aa3-b278-27eb99410ff7.png',dark:'exec-ac66b108-6b8b-428f-9ae3-8da5b96e52bf.png',gacha:'exec-7b9b9ce4-e475-4b58-b88b-b080595cd426.png',merchant:'exec-7fbadc9e-6669-44b2-8bba-ce39f4c0acbc.png'};
const art='art/town-equipment-v2',dest='public/assets/online/equipment-v2';await fs.mkdir(art,{recursive:true});await fs.mkdir(dest,{recursive:true});
for(const [key,file]of Object.entries(originals)){try{await fs.access(`${art}/${key}.png`);}catch{await fs.copyFile(generated+file,`${art}/${key}.png`);}}
async function cropCell(file,index,columns,rows){const info=await sharp(file).metadata(),x=Math.round(index%columns*info.width/columns),y=Math.round(Math.floor(index/columns)*info.height/rows),right=Math.round((index%columns+1)*info.width/columns),bottom=Math.round((Math.floor(index/columns)+1)*info.height/rows);return sharp(file).extract({left:x,top:y,width:right-x,height:bottom-y}).png().toBuffer();}
async function trimAlpha(input){const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=info.width,y0=info.height,x1=0,y1=0,max=0;const seen=new Uint8Array(info.width*info.height),queue=new Int32Array(seen.length);for(let seed=0;seed<seen.length;seed++){if(seen[seed]||data[seed*4+3]<=20)continue;let head=0,tail=1,left=info.width,top=info.height,right=0,bottom=0;queue[0]=seed;seen[seed]=1;while(head<tail){const i=queue[head++],x=i%info.width,y=Math.floor(i/info.width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);for(const next of [x?i-1:-1,x<info.width-1?i+1:-1,y?i-info.width:-1,y<info.height-1?i+info.width:-1])if(next>=0&&!seen[next]&&data[next*4+3]>20){seen[next]=1;queue[tail++]=next;}}if(tail>max){max=tail;x0=left;y0=top;x1=right;y1=bottom;}}return sharp(input).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).png().toBuffer();}
const necklaces=['n_amber','n_jade','n_sapphire','n_amethyst','n_ruby','n_opal','n_celestial'];
for(let i=0;i<necklaces.length;i++)await sharp(await trimAlpha(await cropCell(`${art}/necklaces.png`,i,4,2))).resize(236,236,{fit:'inside'}).extend({top:10,bottom:10,left:10,right:10,background:'#00000000'}).resize(256,256,{fit:'contain',background:'#00000000'}).webp({lossless:true}).toFile(`${dest}/${necklaces[i]}.webp`);
const catalog=JSON.parse(await fs.readFile(`${dest}/catalog.json`,'utf8'));
const types=['dagger','longsword','lance','bow','handgun','greatsword','katana','dual_sword','twin_daggers'];
for(const e of catalog.filter(e=>/^(w|s)_(light|dark)_/.test(e.key))){
 const element=e.key.includes('_light_')?'light':'dark',index=e.category==='shield'?9:types.indexOf(e.type);
 let artBuffer=await trimAlpha(await cropCell(`${art}/${element}.png`,index,5,2));if(e.type==='greatsword'&&element==='light')artBuffer=await sharp(artBuffer).rotate(180).png().toBuffer();
 const icon=await sharp(artBuffer).rotate(e.category==='weapon'&&!['dual_sword','twin_daggers'].includes(e.type)?45:0,{background:'#00000000'}).resize(224,224,{fit:'inside'}).resize(256,256,{fit:'contain',background:'#00000000'}).webp({lossless:true}).toBuffer();await fs.writeFile(`${dest}/${e.key}.webp`,icon);
 if(e.category==='shield'){const frame=await sharp(artBuffer).resize(52,52,{fit:'inside'}).resize(64,64,{fit:'contain',background:'#00000000'}).png().toBuffer();await sharp({create:{width:128,height:128,channels:4,background:'#00000000'}}).composite([0,1,2,3].map(i=>({input:frame,left:i%2*64,top:Math.floor(i/2)*64}))).png().toFile(`${dest}/held_${e.key}.png`);}
 if(e.category==='weapon'){
  // Paired item icons remain paired; each held layer needs just one blade.
  const heldBuffer=e.type==='dual_sword'||e.type==='twin_daggers'?await trimAlpha(await cropCell(`${art}/${element}.png`,e.type==='dual_sword'?1:0,5,2)):artBuffer;
  // Directional layers are separate from diagonal inventory art. Match the existing grip/orientation convention.
  const held=await sharp(heldBuffer).resize(52,52,{fit:'inside'}).resize(64,64,{fit:'contain',background:'#00000000'}).png().toBuffer();
  const frames=[];for(let i=0;i<4;i++){const angle=e.type==='bow'?[180,-90,90,0][i]:e.type==='handgun'?[0,-90,90,0][i]:0;frames.push(await sharp(held).rotate(angle,{background:'#00000000'}).resize(64,64).png().toBuffer());}
  for(const prefix of ['', 'star_'])await sharp({create:{width:128,height:128,channels:4,background:'#00000000'}}).composite(await Promise.all(frames.map(async(frame,i)=>({input:prefix?await sharp(frame).modulate({hue:155,saturation:1.7,brightness:1.1}).png().toBuffer():frame,left:i%2*64,top:Math.floor(i/2)*64})))).png().toFile(`${dest}/held_${prefix}${e.key}.png`);
  const star=await sharp(icon).modulate({hue:155,saturation:1.7,brightness:1.1}).webp({lossless:true}).toBuffer();await fs.writeFile(`${dest}/star_${e.key}.webp`,star);
  if(e.type==='bow')await sharp('public/assets/bow-arrows-v1/arrow_w_bow_ice.webp').modulate({hue:element==='light'?35:120,brightness:element==='light'?1.15:.85}).webp({lossless:true}).toFile(`${dest}/arrow_${e.key}.webp`);
  if(e.type==='katana'){const sheath='public/assets/katana-sheaths-v1/sheath_w_katana_iron.webp';for(const prefix of ['','star_'])await sharp(sheath).modulate({hue:element==='light'?35:120,saturation:prefix?1.3:1,brightness:element==='light'?1.2:.8}).webp({lossless:true}).toFile(`${dest}/sheath_${prefix}${e.key}.webp`);}
 }
}
for(const name of ['gacha','merchant'])await sharp(await trimAlpha(`${art}/${name}.png`)).resize(name==='gacha'?256:128,name==='gacha'?384:128,{fit:'contain',background:'#00000000'}).webp({lossless:true}).toFile(`public/assets/online/${name}-v2.webp`);
console.log(`Prepared seven necklaces, ${catalog.filter(e=>/^(w|s)_(light|dark)_/.test(e.key)).length} light/dark equipment icons, held/star atlases, merchant and gacha props.`);
