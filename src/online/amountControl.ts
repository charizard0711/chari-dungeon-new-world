export function amountValue(text:string){const value=text.normalize('NFKC').trim();return /^\d+$/.test(value)&&Number.isSafeInteger(Number(value))?Number(value):NaN;}
export function createAmountControl(label:string,max:number,initial:string,onChange:(value:string)=>void=()=>{}){
 const root=document.createElement('div');root.className='game-amount';const input=document.createElement('input');input.type='text';input.inputMode='numeric';input.autocomplete='off';input.maxLength=10;input.value=initial;input.setAttribute('aria-label',label);root.append(input);
 let composing=false;input.addEventListener('compositionstart',()=>composing=true);input.addEventListener('compositionend',()=>{composing=false;onChange(input.value);});input.oninput=()=>{if(!composing)onChange(input.value);};
 const set=(n:number)=>{input.value=String(Math.max(1,Math.min(Math.max(1,max),n)));onChange(input.value);};
 input.onkeydown=e=>{if(composing||e.isComposing)return;if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();set((amountValue(input.value)||1)+(e.key==='ArrowUp'?1:-1));}};
 const buttons=document.createElement('div');buttons.className='game-amount-buttons';for(const [text,delta]of [['▲',1],['▼',-1]] as const){const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',label+(delta>0?'を増やす':'を減らす'));b.disabled=max<1;b.onpointerdown=e=>e.preventDefault();b.onclick=()=>set((amountValue(input.value)||1)+delta);buttons.append(b);}root.append(buttons);return{root,input,value:()=>amountValue(input.value)};
}
