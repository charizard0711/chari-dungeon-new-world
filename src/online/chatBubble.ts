export function chatBubbleText(message:string,limit=32){
 const characters=Array.from(message.replace(/\s+/g,' ').trim());
 return characters.length>limit?characters.slice(0,limit).join('')+'…':characters.join('');
}
