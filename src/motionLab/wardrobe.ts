import type {Atlas,Frame,Point} from './motion';
export type Gender='male'|'female';
export const COSTUMES=[
 {key:'leather',name:'旅人の革装',grade:'D',icon:'/assets/ui/generated/armor-leather.png'},
 {key:'chain',name:'鎖帷子',grade:'C',icon:'/assets/ui/generated/armor-chain.png'},
 {key:'plate',name:'騎士の板金鎧',grade:'B',icon:'/assets/ui/generated/armor-plate.png'},
 {key:'arcane',name:'秘術装甲',grade:'A',icon:'/assets/ui/generated/armor-arcane.png'},
 {key:'dragon',name:'竜鱗神鎧',grade:'S',icon:'/assets/ui/generated/armor-dragon.png'},
 {key:'dawn',name:'暁白の聖装',grade:'SS',icon:'/assets/armor-icons-v3/armor_dawn.webp'},
 {key:'aqua',name:'蒼白の天聖鎧',grade:'SSS',icon:'/assets/armor-icons-v3/armor_aqua.webp',hood:true},
 {key:'crimson',name:'紅黒の天聖鎧',grade:'SSS',icon:'/assets/armor-icons-v3/armor_crimson.webp',hood:true},
 {key:'pumpkin_male',name:'かぼちゃの騎士服',grade:'A',icon:'/assets/characters/halloween-v1/armor_pumpkin_male.png',gender:'male',hood:true},
 {key:'pumpkin_female',name:'かぼちゃの魔女服',grade:'A',icon:'/assets/characters/halloween-v1/armor_pumpkin_female.png',gender:'female',hood:true},
] as const;
export type Costume=typeof COSTUMES[number];
export const HAIR_COLORS=[
 {key:'brown',name:'ブラウン',rgb:[110,65,37]},
 {key:'black',name:'ブラック',rgb:[31,39,50]},
 {key:'silver',name:'シルバー',rgb:[191,207,220]},
 {key:'gold',name:'ブロンド',rgb:[218,171,73]},
 {key:'red',name:'ワインレッド',rgb:[152,42,57]},
 {key:'blue',name:'ミッドナイトブルー',rgb:[47,89,154]},
] as const;
export interface CostumeAsset {path:string;cols:number;rows:number;directions:number[];arms:string;rowBounds?:number[];}
/** Frame metadata is measured from alpha, while cells stay on their authored grid.
 * Palette substitution is an in-game hair-only shader, never a whole-outfit tint. */
export function wardrobeAtlas(image:HTMLImageElement,asset:CostumeAsset,hair:string,covered:boolean):Atlas{
 const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
 const g=canvas.getContext('2d',{willReadFrequently:true})!;g.drawImage(image,0,0);
 const pixels=g.getImageData(0,0,canvas.width,canvas.height),data=pixels.data,frames:Frame[]=[],heights:number[]=[];
 const color=HAIR_COLORS.find(c=>c.key===hair)??HAIR_COLORS[0];
 for(let row=0;row<4;row++)for(let col=0;col<asset.cols;col++){
  const sourceRow=asset.directions[row],sx=Math.round(col*image.width/asset.cols),sy=asset.rowBounds?.[sourceRow]??Math.round(sourceRow*image.height/asset.rows),cw=Math.round((col+1)*image.width/asset.cols)-sx,ch=(asset.rowBounds?.[sourceRow+1]??Math.round((sourceRow+1)*image.height/asset.rows))-sy;
  let top=ch,bottom=0,left=cw,right=0;
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){const i=((sy+y)*canvas.width+sx+x)*4;if(data[i+3]<128){data[i+3]=0;continue;}top=Math.min(top,y);bottom=Math.max(bottom,y);left=Math.min(left,x);right=Math.max(right,x);}
  const height=bottom-top+1;heights.push(height);
  if(!covered&&hair!=='brown')for(let y=top;y<top+height*.235;y++)for(let x=0;x<cw;x++){
   const i=((sy+y)*canvas.width+sx+x)*4,r=data[i],gr=data[i+1],b=data[i+2];
   const isHair=data[i+3]>28&&r>gr*1.12&&gr>b*1.08&&r<185&&!(r>135&&gr>92)&&Math.abs(x-(left+right)/2)<height*.26;
   if(!isHair)continue;const light=Math.max(.22,Math.min(1.7,(r*.3+gr*.59+b*.11)/65));
   for(let n=0;n<3;n++)data[i+n]=Math.min(255,color.rgb[n]*light);
  }
  const root:Point=[cw/2,bottom];frames.push({sx,sy,cw,ch,root,hand:[cw*.4,ch*.58],off:[cw*.6,ch*.58]});
 }
 g.putImageData(pixels,0,0);heights.sort((a,b)=>a-b);const height=heights[Math.floor(heights.length/2)];
 // Renderer has eight animation phases; source atlases may have seven painted gait frames.
 const normalized:Frame[]=[];for(let row=0;row<4;row++)for(let f=0;f<8;f++)normalized.push(frames[row*asset.cols+Math.min(asset.cols-1,Math.floor(f*asset.cols/8))]);
 return {image:canvas,frames:normalized,scale:40/height};
}
