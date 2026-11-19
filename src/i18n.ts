import Phaser from 'phaser';
import { LANGUAGES, LANGUAGE_NAMES, initialLanguage, isLanguage, translateTo, type Language } from './localeCore';
import { LOADING_TIPS } from './localeLoading';
export { LANGUAGES, LANGUAGE_NAMES, type Language } from './localeCore';
const STORAGE_KEY = 'chari-dungeon.language.v1';
let savedLanguage: string | null = null;
try { savedLanguage=localStorage.getItem(STORAGE_KEY); } catch { /* Browser preference still works without storage. */ }
let language: Language = initialLanguage(savedLanguage, navigator.languages ?? [], navigator.language);
const originals = new Map<Phaser.GameObjects.Text, string | string[]>();
export const getLanguage = () => language;
export const translate = (source:string) => translateTo(source,language);
export function setLanguage(value: Language): void {
  if (!isLanguage(value)) return;
  language = value;

  try { localStorage.setItem(STORAGE_KEY, value); } catch { /* Switching still works without storage. */ }
  document.documentElement.lang = value;
  refreshLoadingLabels();
  for (const [text, source] of originals) text.setText(source);
  window.dispatchEvent(new Event('chari-language-changed'));
}
/** Translate at the presentation boundary; save data, item IDs and game logic stay Japanese. */
function refreshLoadingLabels(): void {
  const tip = document.querySelector<HTMLElement>('.loading-tip');
  if (tip) tip.textContent = translate(tip.dataset.source ?? LOADING_TIPS[0]);
  const tipLabel=document.querySelector<HTMLElement>('.loading-tip-label');
  if(tipLabel)tipLabel.textContent=translate('冒険のヒント');
  const root = document.getElementById('loading-screen');
  root?.setAttribute('aria-label', translate('ゲームを読み込み中'));
  root?.querySelector('[role="progressbar"]')?.setAttribute('aria-label',translate('読み込み状況'));
  const heading = root?.querySelector('h2');
  if (heading) heading.textContent=translate(root?.dataset.mode==='stairs'?'さらに深い階層へ…':'ダンジョンの扉を開いています…');
  const status=root?.querySelector<HTMLElement>('.loading-status');
  if(status)status.textContent=translate(status.dataset.source??'ダンジョンを読み込み中…');
}
export function installLocalization(): void {
  const originalSetText = Phaser.GameObjects.Text.prototype.setText;
  Phaser.GameObjects.Text.prototype.setText = function(value: string | string[]): Phaser.GameObjects.Text {
    if (!originals.has(this)) this.once('destroy', () => originals.delete(this));
    originals.set(this, Array.isArray(value) ? [...value] : value);
    originalSetText.call(this, this.getData('localeLiteral') ? value : Array.isArray(value) ? value.map(translate) : translate(String(value ?? '')));
    const maxWidth = this.getData('localeMaxWidth') as number | undefined;
    if (maxWidth && this.width > maxWidth) {
      const full = this.text;
      let lo = 0, hi = full.length;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (this.context.measureText(full.slice(0, mid) + '…').width <= maxWidth) lo = mid;
        else hi = mid - 1;
      }
      originalSetText.call(this, full.slice(0, lo) + '…');
    }
    return this;
  };
  document.documentElement.lang = language;
  refreshLoadingLabels();
}
/** Four direct choices, using native language names so every player can find theirs. */
export function addLanguageControl(scene:Phaser.Scene,x:number,y:number,width=356):Phaser.GameObjects.Container {
  const group=scene.add.container(x,y).setDepth(80).setName('language-switch');
  const gap=5,w=(width-gap*3)/4;
  const choices: {lang:Language;bg:Phaser.GameObjects.Rectangle;text:Phaser.GameObjects.Text}[]=[];
  LANGUAGES.forEach((lang,index)=>{
    const bx=-width/2+w/2+index*(w+gap);
    const bg=scene.add.rectangle(bx,0,w,34,0x10252c,.94).setStrokeStyle(1,0x6b817b,.7);
    const label=scene.add.text(bx,0,LANGUAGE_NAMES[lang],{fontFamily:'"Yu Gothic UI","Malgun Gothic","Microsoft YaHei",sans-serif',fontSize:'12px',color:'#d3dcd3'}).setOrigin(.5).setData('localeLiteral',true);
    const zone=scene.add.zone(bx,0,w,38).setName(`language-${lang}`).setInteractive({useHandCursor:true}).on('pointerdown',()=>setLanguage(lang));
    group.add([bg,label,zone]);choices.push({lang,bg,text:label});
  });
  const update=()=>choices.forEach(c=>{c.bg.setFillStyle(c.lang===language?0x324b45:0x10252c,.94).setStrokeStyle(c.lang===language?2:1,c.lang===language?0xe8cf99:0x6b817b);c.text.setColor(c.lang===language?'#ffe3a3':'#c4d5ce');});
  update();window.addEventListener('chari-language-changed',update);group.once('destroy',()=>window.removeEventListener('chari-language-changed',update));return group;
}
