import fs from 'node:fs';
const rate=44100;
for(const kind of ['equip','jingle']){
 const duration=kind==='equip'?.34:.4,n=Math.round(rate*duration),b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);
 for(let i=0;i<n;i++){const t=i/rate;let v=0;if(kind==='equip'){for(const f of [1800,2790,4270,6150])v+=Math.sin(2*Math.PI*(f*t+900*t*t))*Math.exp(-t*13)*.12;v+=Math.sin(2*Math.PI*750*t*t*100)*Math.exp(-(((t-.05)/.032)**2))*.08;}else for(const [f,start] of [[1568,0],[2350,.055],[3136,.105]]){const d=t-start;if(d>=0)v+=Math.sin(2*Math.PI*f*d)*Math.exp(-d*16)*.22;}
  v*=Math.min(1,t/.004)*Math.min(1,(duration-t)/.025);b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*28000),44+i*2);
 }
 fs.writeFileSync(`public/assets/online/equipment-${kind}-v1.wav`,b);console.log(kind,n/rate+' seconds; generated without playback');
}

