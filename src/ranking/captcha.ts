export const captchaSiteKey = String((import.meta as any).env?.VITE_TURNSTILE_SITE_KEY ?? '');
type Turnstile = { render(node: HTMLElement, options: Record<string,unknown>): string; remove(id:string):void; reset(id:string):void };
let loading: Promise<Turnstile> | undefined;
function load(): Promise<Turnstile> {
  const existing = (window as any).turnstile as Turnstile | undefined;
  if (existing) return Promise.resolve(existing);
  return loading ??= new Promise((resolve,reject) => {
    const script=document.createElement('script');
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
    script.onload=()=>resolve((window as any).turnstile);
    script.onerror=()=>{loading=undefined;script.remove();reject(new Error('本人確認を読み込めませんでした。接続を確認して開き直してください。'));};
    document.head.append(script);
  });
}
export async function mountCaptcha(node: HTMLElement, changed: (token?: string) => void) {
  const api=await load();
  if(!node.isConnected)return {destroy:()=>{},reset:()=>{}};
  const id=api.render(node,{sitekey:captchaSiteKey,theme:'dark',size:node.clientWidth<310?'compact':'flexible',callback:(token:string)=>changed(token),
    'expired-callback':()=>changed(), 'error-callback':()=>changed()});
  return {destroy:()=>api.remove(id),reset:()=>{changed();api.reset(id)}};
}
