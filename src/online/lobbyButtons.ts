type ButtonFinish='confirm'|'cyan'|'violet'|'slate';
const paths={gear:'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',check:'M5 12l4.5 4.5L19 7',plus:'M12 4v16M4 12h16',chevron:'M9 5l7 7-7 7',logout:'M10 4H4v16h6M9 12h12m-5-5 5 5-5 5'};
function icon(name:keyof typeof paths){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.classList.add('lobby-button-icon');
 const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[name]);svg.append(path);return svg;
}
/** Text stays in the DOM; the scalable vector frame is decoration only. */
export function finishLobbyButton(button:HTMLButtonElement,label:string,finish?:ButtonFinish){
 const kind=finish??(label.startsWith('決定')?'confirm':label.includes('ログアウト')?'slate':label.includes('キャラクター作成')?'violet':label.includes('町へ入場')?'cyan':undefined);
 if(!kind)return;
 button.classList.add('lobby-art-button');button.dataset.finish=kind;
 const text=label.replace(/[＋↪✓›]/g,'').trim();button.setAttribute('aria-label',text);
 const art=document.createElement('img');art.className='lobby-button-art';art.src=`assets/ui/lobby-buttons/${kind}.svg`;art.alt='';art.setAttribute('aria-hidden','true');art.draggable=false;
 const caption=document.createElement('span');caption.className='lobby-button-caption';
 if(kind==='confirm')caption.append(icon('check'));else if(kind==='violet')caption.append(icon('plus'));else if(kind==='slate')caption.append(icon(/設定|SETTINGS|설정|设置/.test(text)?'gear':'logout'));
 const words=document.createElement('span');words.textContent=text;caption.append(words);
 if(kind==='confirm'||text==='町へ入場')caption.append(icon('chevron'));
 button.replaceChildren(art,caption);
}
