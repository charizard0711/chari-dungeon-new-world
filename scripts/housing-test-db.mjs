import fs from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
export async function makeHousingDb({before=''}={}){
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid()returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt()returns jsonb language sql as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{"is_anonymous":false}')::jsonb$$;`);
 for(const f of(await fs.readdir('supabase/migrations')).filter(f=>(f.includes('_online_')||f.includes('_town_equipment_'))&&(!before||f<before)).sort())await db.exec(await fs.readFile('supabase/migrations/'+f,'utf8'));
 const login=async uid=>{await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[uid,JSON.stringify({sub:uid,is_anonymous:false})]);};
 const rpc=async(action,payload={})=>(await db.query('select online_world($1,$2) as s',[action,JSON.stringify(payload)])).rows[0].s;
 return {db,login,rpc};
}
