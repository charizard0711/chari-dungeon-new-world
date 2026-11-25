-- An empty room is a valid state. jsonb_agg over zero rows returns SQL NULL;
-- storing that as JSON null makes the next array iteration fail after an idle gap.
do $$declare s text;begin
select pg_get_functiondef('online_adventure_tick(uuid)'::regprocedure)into s;
if position('jsonb_build_object(''enemies'',e,''telegraphs'''in s)=0 then raise exception 'Realtime empty-room hook missing';end if;
s:=replace(s,'jsonb_build_object(''enemies'',e,''telegraphs''','jsonb_build_object(''enemies'',coalesce(e,''[]''::jsonb),''telegraphs''');execute s;
end$$;
notify pgrst,'reload schema';
-- Cinematic locks apply to arena participants, never someone walking elsewhere on the floor.
do $$declare s text;needle text;begin
select pg_get_functiondef('online_dungeon_walk(jsonb)'::regprocedure)into s;
needle:='if s#>>''{bossEncounter,phase}''=''opening''or(s#>>''{bossEncounter,phase}''=''battle''and s#>''{bossEncounter,smash}''is not null and nowms<(s#>>''{bossEncounter,smash,at}'')::bigint+(s#>>''{bossEncounter,smash,duration}'')::int)then stopped:=true;exit;end if;';
if position(needle in s)=0 then raise exception 'Motion cinematic scope hook missing';end if;
s:=replace(s,needle,'if m.floor=1 and online_in_boss_room(m.x,m.y)and('||substring(needle from 4 for position('then stopped'in needle)-4)||')then stopped:=true;exit;end if;');execute s;
end$$;
