import { createClient } from '@supabase/supabase-js';
const env = (import.meta as any).env;
export const onlineConfigured = !!(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY);
export const online = onlineConfigured ? createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { storageKey: 'chari-dungeon.new-world.auth.v1', detectSessionInUrl: false, flowType: 'pkce' }
}) : null;
export interface TownPlayer { user_id:string; name:string; x:number; y:number; }
export interface TownMessage { id:number; name:string; message:string; }
export interface TownState { players:TownPlayer[]; messages:TownMessage[]; superAccount:boolean; }
export async function town(action:string, payload:Record<string,unknown> = {}):Promise<TownState> {
  if (!online) throw new Error('オンラインは準備中です。');
  const { data, error } = await online.rpc('online_town', { action, payload });
  if(error) throw new Error(error.message);
  return data as TownState;
}
