import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,is_anonymous boolean default false);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select '{"is_anonymous":false}'::jsonb$$;`);
for(const file of ['202611180001_online_town.sql','202611180002_online_characters.sql','202611180003_online_drops_collision.sql','202611180004_online_super_commands.sql','202611180005_online_weapon_drops.sql','202611190001_online_training_chat.sql','202611190002_online_grid_equipment.sql','202611190003_online_controls_skills.sql'])await db.exec(await fs.readFile(`supabase/migrations/${file}`,'utf8'));
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',c='33333333-3333-4333-8333-333333333333',anon='44444444-4444-4444-8444-444444444444';
await db.query('insert into auth.users(id,email) values($1,$2),($3,$4),($5,$6)',[a,'one@example.test',b,'two@example.test',c,'pending@example.test']);
await db.query('insert into auth.users(id,is_anonymous) values($1,true)',[anon]);
await db.exec('create table public.test_ranking_records(user_id uuid references auth.users(id),score integer);');
await db.query('insert into public.test_ranking_records values($1,123)',[anon]);
for(const [uid,name] of [[a,'旅人一号'],[b,'旅人二号'],[c,'旅人三号']]){await db.query("select set_config('test.uid',$1,false)",[uid]);await db.query('select online_world($1,$2)',['create_character',JSON.stringify({name,gender:'male'})]);}
const reset=await fs.readFile('supabase/operations/reset-online-world.sql','utf8');
// Unexpected extra accounts must abort before deleting anything.
await db.query('insert into auth.users(id,email) values($1,$2)',['55555555-5555-4555-8555-555555555555','extra@example.test']);
await assert.rejects(()=>db.exec(reset));await db.exec('rollback');
assert.equal((await db.query('select count(*)::int n from public.online_characters')).rows[0].n,3);
await db.query('delete from auth.users where email=$1',['extra@example.test']);
await db.exec(reset);
assert.deepEqual((await db.query('select id,is_anonymous from auth.users')).rows,[{id:anon,is_anonymous:true}]);
assert.equal((await db.query('select score from public.test_ranking_records')).rows[0].score,123);
for(const table of ['online_profiles','online_characters','online_presence','online_messages','online_ground_items','online_training_hits'])assert.equal((await db.query(`select count(*)::int n from public.${table}`)).rows[0].n,0);
await db.close();console.log('PASS: reviewed online-only reset clears 3 email accounts and 3 characters, preserves anonymous ranking identity/data, and aborts on changed counts');
