import fs from 'node:fs';
import {MONSTER_DEFS} from '../src/data';
import {WEAPON_ATTACK_SPEED} from '../src/online/adventure/combatProfiles';
const profiles=Object.fromEntries(MONSTER_DEFS.map(m=>[m.key,{behavior:m.behavior,ranged:!!m.ranged,wallPass:!!m.wallPass,gimmick:m.gimmick??'',speed:m.behavior==='slow'?65:m.key==='m_bat'||m.key==='m_dark_ninja'?115:m.ranged?85:90}]));
fs.writeFileSync('scripts/turn-profiles.json',JSON.stringify({monsters:profiles,weapons:WEAPON_ATTACK_SPEED}));
