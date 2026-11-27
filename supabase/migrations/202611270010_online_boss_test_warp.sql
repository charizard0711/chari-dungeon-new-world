begin;
alter function online_world(text,jsonb)rename to online_world_pre_boss_test_warp;
create function online_world(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p online_presence;m online_adventure_members;s jsonb;cfg jsonb;stamp bigint:=online_adventure_now_ms();begin
if action<>'boss_test_warp'then return online_world_pre_boss_test_warp(action,payload);end if;
if auth.uid()is null or not coalesce((select super_account from online_profiles where user_id=auth.uid()),false)then raise exception 'スーパーアカウント専用です。';end if;
perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));select * into p from online_presence where user_id=auth.uid();select * into m from online_adventure_members where character_id=p.character_id and finished_at is null;
if m.id is null or p.location is distinct from 'dungeon'then raise exception 'ダンジョン内で使用してください。';end if;
if m.floor<>1 then raise exception 'この階層にはまだボス部屋がありません。';end if;
perform pg_advisory_xact_lock(hashtextextended('online-room:'||m.room_id::text,0));select snapshot into s from online_adventure_rooms where id=m.room_id for update;
if s#>>'{bossEncounter,phase}'in('opening','battle','returning')then raise exception '戦闘・演出中は使用できません。';end if;
select data into cfg from online_adventure_config where id='floor1';
s:=s||jsonb_build_object('keys',coalesce((select jsonb_agg(k)from(select distinct value k from jsonb_array_elements(coalesce(s->'keys','[]')||'["amber","violet"]'::jsonb))q),'[]'::jsonb),'stairs',false,'bossEncounter',jsonb_build_object('phase','waiting','at',stamp,'padCount',1),'brokenFloors','[]'::jsonb);
s:=jsonb_set(s,'{enemies}',coalesce((select jsonb_agg(case when coalesce((e->>'boss')::boolean,false)then e||jsonb_build_object('hp',0,'x',50,'y',5)else e end)from jsonb_array_elements(s->'enemies')e),'[]'::jsonb));
update online_adventure_rooms set snapshot=s,status='active'where id=m.room_id;
update online_adventure_members set x=50,y=20,rail_trip=null where id=m.id;update online_presence set x=50,y=20,seen_at=clock_timestamp()where user_id=auth.uid();
perform online_explore_step(m.room_id,m.floor,50,20,cfg);
return online_world_pre_boss_test_warp('poll','{}');end$$;
revoke all on function online_world_pre_boss_test_warp(text,jsonb)from public,anon,authenticated;
revoke all on function online_world(text,jsonb)from public,anon;grant execute on function online_world(text,jsonb)to authenticated;
notify pgrst,'reload schema';commit;
