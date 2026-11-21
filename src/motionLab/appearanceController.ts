import assets from './wardrobe-assets.json';
import {COSTUMES,HAIR_COLORS,wardrobeAtlas,type Gender,type CostumeAsset} from './wardrobe';
import {parseLimbParts,type LimbParts} from './originalWeaponRig';
import type {Atlas} from './motion';
export type Appearance={body:Atlas;arms:LimbParts;key:string;name:string;gender:Gender;hair:string};
export function appearanceController(host:HTMLElement,load:(s:string)=>Promise<HTMLImageElement>,changed:(a:Appearance)=>void){
 let gender:Gender='male',costume='leather',hair='brown',revision=0;
 const cache=new Map<string,Appearance>(),armCache=new Map<string,LimbParts>(),catalog=assets as Record<string,CostumeAsset>;
 host.innerHTML=`<h3>キャラクターと衣装</h3><div class="row"><button data-gender="male" aria-pressed="true">男性</button><button data-gender="female" aria-pressed="false">女性</button></div><label class="legend" for="costume">装備する服</label><select id="costume" aria-label="装備する服"></select><div class="costume-reference"><img alt="選択した服の装備アイコン"><span></span></div><label class="legend">髪色</label><div class="hair-colors">${HAIR_COLORS.map(c=>`<button data-hair="${c.key}" aria-label="髪色 ${c.name}" title="${c.name}" style="--hair:rgb(${c.rgb.join(',')})" aria-pressed="${c.key===hair}"></button>`).join('')}</div><p class="appearance-status" role="status"></p>`;
 const select=host.querySelector<HTMLSelectElement>('select')!,status=host.querySelector<HTMLElement>('.appearance-status')!;
 function render(){const options=COSTUMES.filter(c=>!('gender'in c)||c.gender===gender);select.innerHTML=options.map(c=>`<option value="${c.key}">${c.grade} · ${c.name}</option>`).join('');select.value=costume;host.querySelectorAll<HTMLElement>('[data-gender]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gender===gender)));host.querySelectorAll<HTMLElement>('[data-hair]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.hair===hair)));const c=COSTUMES.find(c=>c.key===costume)!;host.querySelector<HTMLImageElement>('.costume-reference img')!.src=c.icon;host.querySelector<HTMLElement>('.costume-reference span')!.textContent=c.name+('hood'in c&&c.hood?' · 頭を覆う衣装':'');}
 async function get(key:string,g:Gender,h:string):Promise<Appearance>{
  const id=key+'_'+g,cacheKey=id+'_'+h,cached=cache.get(cacheKey);if(cached)return cached;
  const asset=catalog[id];if(!asset)throw Error('この衣装の素材を制作中です。');
  const [image,limbs]=await Promise.all([load(asset.path),load(asset.arms)]);const c=COSTUMES.find(c=>c.key===key)!;
  let arms=armCache.get(asset.arms);if(!arms){arms=parseLimbParts(limbs);armCache.set(asset.arms,arms);}
  const appearance={body:wardrobeAtlas(image,asset,h,'hood'in c&&!!c.hood),arms,key,name:c.name,gender:g,hair:h};cache.set(cacheKey,appearance);
  if(cache.size>24)cache.delete(cache.keys().next().value!);return appearance;
 }
 async function update(){const ticket=++revision;render();status.textContent='衣装を読み込み中…';try{const a=await get(costume,gender,hair);if(ticket!==revision)return;changed(a);const c=COSTUMES.find(c=>c.key===costume)!;status.textContent=`${gender==='female'?'女性':'男性'} · ${HAIR_COLORS.find(c=>c.key===hair)!.name}${'hood'in c&&c.hood?'（衣装の下に隠れます）':''}`;}catch(e){if(ticket===revision)status.textContent=String((e as Error).message);}}
 host.onclick=e=>{const b=(e.target as HTMLElement).closest<HTMLElement>('button');if(!b)return;if(b.dataset.gender){gender=b.dataset.gender as Gender;if(costume.startsWith('pumpkin_'))costume='pumpkin_'+gender;}if(b.dataset.hair)hair=b.dataset.hair;void update();};select.onchange=()=>{costume=select.value;void update();};
 return {update,getAll:()=>Promise.all(COSTUMES.flatMap(c=>(['male','female'] as Gender[]).filter(g=>!('gender'in c)||c.gender===g).map(g=>c.key+'_'+g)).map(id=>{const g=id.endsWith('_female')?'female':'male';return get(id.slice(0,-g.length-1),g,hair);})),get gender(){return gender;},get hair(){return hair;}};
}
