begin;
-- Reuse the first pressure tile and keep every active player in the arena
-- in the encounter, even when only one person steps on the panel.
do $$
declare
 definition text:=pg_get_functiondef('public.online_maze_sync_pre_cinematic(uuid)'::regprocedure);
 old_check text:='select count(distinct a.x)into ready_count from online_adventure_members a where a.room_id=rid and actors?a.character_id::text and a.y=15 and a.x in(select 47+2*i from generate_series(0,cnt-1)i);';
begin
 if strpos(definition,old_check)=0 or strpos(definition,'if cnt>0 and ready_count=cnt then')=0 then
  raise exception 'Boss start panel hook missing';
 end if;
 definition:=replace(definition,'cnt int;ready_count int;','panel_pressed boolean;');
 definition:=replace(definition,'count(*)into actors,cnt','coalesce(bool_or(a.x=47 and a.y=15),false) into actors,panel_pressed');
 definition:=replace(definition,old_check,'');
 definition:=replace(definition,'if cnt>0 and ready_count=cnt then','if panel_pressed then');
 execute replace(definition,'''padCount'',cnt','''padCount'',1');
end$$;
commit;
