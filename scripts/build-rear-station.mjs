import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8'),root='src/online/adventure/',c=JSON.parse(read('supabase/migrations/202611230003_online_station_architecture.sql').split('$station$')[1]),base=JSON.parse(read('supabase/migrations/202611220001_online_maze_cooperation.sql').split('$maze$')[1]);
// Restore the maze south of the boss. Its original entrance must never pass through a station.
const rows=c.rows.map(r=>r.split(''));for(let y=23;y<=42;y++)for(let x=48;x<=62;x++)rows[y][x]=base.rows[y][x];
// The rear station is separate architecture, northeast of the arena. Only its north passage meets the arena.
for(let y=3;y<=20;y++)for(let x=90;x<=104;x++)rows[y][x]='.';
for(let x=54;x<=94;x++)rows[1][x]='.';for(let x=54;x<=55;x++)rows[2][x]='.';rows[2][94]='.';
c.rows=rows.map(r=>r.join(''));c.boss.rear={x:54,y:2,w:2,h:1};
c.gates.push({id:'boss_rear',x:54,y:2,w:2,h:1,key:'both',visual:{atlas:'old',frame:2,x:54.5,y:2,w:2,h:2,ground:false}});
c.railway.stations[1]={id:'boss',name:'結晶門・裏口駅',x:90,y:3,w:15,h:18,trackX:103,platformX:100,gateX:94,gateY:3,padX:102,padY:16,cream:true};
const end=c.railway.route.findIndex(p=>p.x===110&&p.y===1);c.railway.route=c.railway.route.slice(0,end+1);for(let x=109;x>=103;x--)c.railway.route.push({x,y:1});for(let y=2;y<=16;y++)c.railway.route.push({x:103,y});
c.props.find(p=>p.id==='rail_boss').x=94;c.props.find(p=>p.id==='rail_boss').y=3;c.props.find(p=>p.id==='rail_board_boss').x=103;c.props.find(p=>p.id==='rail_board_boss').y=16;
c.railway.decor=c.railway.decor.filter(p=>p.y>60);c.railway.decor.push({x:92,y:7,frame:7,w:3,h:2,solid:true},{x:92,y:11,frame:5,w:2,h:1,solid:true},{x:95,y:15,frame:5,w:2,h:1,solid:true},{x:91,y:5,frame:10,w:1,h:1,solid:true},{x:91,y:18,frame:10,w:1,h:1,solid:true},{x:96,y:5,frame:6,w:2,h:3,solid:false});
// Keep decorative collision and floor samples consistent with the restored corridor.
const hit=p=>p.x<63&&p.x+(p.w??1)>48&&p.y<43&&p.y+(p.h??1)>23;
for(const key of ['objects','solids','materials'])c[key]=[...c[key].filter(p=>!hit(p)),...base[key].filter(hit)];
for(let y=3;y<=20;y++)for(let x=90;x<=104;x++)c.materials.push({x,y,frame:0});
fs.writeFileSync(root+'floor1-maze.json',JSON.stringify(c));
fs.writeFileSync('tmp/rear-station-config.sql',"update online_adventure_config set data=$rear$"+JSON.stringify(c)+"$rear$::jsonb where id='floor1';\n");

fs.writeFileSync('supabase/migrations/202611260002_online_rear_station.sql','begin;\n'+fs.readFileSync('tmp/rear-station-config.sql','utf8')+read('scripts/rear-station-rules.sql')+'\ncommit;\n');
