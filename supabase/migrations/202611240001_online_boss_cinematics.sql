begin;
-- Keep the encounter phase compatible with railway unlocks and existing room saves.
do $$declare s text;begin
select pg_get_functiondef('public.online_maze_sync(uuid)'::regprocedure)into s;
if position('>=2800' in s)=0 then raise exception 'Opening duration hook missing';end if;
s:=replace(s,'>=2800','>=14000');execute s;
end$$;
alter function public.online_adventure_blocked(int,int,int,jsonb)rename to online_adventure_blocked_pre_cinematic;
create function public.online_adventure_blocked(px int,py int,f int,s jsonb)returns boolean language sql stable security definer set search_path=public,pg_temp as $$select (f=1 and exists(select 1 from jsonb_array_elements(coalesce(s->'brokenFloors','[]'))b where(b->>'x')::int=px and(b->>'y')::int=py))or online_adventure_blocked_pre_cinematic(px,py,f,s)$$;

alter function public.online_maze_sync(uuid)rename to online_maze_sync_pre_cinematic;
create function public.online_maze_sync(rid uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare s jsonb;old_s jsonb;e jsonb;boss jsonb;smash jsonb;tiles jsonb;reserved jsonb;spot record;m record;target record;nowms bigint:=online_adventure_now_ms();stage int;bx int;bosy int;dx int;dy int;begin
 perform online_maze_sync_pre_cinematic(rid);
 select snapshot into s from online_adventure_rooms where id=rid for update;if s is null then return;end if;old_s:=s;boss:=s->'bossEncounter';smash:=boss->'smash';
 if boss->>'phase'='waiting'then
  s:=s-'brokenFloors';s:=jsonb_set(s,'{bossEncounter}',boss-'smash'-'smashCount');
 elsif boss->>'phase'='battle'then
  if smash is not null and not coalesce((smash->>'applied')::boolean,false)and nowms>=(smash->>'at')::bigint+1800 then
   bx:=(smash->>'x')::int;bosy:=(smash->>'y')::int;tiles:=smash->'tiles';
   -- Outer players move first. Exactly one cardinal tile, never through a wall, rubble or another body.
   for m in select a.* from online_adventure_members a join online_characters c on c.id=a.character_id join online_presence p on p.character_id=a.character_id where a.room_id=rid and a.finished_at is null and a.floor=1 and online_in_boss_room(a.x,a.y)and c.hp>0 and p.location='dungeon'order by abs(a.x-bx)+abs(a.y-bosy)desc,a.character_id loop
    select(z->>'x')::int as x,(z->>'y')::int as y into target from jsonb_array_elements(smash->'knockbacks')z where z->>'id'=m.character_id::text;
    if target.x is not null then update online_adventure_members set x=target.x,y=target.y where id=m.id;end if;
   end loop;
   s:=s||jsonb_build_object('brokenFloors',coalesce(s->'brokenFloors','[]')||tiles);
   smash:=smash||'{"applied":true}'::jsonb;boss:=boss||jsonb_build_object('smash',smash);s:=jsonb_set(s,'{bossEncounter}',boss);
  end if;
  if smash is null or nowms>=(smash->>'at')::bigint+(smash->>'duration')::int then
   select value into e from jsonb_array_elements(s->'enemies')where coalesce((value->>'boss')::boolean,false)limit 1;
   stage:=coalesce((boss->>'smashCount')::int,0);
   if stage<2 and(e->>'hp')::int>0 and(e->>'hp')::int<=ceil((e->>'max')::numeric*(2-stage)/3)then
    bx:=(e->>'x')::int;bosy:=(e->>'y')::int;
    reserved:='[]';
    for m in select a.* from online_adventure_members a join online_characters c on c.id=a.character_id join online_presence p on p.character_id=a.character_id where a.room_id=rid and a.finished_at is null and a.floor=1 and online_in_boss_room(a.x,a.y)and c.hp>0 and p.location='dungeon'order by abs(a.x-bx)+abs(a.y-bosy)desc,a.character_id loop
    select x,y into target from(values(m.x+1,m.y),(m.x-1,m.y),(m.x,m.y+1),(m.x,m.y-1))v(x,y)
    where online_in_boss_room(x,y)and not online_adventure_blocked(x,y,1,s)
    and not exists(select 1 from jsonb_array_elements(reserved)t where(t->>'x')::int=v.x and(t->>'y')::int=v.y)
    and not exists(select 1 from online_adventure_members a join online_presence p on p.character_id=a.character_id where a.room_id=rid and a.finished_at is null and a.floor=1 and a.id<>m.id and a.x=v.x and a.y=v.y and p.location='dungeon')
    and not exists(select 1 from jsonb_array_elements(s->'enemies')z where(z->>'hp')::int>0 and(z->>'x')::int=x and(z->>'y')::int=y)
    order by (abs(x-bx)+abs(y-bosy))desc,case when x=m.x then 0 else 1 end,y,x limit 1;
    if target.x is not null then reserved:=reserved||jsonb_build_array(jsonb_build_object('id',m.character_id,'x',target.x,'y',target.y));end if;
    end loop;
    select jsonb_agg(jsonb_build_object('x',x,'y',y)order by score,y,x)into tiles from(
     select x,y,abs(x-bx)+abs(y-(bosy+1))score from generate_series(greatest(42,bx-3),least(57,bx+3))gx(x)cross join generate_series(greatest(4,bosy-2),least(21,bosy+3))gy(y)
     where not online_adventure_blocked(x,y,1,s)and(x<>bx or y<>bosy)and not exists(select 1 from jsonb_array_elements(reserved)z where(z->>'x')::int=gx.x and(z->>'y')::int=gy.y)
     and not exists(select 1 from online_adventure_members a join online_presence p on p.character_id=a.character_id where a.room_id=rid and a.finished_at is null and a.floor=1 and a.x=gx.x and a.y=gy.y and p.location='dungeon')
     and not exists(select 1 from jsonb_array_elements(s->'enemies')z where(z->>'hp')::int>0 and(z->>'x')::int=x and(z->>'y')::int=y)
     order by score,y,x limit 3)q;
    if jsonb_array_length(coalesce(tiles,'[]'))=3 then
     boss:=boss||jsonb_build_object('smashCount',stage+1,'smash',jsonb_build_object('at',nowms,'duration',3800,'x',bx,'y',bosy,'tiles',tiles,'knockbacks',reserved,'applied',false));
     s:=s||jsonb_build_object('bossEncounter',boss,'telegraphs','[]'::jsonb);
    end if;
   end if;
  end if;
 end if;
 if s is distinct from old_s then update online_adventure_rooms set snapshot=s where id=rid;end if;
end$$;

-- Mandatory HP checkpoints: a large hit cannot skip both floor-breaking scenes or kill through them.
do $$declare s text;needle text:='damage:=damage+n;hit:=true;enemy:=jsonb_set';begin
select pg_get_functiondef('public.online_world_adventures(text,jsonb)'::regprocedure)into s;
if position(needle in s)=0 then raise exception 'Boss HP checkpoint hook missing';end if;
s:=replace(s,needle,$hook$if coalesce((enemy->>'boss')::boolean,false)and coalesce((s#>>'{bossEncounter,smashCount}')::int,0)<2 then
n:=least(n,greatest(0,(enemy->>'hp')::int-ceil((enemy->>'max')::numeric*(2-coalesce((s#>>'{bossEncounter,smashCount}')::int,0))/3)::int));end if;damage:=damage+n;hit:=true;enemy:=jsonb_set$hook$);execute s;
end$$;

alter function public.online_turn_enemy(uuid,text,uuid)rename to online_turn_enemy_pre_cinematic;
create function public.online_turn_enemy(rid uuid,eid text,cid uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$declare b jsonb;begin
select snapshot->'bossEncounter'into b from online_adventure_rooms where id=rid;
if exists(select 1 from online_adventure_members where room_id=rid and character_id=cid and floor=1 and online_in_boss_room(x,y))and(b->>'phase'='opening'or(b->'smash'is not null and online_adventure_now_ms()<(b#>>'{smash,at}')::bigint+(b#>>'{smash,duration}')::int))then return;end if;
perform online_turn_enemy_pre_cinematic(rid,eid,cid);end$$;

alter function public.online_world(text,jsonb)rename to online_world_pre_cinematic;
create function public.online_world(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare m online_adventure_members;p online_presence;b jsonb;begin
if auth.uid()is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true)then raise exception 'ログインしてください。';end if;
perform online_lock_action(action);select * into p from online_presence where user_id=auth.uid();select * into m from online_adventure_members where character_id=p.character_id and finished_at is null;
if p.location='dungeon'and m.floor=1 and online_in_boss_room(m.x,m.y)then
perform online_maze_sync(m.room_id);select snapshot->'bossEncounter'into b from online_adventure_rooms where id=m.room_id;
if action not in('poll','list','chat','channel_chat')and(b->>'phase'='opening'or(b->'smash'is not null and online_adventure_now_ms()<(b#>>'{smash,at}')::bigint+(b#>>'{smash,duration}')::int))then raise exception 'ボスの演出中は行動できません。';end if;
end if;
return online_world_pre_cinematic(action,payload);end$$;
revoke all on function public.online_world_pre_cinematic(text,jsonb),public.online_adventure_blocked_pre_cinematic(int,int,int,jsonb),public.online_maze_sync_pre_cinematic(uuid),public.online_turn_enemy_pre_cinematic(uuid,text,uuid),public.online_turn_enemy(uuid,text,uuid),public.online_maze_sync(uuid),public.online_adventure_blocked(int,int,int,jsonb)from public,anon,authenticated;
revoke all on function public.online_world(text,jsonb)from public,anon;grant execute on function public.online_world(text,jsonb)to authenticated;
notify pgrst,'reload schema';commit;
