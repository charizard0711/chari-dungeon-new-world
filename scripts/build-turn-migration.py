from pathlib import Path
import json
p=json.loads(Path('scripts/turn-profiles.json').read_text());head="begin;\ncreate function online_mob_profile(k text)returns jsonb language sql immutable as $$select coalesce($p$"+json.dumps(p['monsters'])+"$p$::jsonb->k,'{\"behavior\":\"chase\",\"speed\":90}'::jsonb)$$;\ncreate function online_weapon_speed(k text)returns int language sql immutable as $$select coalesce(($p$"+json.dumps(p['weapons'])+"$p$::jsonb->>k)::int,90)$$;\n"
Path('supabase/migrations/202611220002_online_target_turns.sql').write_text(head+Path('scripts/turn-rules.sql').read_text(encoding='utf-8'),encoding='utf-8')
