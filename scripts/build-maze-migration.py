from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
p=root/'supabase/migrations/202611220001_online_maze_cooperation.sql'
old=p.read_text(encoding='utf-8')
start=old.index('create or replace function public.online_in_boss_room')
end=old.index('do $$declare r record;m record;l record;')
head=old[:start]
# Keep the migration header/configuration intact; synchronize the reviewed SQL rules.
p.write_text(head+(root/'scripts/maze-rules.sql').read_text(encoding='utf-8')+'\n'+old[end:],encoding='utf-8')
