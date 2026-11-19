import translations from './localeAsianData.json';
import { LOADING_KOREAN, LOADING_CHINESE } from './localeLoading';
import { MENU_KOREAN, MENU_CHINESE } from './localeMenu';
import { FOUNTAIN_KOREAN, FOUNTAIN_CHINESE } from './localeFountain';
import { BREAD_KOREAN, BREAD_CHINESE } from './localeBread';
// Japanese source keys map to [Korean, Simplified Chinese]; game identifiers stay unchanged.
export const KOREAN: Record<string,string> = Object.fromEntries(Object.entries(translations).map(([key, values]) => [key, values[0]]));
export const CHINESE: Record<string,string> = Object.fromEntries(Object.entries(translations).map(([key, values]) => [key, values[1]]));
Object.assign(KOREAN, LOADING_KOREAN, MENU_KOREAN, FOUNTAIN_KOREAN, BREAD_KOREAN);
Object.assign(CHINESE, LOADING_CHINESE, MENU_CHINESE, FOUNTAIN_CHINESE, BREAD_CHINESE);
KOREAN['登録完了 · ランキングを見る ›']='등록 완료 · 랭킹 보기 ›';
CHINESE['登録完了 · ランキングを見る ›']='登记完成 · 查看排行榜 ›';
