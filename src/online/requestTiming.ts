export interface RequestTiming{action:string;ms:number;status:'ok'|'error'|'timeout';at:number;}
const recent:RequestTiming[]=[];
/** Only operational metadata; never log payloads, accounts, chat or tokens. */
export function recordRequest(action:string,ms:number,status:RequestTiming['status']){recent.push({action,ms:Math.round(ms),status,at:Date.now()});if(recent.length>100)recent.shift();}
export function recentRequestTimings(){return recent.map(row=>({...row}));}
export async function boundedRequest<T>(run:(signal:AbortSignal)=>PromiseLike<T>,timeoutMs=8000):Promise<T>{
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([Promise.resolve().then(()=>run(controller.signal)),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('通信が遅れています。状態を再確認します。'));},timeoutMs);})]);}
 finally{if(timer)clearTimeout(timer);}
}
