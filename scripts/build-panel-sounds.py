import numpy as np,wave,json
from pathlib import Path
P=Path('public/assets/online/panel-audio-v1');P.mkdir(parents=True,exist_ok=True);sr=96000

def build(name,seq):
 a=np.zeros((int(sr*1.55),2))
 for j,(start,f,length)in enumerate(seq):
  t=np.arange(int(sr*length))/sr
  # Rounded triangle plus a quiet pulse gives a handheld-RPG timbre.
  tri=sum(((-1)**k)*np.sin(2*np.pi*f*(2*k+1)*t)/(2*k+1)**2 for k in range(7))*.81
  pulse=sum(np.sin(2*np.pi*f*k*t)*np.sin(np.pi*k*.3)/k for k in range(1,9))*.14
  env=(1-np.exp(-t/.0035))*np.exp(-t/length*2.5)*np.minimum(1,(length-t)/.023)
  v=(tri+pulse)*env*.27
  pan=(-.17 if j%2==0 else .17);i=int(start*sr);n=min(len(v),len(a)-i)
  a[i:i+n,0]+=v[:n]*(1-pan);a[i:i+n,1]+=v[:n]*(1+pan)
 dry=a.copy()
 for delay,g in [(.061,.10),(.117,.06),(.183,.028)]:
  k=int(delay*sr);a[k:]+=dry[:-k,::-1]*g
 a=(a+2*np.roll(a,1,axis=0)+np.roll(a,2,axis=0))/4;a=a[::2]
 a[:100]*=np.linspace(0,1,100)[:,None];a[-2400:]*=np.linspace(1,0,2400)[:,None]
 a*=.62/np.max(np.abs(a));q=np.round(a*8388607).astype(np.int32).reshape(-1)
 b=np.column_stack([q&255,(q>>8)&255,(q>>16)&255]).astype(np.uint8).tobytes()
 with wave.open(str(P/(name+'.wav')),'wb')as w:w.setnchannels(2);w.setsampwidth(3);w.setframerate(48000);w.writeframes(b)
 print(name, '48kHz stereo 24-bit; peak',round(20*np.log10(np.max(np.abs(a)))), 'dBFS')

build('heal',[(.015,659.255,.145),(.092,987.767,.145),(.169,1318.51,.145),(.246,1174.659,.145),(.323,1567.982,.145),(.400,1975.533,.36)])
build('attack_up',[(.015,587.33,.15),(.09,880,.15),(.165,1174.66,.15),(.24,1760,.3)])
build('defense_up',[(.015,523.25,.19),(.10,659.25,.19),(.185,1046.5,.19),(.27,1318.51,.32)])
build('attack_down',[(.015,1318.51,.15),(.095,987.77,.15),(.175,659.25,.15),(.255,493.88,.25)])
build('defense_down',[(.015,1174.66,.15),(.095,783.99,.15),(.175,587.33,.15),(.255,392,.25)])
build('paralysis',[(.015,987.77,.075),(.07,1046.5,.075),(.125,987.77,.075),(.18,739.99,.16)])
