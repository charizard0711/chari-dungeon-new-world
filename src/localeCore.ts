import { ENGLISH } from './localeEnglish';
import { ENGLISH_TEMPLATES } from './localeTemplates';
import { KOREAN, CHINESE } from './localeAsian';
import { KOREAN_TEMPLATES, CHINESE_TEMPLATES } from './localeAsianTemplates';
export const LANGUAGES = ['en','ja','ko','zh-CN'] as const;
export type Language = typeof LANGUAGES[number];
export const LANGUAGE_NAMES: Record<Language,string> = {en:'English',ja:'日本語',ko:'한국어','zh-CN':'简体中文'};
export const isLanguage=(value:unknown):value is Language=>LANGUAGES.includes(value as Language);
/** An explicit choice wins; otherwise use the first supported browser preference. */
export function initialLanguage(saved: unknown, preferred: readonly string[], fallback = ''): Language {
  if (isLanguage(saved)) return saved;
  for (const tag of [...preferred, fallback]) {
    const base = tag.trim().toLowerCase().split(/[-_]/)[0];
    if (base === 'zh') return 'zh-CN';
    if (base === 'en' || base === 'ja' || base === 'ko') return base;
  }
  return 'en';
}
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const catalogs = {en:ENGLISH,ko:KOREAN,'zh-CN':CHINESE};
const templates={en:ENGLISH_TEMPLATES,ko:KOREAN_TEMPLATES,'zh-CN':CHINESE_TEMPLATES};
const matchers=Object.fromEntries(Object.entries(catalogs).map(([lang,dict])=>[lang,new RegExp(Object.keys(dict).filter(k=>k.length>1).sort((a,b)=>b.length-a.length).map(escape).join('|'),'g')])) as Record<Exclude<Language,'ja'>,RegExp>;
const patterns=Object.fromEntries(Object.entries(templates).map(([lang,list])=>[lang,list.map(([source,target])=>({expression:new RegExp('^'+source.split(/\{\d+\}/).map(escape).join('(.*?)')+'$'),target}))])) as Record<Exclude<Language,'ja'>,{expression:RegExp;target:string}[]>;
const caches={en:new Map<string,string>(),ko:new Map<string,string>(),'zh-CN':new Map<string,string>()};
export function translateTo(source:string,lang:Language):string {
  if(lang==='ja')return source;
  const dict=catalogs[lang],cache=caches[lang];
  if(cache.has(source))return cache.get(source)!;
  const directions:Record<string,[string,string,string]>={東:['East','동쪽','东'],西:['West','서쪽','西'],南:['South','남쪽','南'],北:['North','북쪽','北']};
  if(directions[source])return directions[source][lang==='en'?0:lang==='ko'?1:2];
  if(Object.prototype.hasOwnProperty.call(dict,source))return dict[source];
  for(const{expression,target}of patterns[lang]){const match=source.match(expression);if(match)return target.replace(/\{(\d+)\}/g,(_token,index)=>translateTo(match[Number(index)+1],lang));}
  let result=source.replace(matchers[lang],match=>dict[match]);
  const terms=lang==='en'?{attack:'ATK ',defense:'DEF ',outfit:'Outfit',shield:'Shield',low:'Low',medium:'Medium',high:'High',floor:'Floor $1',turn:'$1 turns',step:'$1 steps',directions:{東:'East',西:'West',南:'South',北:'North'}}
    :lang==='ko'?{attack:'공격 ',defense:'방어 ',outfit:'의상',shield:'방패',low:'낮음',medium:'보통',high:'높음',floor:'$1층',turn:'$1턴',step:'$1걸음',directions:{東:'동쪽',西:'서쪽',南:'남쪽',北:'북쪽'}}
    :{attack:'攻击 ',defense:'防御 ',outfit:'服装',shield:'盾牌',low:'低',medium:'中',high:'高',floor:'第$1层',turn:'$1回合',step:'$1步',directions:{東:'东',西:'西',南:'南',北:'北'}};
  result=result.replace(/攻(?=[\s+\-]?\d)/g,terms.attack).replace(/防(?=[\s+\-]?\d)/g,terms.defense)
    .replace(/服(?=[\s▶])/g,terms.outfit).replace(/（低）|\(低\)/g,`(${terms.low})`).replace(/（中）|\(中\)/g,`(${terms.medium})`).replace(/（高）|\(高\)/g,`(${terms.high})`)
    .replace(/盾/g,lang==='zh-CN'?'盾':terms.shield).replace(/([東西南北])(?=[:：])/g,direction=>terms.directions[direction as keyof typeof terms.directions])
    .replace(/(\d+(?:\.\d+)?)[階層]/g,terms.floor).replace(/(\d+)ターン/g,terms.turn).replace(/(\d+)歩/g,terms.step)
    .replace(/(\d+)個/g,lang==='en'?'$1':lang==='ko'?'$1개':'$1个').replace(/(\d+)体/g,lang==='en'?'$1':lang==='ko'?'$1마리':'$1只');
  if(cache.size>4096)cache.clear();cache.set(source,result);return result;
}
