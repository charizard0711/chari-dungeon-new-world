begin;
alter table public.online_characters add column skill_steps_remaining integer not null default 0 check(skill_steps_remaining between 0 and 100),add column time_stop_turns integer not null default 0 check(time_stop_turns between 0 and 5);
alter table public.online_training_hits drop constraint online_training_hits_damage_check;
alter table public.online_training_hits add check(damage>=0),add column origin_x integer,add column origin_y integer,add column action_kind text not null default 'attack',add column skill_type text,add column hit_target boolean not null default true;
create function public.online_attack_tiles(kind text,ox integer,oy integer,facing text,reach integer) returns table(tile_x integer,tile_y integer) language plpgsql set search_path=public,pg_temp as $$
declare dx integer:=case facing when 'left' then -1 when 'right' then 1 else 0 end;dy integer:=case facing when 'up' then -1 when 'down' then 1 else 0 end;i integer;j integer;nx integer;ny integer;vx integer;vy integer;
begin
 if kind='greatsword' then
  for i in -1..1 loop for j in -1..1 loop if i=0 and j=0 then continue;end if;nx:=ox+i;ny:=oy+j;
   if i<>0 and j<>0 and public.online_town_blocked(ox+i,oy) and public.online_town_blocked(ox,oy+j) then continue;end if;
   if not public.online_town_blocked(nx,ny) or (nx=12 and ny=5) then tile_x:=nx;tile_y:=ny;return next;end if;
  end loop;end loop;
 elsif kind='longsword' then
  for i in -1..1 loop nx:=ox+dx-dy*i;ny:=oy+dy+dx*i;
   if i<>0 and public.online_town_blocked(ox+dx,oy+dy) and public.online_town_blocked(ox-dy*i,oy+dx*i) then continue;end if;
   if not public.online_town_blocked(nx,ny) or (nx=12 and ny=5) then tile_x:=nx;tile_y:=ny;return next;end if;
  end loop;
 elsif kind='lance' then
  for j in 0..3 loop vx:=case j when 0 then 1 when 1 then -1 else 0 end;vy:=case j when 2 then 1 when 3 then -1 else 0 end;
   for i in 1..reach loop nx:=ox+vx*i;ny:=oy+vy*i;if public.online_town_blocked(nx,ny) and not(nx=12 and ny=5) then exit;end if;tile_x:=nx;tile_y:=ny;return next;end loop;
  end loop;
 else
  for i in 1..reach loop nx:=ox+dx*i;ny:=oy+dy*i;if public.online_town_blocked(nx,ny) and not(nx=12 and ny=5) then exit;end if;tile_x:=nx;tile_y:=ny;return next;if nx=12 and ny=5 and kind in ('bow','handgun','dagger') then exit;end if;end loop;
 end if;
