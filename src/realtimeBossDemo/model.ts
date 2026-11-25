export type Point={x:number;y:number};
export type DemoWeapon='longsword'|'greatsword'|'bow'|'handgun';
export const WEAPONS={longsword:{name:'片手剣',cooldown:380,damage:26,reach:1,impact:120},greatsword:{name:'大剣',cooldown:650,damage:48,reach:1,impact:150},bow:{name:'弓',cooldown:520,damage:30,reach:7,impact:225},handgun:{name:'銃',cooldown:270,damage:13,reach:6,impact:145}};
export const STEP_MS=152,WARNING_MS=1300,SMASH_MS=3800,SMASH_HIT_MS=1800;
export const tileKey=(p:Point)=>`${p.x},${p.y}`;
const distance=(a:Point,b:Point)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export class RealtimeBossModel{
 now=0;player={x:6,y:8,hp:100,dir:{x:0,y:-1}};ally={x:10,y:8,hp:100};boss={x:6,y:3,hp:480,dir:{x:0,y:1}};
 playerStepMs=STEP_MS;bossStepMs=STEP_MS;allyStepMs=STEP_MS;
 weapon:DemoWeapon='longsword';allyActive=false;broken=new Set<string>();events:{type:string;[key:string]:any}[]=[];
 nextMove=0;nextAttack=0;nextBossMove=STEP_MS;nextBossAttack=1100;nextWarning=1800;nextAllyMove=STEP_MS;
 warning?:{tiles:Point[];at:number;hitAt:number};smash?:{at:number;hit:boolean;tiles:Point[]};smashes=0;
 attacks:{at:number;kind:'player'|'boss';target:Point;damage:number}[]=[];
 get locked(){return !!this.smash;}
 get over(){return this.boss.hp<=0||this.player.hp<=0;}
 valid(p:Point){return p.x>=1&&p.x<=11&&p.y>=1&&p.y<=9&&!this.broken.has(tileKey(p));}
 move(dx:number,dy:number){if(this.locked||this.over||this.now<this.nextMove||Math.abs(dx)+Math.abs(dy)!==1)return false;this.player.dir={x:dx,y:dy};const p={x:this.player.x+dx,y:this.player.y+dy};if(!this.valid(p)||distance(p,this.boss)===0||this.allyActive&&distance(p,this.ally)===0)return false;Object.assign(this.player,p);this.nextMove=this.now+this.playerStepMs;this.events.push({type:'player_move',...p});return true;}
 attack(){if(this.locked||this.over||this.now<this.nextAttack)return false;const w=WEAPONS[this.weapon],d=this.player.dir,dx=this.boss.x-this.player.x,dy=this.boss.y-this.player.y;this.nextAttack=this.now+w.cooldown;this.events.push({type:'player_attack',weapon:this.weapon,dir:{...d}});if(dx*d.y===dy*d.x&&dx*d.x+dy*d.y>0&&distance(this.player,this.boss)<=w.reach)this.attacks.push({at:this.now+w.impact,kind:'player',target:{...this.boss},damage:w.damage});return true;}
 damageBoss(damage:number){if(this.locked||this.over)return;const boundary=this.smashes===0?320:this.smashes===1?160:0;const before=this.boss.hp;this.boss.hp=Math.max(boundary,this.boss.hp-damage);this.events.push({type:'boss_hit',damage:before-this.boss.hp});if(boundary>0&&this.boss.hp===boundary)this.startSmash();}
 startSmash(){if(this.locked||this.over||this.smashes>=2)return;this.smashes++;this.warning=undefined;this.attacks=[];const candidates=[{x:this.boss.x-1,y:this.boss.y+1},{x:this.boss.x,y:this.boss.y+1},{x:this.boss.x+1,y:this.boss.y+1}].filter(p=>this.valid(p)&&distance(p,this.boss)!==0);this.smash={at:this.now,hit:false,tiles:candidates};this.events.push({type:'smash_start'});}
 knockback(actor:Point,other?:Point){const dx=actor.x-this.boss.x,dy=actor.y-this.boss.y;const dirs=Math.abs(dx)>Math.abs(dy)?[[Math.sign(dx)||1,0],[0,Math.sign(dy)||1],[0,-1],[-1,0],[1,0]]:[[0,Math.sign(dy)||1],[Math.sign(dx)||1,0],[0,1],[-1,0],[1,0]];for(const [x,y]of dirs){const p={x:actor.x+x,y:actor.y+y};if(this.valid(p)&&distance(p,this.boss)>0&&(!other||distance(p,other)>0)){Object.assign(actor,p);return;}}}
 update(dt:number){this.now+=Math.max(0,Math.min(dt,50));if(this.over)return;
  if(this.smash){const s=this.smash;if(!s.hit&&this.now-s.at>=SMASH_HIT_MS){s.hit=true;this.knockback(this.player,this.allyActive?this.ally:undefined);if(this.allyActive)this.knockback(this.ally,this.player);const options=[...s.tiles,...[[-1,0],[1,0],[0,-1],[-1,-1],[1,-1],[0,2],[-2,0],[2,0]].map(([x,y])=>({x:this.boss.x+x,y:this.boss.y+y}))];s.tiles=[];for(const p of options)if(this.valid(p)&&distance(p,this.boss)>0&&distance(p,this.player)>0&&(!this.allyActive||distance(p,this.ally)>0)&&!s.tiles.some(t=>distance(t,p)===0)){s.tiles.push(p);if(s.tiles.length===3)break;}for(const p of s.tiles)this.broken.add(tileKey(p));this.events.push({type:'smash_impact',tiles:s.tiles});}if(this.now-s.at>=SMASH_MS){this.smash=undefined;this.nextBossMove=this.now+600;this.nextBossAttack=this.now+900;this.nextWarning=this.now+1500;this.nextAllyMove=this.now+this.allyStepMs;this.nextMove=this.now;this.nextAttack=this.now;this.events.push({type:'smash_end'});}return;}
  const ready=this.attacks.filter(a=>a.at<=this.now);this.attacks=this.attacks.filter(a=>a.at>this.now);for(const a of ready){if(a.kind==='player'){if(distance(a.target,this.boss)<=1)this.damageBoss(a.damage);}else if(distance(a.target,this.player)===0)this.hurt(9);if(this.locked||this.over)return;}
  if(this.warning&&this.now>=this.warning.hitAt){if(this.warning.tiles.some(p=>distance(p,this.player)===0))this.hurt(25);this.events.push({type:'area_hit',tiles:this.warning.tiles});this.warning=undefined;}
  if(this.now>=this.nextWarning){const p=this.player;this.warning={tiles:[{x:p.x,y:p.y},{x:p.x+1,y:p.y},{x:p.x-1,y:p.y},{x:p.x,y:p.y+1},{x:p.x,y:p.y-1}].filter(p=>this.valid(p)),at:this.now,hitAt:this.now+WARNING_MS};this.nextWarning=this.now+3300;}
  if(this.now>=this.nextBossMove){this.nextBossMove=this.now+this.bossStepMs;const dx=this.player.x-this.boss.x,dy=this.player.y-this.boss.y;this.boss.dir=Math.abs(dx)>Math.abs(dy)?{x:Math.sign(dx),y:0}:{x:0,y:Math.sign(dy)};if(distance(this.player,this.boss)>1){const options=[{x:this.boss.x+Math.sign(dx),y:this.boss.y},{x:this.boss.x,y:this.boss.y+Math.sign(dy)}].filter(p=>this.valid(p)&&distance(p,this.boss)===1&&distance(p,this.player)>0&&(!this.allyActive||distance(p,this.ally)>0));options.sort((a,b)=>distance(a,this.player)-distance(b,this.player));if(options[0]){Object.assign(this.boss,options[0]);this.events.push({type:'boss_move',...options[0]});}}}
  if(this.now>=this.nextBossAttack){this.nextBossAttack=this.now+1050;if(distance(this.player,this.boss)===1){this.attacks.push({at:this.now+230,kind:'boss',target:{...this.player},damage:9});this.events.push({type:'boss_attack'});}}
  if(this.allyActive&&this.now>=this.nextAllyMove){this.nextAllyMove=this.now+this.allyStepMs;const p={x:this.ally.x===10?9:10,y:8};if(this.valid(p)&&distance(p,this.player)>0&&distance(p,this.boss)>0){Object.assign(this.ally,p);this.events.push({type:'ally_move',...p});}}
 }
 hurt(damage:number){this.player.hp=Math.max(0,this.player.hp-damage);this.events.push({type:'player_hit',damage});}
 drain(){return this.events.splice(0);}
}