end $$;
revoke all on function public.online_attack_tiles(text,integer,integer,text,integer) from public,anon,authenticated;
create or replace function public.online_world(action text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();p public.online_profiles;c public.online_characters;r public.online_presence;nx int;ny int;s int;n text;g text;msg text;k text;v boolean;d public.online_ground_items;cat public.online_catalog;max_hp integer;idx integer;combat public.online_catalog;training_damage integer;reach integer;distance integer;dx integer;dy integer;equipment_slot text;skill jsonb;skill_kind text;hit_target boolean;is_skill boolean;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'メールアカウントでログインしてください。';end if;
 perform pg_advisory_xact_lock(71390119);
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 insert into public.online_profiles(user_id,name) values(uid,'冒険者') on conflict(user_id) do nothing;
 select * into p from public.online_profiles where user_id=uid;
 if action='create_character' then
   n:=trim(payload->>'name');g:=payload->>'gender';
   if n is null or char_length(n) not between 2 and 12 or n~'[[:cntrl:]]' or g is null or g not in ('male','female') then raise exception '名前は2〜12文字、男女を選択してください。';end if;
   select x into s from generate_series(1,2)x where not exists(select 1 from public.online_characters where user_id=uid and slot=x) order by x limit 1;
   if s is null then raise exception 'キャラクターは2体まで作成できます。';end if;
   insert into public.online_characters(user_id,slot,name,gender) values(uid,s,n,g);
 elsif action='join' then
   select * into c from public.online_characters where id=(payload->>'character_id')::uuid and user_id=uid;
   if c.id is null then raise exception '自分のキャラクターを選択してください。';end if;
   select tile_x,tile_y into nx,ny from public.online_free_town_tile(12,14,uid);
   if nx is null then raise exception '町が満員です。';end if;
   insert into public.online_presence(user_id,character_id,x,y) values(uid,c.id,nx,ny) on conflict(user_id) do update set character_id=c.id,x=excluded.x,y=excluded.y,dir='down',seen_at=now(),moved_at='epoch';
 elsif action='leave' then delete from public.online_presence where user_id=uid;
 elsif action in ('move','poll','chat','equip','use_item','drop_item','pickup_item','redeem_code','claim_item','drop_weapon','train','drop_equipment','attack','skill','wait') then
   select * into r from public.online_presence where user_id=uid;
   select * into c from public.online_characters where id=r.character_id and user_id=uid;
   if c.id is null then raise exception 'キャラクターを選び、町に入場してください。';end if;
   if exists(select 1 from public.online_presence other where other.user_id<>uid and other.x=r.x and other.y=r.y and other.seen_at>now()-interval '20 seconds') then
     select tile_x,tile_y into nx,ny from public.online_free_town_tile(r.x,r.y,uid);
     if nx is null then raise exception '町が満員です。';end if;
     update public.online_presence set x=nx,y=ny where user_id=uid;r.x:=nx;r.y:=ny;
   end if;
   max_hp:=case when coalesce((c.gear->>'weapon')::boolean,false) and coalesce(c.gear->>'weapon_key','') like 'star_%' then 150 else 100 end;
   if action='move' then
     nx:=(payload->>'x')::int;ny:=(payload->>'y')::int;
     if nx is null or ny is null or abs(nx-r.x)+abs(ny-r.y)<>1 or public.online_town_blocked(nx,ny) or exists(select 1 from public.online_presence other where other.user_id<>uid and other.x=nx and other.y=ny and other.seen_at>now()-interval '20 seconds') then raise exception 'そこには移動できません。';end if;
     if r.moved_at>clock_timestamp()-interval '110 milliseconds' then raise exception '移動が速すぎます。';end if;
     update public.online_presence set x=nx,y=ny,dir=case when nx>r.x then 'right' when nx<r.x then 'left' when ny>r.y then 'down' else 'up' end,moved_at=clock_timestamp() where user_id=uid;

     update public.online_characters set skill_steps_remaining=greatest(0,skill_steps_remaining-1),time_stop_turns=greatest(0,time_stop_turns-1) where id=c.id;
     if c.time_stop_turns=1 then
       select dir into n from public.online_presence where user_id=uid;
       select * into combat from public.online_catalog where key=regexp_replace(coalesce(c.gear->>'weapon_key','w_iron_dagger'),'^star_','') and category='weapon';
       select exists(select 1 from public.online_attack_tiles('bow',nx,ny,n,1) where tile_x=12 and tile_y=5) into hit_target;
       insert into public.online_training_hits(user_id,character_id,damage,dir,weapon_key,origin_x,origin_y,action_kind,skill_type,hit_target) values(uid,c.id,case when hit_target then (5+coalesce(combat.attack_min,0)+floor(random()*(9+coalesce(combat.attack_max,0)-coalesce(combat.attack_min,0)))::integer)*2 else 0 end,n,c.gear->>'weapon_key',nx,ny,'skill','dagger_finish',hit_target);
     end if;
   elsif action='wait' then
     if r.moved_at>clock_timestamp()-interval '110 milliseconds' then raise exception '少し待ってください。';end if;
     nx:=r.x;ny:=r.y;update public.online_presence set moved_at=clock_timestamp() where user_id=uid;

     update public.online_characters set skill_steps_remaining=greatest(0,skill_steps_remaining-1),time_stop_turns=greatest(0,time_stop_turns-1) where id=c.id;
     if c.time_stop_turns=1 then
       select dir into n from public.online_presence where user_id=uid;
       select * into combat from public.online_catalog where key=regexp_replace(coalesce(c.gear->>'weapon_key','w_iron_dagger'),'^star_','') and category='weapon';
       select exists(select 1 from public.online_attack_tiles('bow',nx,ny,n,1) where tile_x=12 and tile_y=5) into hit_target;
       insert into public.online_training_hits(user_id,character_id,damage,dir,weapon_key,origin_x,origin_y,action_kind,skill_type,hit_target) values(uid,c.id,case when hit_target then (5+coalesce(combat.attack_min,0)+floor(random()*(9+coalesce(combat.attack_max,0)-coalesce(combat.attack_min,0)))::integer)*2 else 0 end,n,c.gear->>'weapon_key',nx,ny,'skill','dagger_finish',hit_target);
     end if;
     insert into public.online_training_hits(user_id,character_id,damage,dir,origin_x,origin_y,action_kind,hit_target) values(uid,c.id,0,r.dir,r.x,r.y,'wait',false);
   elsif action='chat' then
     msg:=trim(payload->>'message');if msg is null or char_length(msg) not between 1 and 200 then raise exception '1〜200文字で入力してください。';end if;
     if exists(select 1 from public.online_messages where user_id=uid and created_at>now()-interval '2 seconds') then raise exception '少し待ってから送信してください。';end if;
     insert into public.online_messages(user_id,name,message,character_id) values(uid,c.name,msg,c.id);
   elsif action in ('train','attack','skill') then
     is_skill:=action='skill';n:=coalesce(payload->>'dir',r.dir);
     if n not in ('up','down','left','right') then raise exception '攻撃方向を確認してください。';end if;
     if c.time_stop_turns>0 then raise exception '零刻領域では攻撃できません。移動か足踏みで時を進めてください。';end if;
     if exists(select 1 from public.online_training_hits where user_id=uid and action_kind<>'wait' and created_at>clock_timestamp()-interval '320 milliseconds') then raise exception '攻撃の間隔を少し空けてください。';end if;
     select * into combat from public.online_catalog where key=regexp_replace(coalesce(c.gear->>'weapon_key','w_iron_dagger'),'^star_','') and category='weapon' and coalesce((c.gear->>'weapon')::boolean,false);
     skill:= '{"w_katana_iron":{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"},"w_katana_mist":{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"},"w_katana_moon":{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"},"w_katana_sun":{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"},"w_katana_dragon":{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"},"w_katana_sky":{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"},"w_katana_divine":{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"},"w_katana_fire":{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"},"w_katana_water":{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"},"w_katana_thunder":{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"},"w_katana_ice":{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"},"w_secret_ember":{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"},"w_secret_tide":{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"},"w_secret_storm":{"type":"lance","name":"貫通突き","description":"東西南北各2マスを攻撃・攻撃力20%低下を3ターン","color":15779678,"chargeSteps":100,"range":2,"multiplier":1.35,"sound":"skillLance"},"w_secret_frost":{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"},"w_secret_solar":{"type":"handgun","name":"五連射","description":"前方3マス以内の敵1体へ5発・生存時に防御10%低下を3ターン","color":16755808,"chargeSteps":100,"range":3,"multiplier":0.65,"sound":"skillHandgun"},"w_hero_sword":{"type":"greatsword","name":"旋風斬り","description":"周囲8マスを斬り、敵を1マス押し戻す。命中したモンスター1体につきHP10回復","color":16740978,"chargeSteps":100,"range":1,"multiplier":1.45,"sound":"skillGreatsword"},"w_dagger_fire":{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"},"w_dagger_water":{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"},"w_dagger_thunder":{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"},"w_dagger_ice":{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"},"w_longsword_fire":{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"},"w_longsword_water":{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"},"w_longsword_thunder":{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"},"w_longsword_ice":{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"},"w_bow_fire":{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"},"w_bow_water":{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"},"w_bow_thunder":{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"},"w_bow_ice":{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"},"w_dual_sword_fire":{"type":"dual_sword","name":"十字絶閃","description":"前方5マスを貫通する斬撃を3連発・各発は通常攻撃の1.5倍","color":16753135,"chargeSteps":100,"range":5,"multiplier":1.5,"sound":"skillDual"},"w_dual_sword_water":{"type":"dual_sword","name":"十字絶閃","description":"前方5マスを貫通する斬撃を3連発・各発は通常攻撃の1.5倍","color":16753135,"chargeSteps":100,"range":5,"multiplier":1.5,"sound":"skillDual"},"w_dual_sword_thunder":{"type":"dual_sword","name":"十字絶閃","description":"前方5マスを貫通する斬撃を3連発・各発は通常攻撃の1.5倍","color":16753135,"chargeSteps":100,"range":5,"multiplier":1.5,"sound":"skillDual"},"w_dual_sword_ice":{"type":"dual_sword","name":"十字絶閃","description":"前方5マスを貫通する斬撃を3連発・各発は通常攻撃の1.5倍","color":16753135,"chargeSteps":100,"range":5,"multiplier":1.5,"sound":"skillDual"},"w_handgun_fire":{"type":"handgun","name":"五連射","description":"前方3マス以内の敵1体へ5発・生存時に防御10%低下を3ターン","color":16755808,"chargeSteps":100,"range":3,"multiplier":0.65,"sound":"skillHandgun"},"w_handgun_water":{"type":"handgun","name":"五連射","description":"前方3マス以内の敵1体へ5発・生存時に防御10%低下を3ターン","color":16755808,"chargeSteps":100,"range":3,"multiplier":0.65,"sound":"skillHandgun"},"w_handgun_thunder":{"type":"handgun","name":"五連射","description":"前方3マス以内の敵1体へ5発・生存時に防御10%低下を3ターン","color":16755808,"chargeSteps":100,"range":3,"multiplier":0.65,"sound":"skillHandgun"},"w_handgun_ice":{"type":"handgun","name":"五連射","description":"前方3マス以内の敵1体へ5発・生存時に防御10%低下を3ターン","color":16755808,"chargeSteps":100,"range":3,"multiplier":0.65,"sound":"skillHandgun"},"w_iron_dagger":{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"},"w_shadow_stiletto":{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"},"w_sawtooth_dirk":{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"},"w_moon_fang":{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"},"w_assassin_requiem":{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"},"w_soldier_blade":{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"},"w_knight_sword":{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"},"w_rune_saber":{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"},"w_paladin_edge":{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"},"w_black_oath":{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"},"w_iron_pike":{"type":"lance","name":"貫通突き","description":"東西南北各2マスを攻撃・攻撃力20%低下を3ターン","color":15779678,"chargeSteps":100,"range":2,"multiplier":1.35,"sound":"skillLance"},"w_royal_spear":{"type":"lance","name":"貫通突き","description":"東西南北各2マスを攻撃・攻撃力20%低下を3ターン","color":15779678,"chargeSteps":100,"range":2,"multiplier":1.35,"sound":"skillLance"},"w_bone_lance":{"type":"lance","name":"貫通突き","description":"東西南北各2マスを攻撃・攻撃力20%低下を3ターン","color":15779678,"chargeSteps":100,"range":2,"multiplier":1.35,"sound":"skillLance"},"w_drill_lance":{"type":"lance","name":"貫通突き","description":"東西南北各2マスを攻撃・攻撃力20%低下を3ターン","color":15779678,"chargeSteps":100,"range":2,"multiplier":1.35,"sound":"skillLance"},"w_dragon_lance":{"type":"lance","name":"貫通突き","description":"東西南北各2マスを攻撃・攻撃力20%低下を3ターン","color":15779678,"chargeSteps":100,"range":2,"multiplier":1.35,"sound":"skillLance"},"w_hunter_bow":{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"},"w_composite_bow":{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"},"w_blackwood_bow":{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"},"w_royal_bow":{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"},"w_siege_arbalest":{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"},"w_blackpowder_handgun":{"type":"handgun","name":"五連射","description":"前方3マス以内の敵1体へ5発・生存時に防御10%低下を3ターン","color":16755808,"chargeSteps":100,"range":3,"multiplier":0.65,"sound":"skillHandgun"},"w_rusted_greatsword":{"type":"greatsword","name":"旋風斬り","description":"周囲8マスを斬り、敵を1マス押し戻す。命中したモンスター1体につきHP10回復","color":16740978,"chargeSteps":100,"range":1,"multiplier":1.45,"sound":"skillGreatsword"},"w_executioner_blade":{"type":"greatsword","name":"旋風斬り","description":"周囲8マスを斬り、敵を1マス押し戻す。命中したモンスター1体につきHP10回復","color":16740978,"chargeSteps":100,"range":1,"multiplier":1.45,"sound":"skillGreatsword"},"w_titan_cleaver":{"type":"greatsword","name":"旋風斬り","description":"周囲8マスを斬り、敵を1マス押し戻す。命中したモンスター1体につきHP10回復","color":16740978,"chargeSteps":100,"range":1,"multiplier":1.45,"sound":"skillGreatsword"},"w_holy_greatsword":{"type":"greatsword","name":"旋風斬り","description":"周囲8マスを斬り、敵を1マス押し戻す。命中したモンスター1体につきHP10回復","color":16740978,"chargeSteps":100,"range":1,"multiplier":1.45,"sound":"skillGreatsword"},"w_grand_breaker":{"type":"greatsword","name":"旋風斬り","description":"周囲8マスを斬り、敵を1マス押し戻す。命中したモンスター1体につきHP10回復","color":16740978,"chargeSteps":100,"range":1,"multiplier":1.45,"sound":"skillGreatsword"},"w_hw_candy":{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"},"w_hw_lantern":{"type":"lance","name":"貫通突き","description":"東西南北各2マスを攻撃・攻撃力20%低下を3ターン","color":15779678,"chargeSteps":100,"range":2,"multiplier":1.35,"sound":"skillLance"},"w_hw_bat":{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"},"w_hw_coffin":{"type":"greatsword","name":"旋風斬り","description":"周囲8マスを斬り、敵を1マス押し戻す。命中したモンスター1体につきHP10回復","color":16740978,"chargeSteps":100,"range":1,"multiplier":1.45,"sound":"skillGreatsword"},"w_hw_harvest":{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"},"w_hw_emedral":{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"}}'::jsonb->combat.key;
     skill_kind:=skill->>'type';if skill_kind='twin_daggers' then skill_kind:='dual_sword';end if;
     if is_skill and (combat.key is null or skill is null) then raise exception '武器を装備してください。';end if;
     if is_skill and c.skill_steps_remaining>0 then raise exception 'スキルはあと%歩で使えます。',c.skill_steps_remaining;end if;
     if action='train' then
       dx:=12-r.x;dy:=5-r.y;distance:=abs(dx)+abs(dy);reach:=coalesce(combat.attack_range,1);
       if distance<1 or distance>reach or (dx<>0 and dy<>0) then raise exception '練習樽の正面近くまで移動してください。';end if;
       n:=case when dx>0 then 'right' when dx<0 then 'left' when dy>0 then 'down' else 'up' end;
     end if;
     reach:=case when is_skill then (skill->>'range')::integer else coalesce(combat.attack_range,1) end;
     select exists(select 1 from public.online_attack_tiles(case when is_skill then skill_kind else 'bow' end,r.x,r.y,n,reach) where tile_x=12 and tile_y=5) into hit_target;
     if action='train' and not hit_target then raise exception '間に障害物があります。';end if;
     training_damage:=case when hit_target then 5+coalesce(combat.attack_min,0)+floor(random()*(9+coalesce(combat.attack_max,0)-coalesce(combat.attack_min,0)))::integer else 0 end;
     if is_skill then
       training_damage:=greatest(0,round(training_damage*(skill->>'multiplier')::numeric))::integer*case skill_kind when 'handgun' then 5 when 'dual_sword' then 3 else 1 end;
       update public.online_characters set skill_steps_remaining=(skill->>'chargeSteps')::integer,time_stop_turns=case when skill_kind='dagger' then 5 else 0 end,hp=least(max_hp,hp+case when skill_kind='longsword' then 70 when skill_kind='greatsword' and hit_target then 10 else 0 end) where id=c.id;
       if skill_kind='dagger' then hit_target:=false;end if;
     end if;
     insert into public.online_training_hits(user_id,character_id,damage,dir,weapon_key,origin_x,origin_y,action_kind,skill_type,hit_target) values(uid,c.id,training_damage,n,case when (c.gear->>'weapon')::boolean then coalesce(c.gear->>'weapon_key','w_iron_dagger') else null end,r.x,r.y,case when is_skill then 'skill' else 'attack' end,case when is_skill then skill_kind else null end,hit_target);
     update public.online_presence set dir=n where user_id=uid;
     delete from public.online_training_hits where id<(select coalesce(max(id),0)-200 from public.online_training_hits);
   elsif action='redeem_code' then
     if not p.super_account then raise exception 'スーパーアカウント専用です。';end if;
     if payload->>'code'='19960711' then
       update public.online_characters set catalog_unlocked=true where id=c.id;
     elsif payload->>'code'='11111111' then
       update public.online_characters set hp=max_hp where id=c.id;
     else raise exception '町で使えるコードではありません。';end if;
   elsif action='claim_item' then
     if not p.super_account or not c.catalog_unlocked then raise exception 'スーパーアカウントでコードを入力してください。';end if;
     select * into cat from public.online_catalog where key=payload->>'key';
     if cat.key is null then raise exception '登録されていないアイテムです。';end if;
     if cat.category='item' then
       if coalesce((c.inventory->>cat.key)::int,0)>=9999 then raise exception 'これ以上持てません。';end if;
       update public.online_characters set inventory=jsonb_set(inventory,array[cat.key],to_jsonb(coalesce((inventory->>cat.key)::int,0)+1)) where id=c.id;
     else
       k:=cat.category;n:=case when k='armor' then substr(cat.key,7) else cat.key end;
       if k='weapon' and coalesce((payload->>'starred')::boolean,false) then n:='star_'||n;end if;
       if (c.equipment->k)?n then raise exception 'その装備はすでに持っています。';end if;
       if jsonb_array_length(c.equipment->k)>=200 then raise exception '装備の所持上限です。';end if;
       update public.online_characters set equipment=jsonb_set(equipment,array[k],(equipment->k)||jsonb_build_array(n)) where id=c.id;
     end if;
   elsif action='equip' then
     k:=payload->>'slot';v:=(payload->>'equipped')::boolean;
     if k is null or k not in ('weapon','armor','shield') or v is null then raise exception '装備を確認してください。';end if;
     n:=coalesce(payload->>'key',c.gear->>(k||'_key'),case k when 'weapon' then 'w_iron_dagger' when 'armor' then 'leather' end);
     if v and (n is null or not (c.equipment->k)?n) then raise exception '持っていない装備は使えません。';end if;
     update public.online_characters set gear=gear||jsonb_build_object(k,v,k||'_key',n),hp=least(hp,case when k='weapon' then case when v and n like 'star_%' then 150 else 100 end else max_hp end) where id=c.id;
   elsif action in ('drop_weapon','drop_equipment') then
     equipment_slot:=case when action='drop_weapon' then 'weapon' else payload->>'slot' end;
     k:=payload->>'key';idx:=(payload->>'index')::integer;
     if equipment_slot is null or equipment_slot not in ('weapon','armor','shield') or k is null or idx is null or idx<0 or idx>=jsonb_array_length(c.equipment->equipment_slot) or (c.equipment->equipment_slot->>idx) is distinct from k then raise exception 'その装備は持っていません。持ち物を開き直してください。';end if;
     if (select count(*) from public.online_ground_items where dropped_by=uid)>=50 then raise exception '落とした装備を先に拾ってください。';end if;
     if exists(select 1 from public.online_ground_items where dropped_by=uid and created_at>clock_timestamp()-interval '250 milliseconds') then raise exception '少し待ってから落としてください。';end if;
     update public.online_characters set equipment=jsonb_set(equipment,array[equipment_slot],(equipment->equipment_slot)-idx),
       gear=case when coalesce(gear->>(equipment_slot||'_key'),case equipment_slot when 'weapon' then 'w_iron_dagger' when 'armor' then 'leather' end)=k then gear||jsonb_build_object(equipment_slot,false) else gear end,
       hp=case when equipment_slot='weapon' and coalesce(gear->>'weapon_key','w_iron_dagger')=k then least(hp,100) else hp end where id=c.id;
     insert into public.online_ground_items(kind,category,x,y,dropped_by) values(case when equipment_slot='armor' then 'armor_'||k else k end,equipment_slot,r.x,r.y,uid);
   elsif action='drop_item' then
     k:=payload->>'kind';
     if k is null or k<>'potion' or coalesce((c.inventory->>k)::int,0)<1 then raise exception '落とせるアイテムがありません。';end if;
     if (select count(*) from public.online_ground_items where dropped_by=uid)>=50 then raise exception '落としたアイテムを先に拾ってください。';end if;
     if exists(select 1 from public.online_ground_items where dropped_by=uid and created_at>clock_timestamp()-interval '250 milliseconds') then raise exception '少し待ってから落としてください。';end if;
     update public.online_characters set inventory=jsonb_set(inventory,array[k],to_jsonb((inventory->>k)::int-1)) where id=c.id;
     insert into public.online_ground_items(kind,x,y,dropped_by) values(k,r.x,r.y,uid);
   elsif action='pickup_item' then
     select * into d from public.online_ground_items where id=(payload->>'drop_id')::uuid for update;
     if d.id is null then raise exception 'そのアイテムはすでに拾われています。';end if;
     if abs(d.x-r.x)+abs(d.y-r.y)>1 then raise exception 'アイテムの近くまで移動してください。';end if;
     if d.category in ('weapon','armor','shield') then
       if jsonb_array_length(c.equipment->d.category)>=200 then raise exception '武器の所持上限です。';end if;
       update public.online_characters set equipment=jsonb_set(equipment,array[d.category],(equipment->d.category)||jsonb_build_array(case when d.category='armor' then substr(d.kind,7) else d.kind end)) where id=c.id;
     else
       if coalesce((c.inventory->>d.kind)::int,0)>=9999 then raise exception 'これ以上持てません。';end if;
       update public.online_characters set inventory=jsonb_set(inventory,array[d.kind],to_jsonb(coalesce((inventory->>d.kind)::int,0)+1)) where id=c.id;
     end if;
     delete from public.online_ground_items where id=d.id;
   elsif action='use_item' then
     k:=payload->>'kind';
     if k is null or k<>'potion' or coalesce((c.inventory->>k)::int,0)<1 then raise exception 'そのアイテムは使えません。';end if;
     if c.hp>=max_hp then raise exception '体力は満タンです。';end if;
     update public.online_characters set hp=least(max_hp,hp+40),inventory=jsonb_set(inventory,array[k],to_jsonb((inventory->>k)::int-1)) where id=c.id;
   end if;
   update public.online_presence set seen_at=now() where user_id=uid;
 elsif action<>'list' then raise exception '未対応の操作です。';end if;
 select * into r from public.online_presence where user_id=uid;
 select * into c from public.online_characters where id=r.character_id and user_id=uid;
 return jsonb_build_object('characters',coalesce((select jsonb_agg(jsonb_build_object('id',id,'slot',slot,'name',name,'gender',gender,'hp',hp,'skillStepsRemaining',skill_steps_remaining,'timeStopTurns',time_stop_turns,'inventory',inventory,'gear',gear,'equipment',equipment,'catalogUnlocked',catalog_unlocked and p.super_account) order by slot) from public.online_characters where user_id=uid),'[]'),
 'active',case when c.id is null then null else jsonb_build_object('id',c.id,'slot',c.slot,'name',c.name,'gender',c.gender,'hp',c.hp,'skillStepsRemaining',c.skill_steps_remaining,'timeStopTurns',c.time_stop_turns,'inventory',c.inventory,'gear',c.gear,'equipment',c.equipment,'catalogUnlocked',c.catalog_unlocked and p.super_account) end,
 'players',coalesce((select jsonb_agg(t) from (select q.id character_id,q.name,q.gender,case when (q.gear->>'armor')::boolean then coalesce(q.gear->>'armor_key','leather') else 'leather' end armor,case when (q.gear->>'weapon')::boolean then coalesce(q.gear->>'weapon_key','w_iron_dagger') else null end weapon,case when coalesce((q.gear->>'shield')::boolean,false) then q.gear->>'shield_key' else null end shield,pres.x,pres.y,pres.dir from public.online_presence pres join public.online_characters q on q.id=pres.character_id where pres.seen_at>now()-interval '20 seconds')t),'[]'),
 'messages',coalesce((select jsonb_agg(t order by id) from(select id,name,message,character_id from public.online_messages order by id desc limit 100)t),'[]'),'drops',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'category',category,'x',x,'y',y) order by created_at,id) from public.online_ground_items),'[]'),'trainingHits',coalesce((select jsonb_agg(t order by id) from(select h.id,h.character_id,h.damage,h.dir,h.weapon_key,h.origin_x,h.origin_y,h.action_kind,h.skill_type,h.hit_target from public.online_training_hits h order by id desc limit 100)t),'[]'),'superAccount',p.super_account);
end $$;
commit;
