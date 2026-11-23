from pathlib import Path
import re,json,wave,io,array,hashlib,argparse
from voicevox_core.blocking import Onnxruntime,OpenJtalk,Synthesizer,VoiceModelFile
parser=argparse.ArgumentParser();parser.add_argument('--runtime',type=Path,required=True);args=parser.parse_args()
root=Path(__file__).resolve().parents[1];runtime=args.runtime
out=root/'public/assets/online/emotes-voice-v1';out.mkdir(parents=True,exist_ok=True)
s=Synthesizer(Onnxruntime.load_once(filename=str(runtime/'onnxruntime/lib/voicevox_onnxruntime.dll')),OpenJtalk(str(runtime/'dict/open_jtalk_dic_utf_8-1.11')),acceleration_mode='CPU',cpu_num_threads=4)
with VoiceModelFile.open(runtime/'models/vvms/0.vvm') as model:s.load_voice_model(model)
rows=re.findall(r"id:'([^']+)',label:'([^']+)'",(root/'src/online/emotes.ts').read_text(encoding='utf8'))
manifest={'credit':'VOICEVOX:春日部つむぎ','engine':'VOICEVOX Core 0.17.1','model':'0.vvm / 春日部つむぎ ノーマル / style 8','terms':['https://voicevox.hiroshiba.jp/term/','https://tsumugi-official.studio.site/rule','https://tsumugi-official.studio.site/rule2'],'clips':[]}
for id,text in rows:
 q=s.create_audio_query(text,8);q.speed_scale=1.04;q.pitch_scale=0.025;q.intonation_scale=1.15;q.pre_phoneme_length=0.06;q.post_phoneme_length=0.12
 raw=s.synthesis(q,8)
 with wave.open(io.BytesIO(raw),'rb') as f:
  rate=f.getframerate();samples=array.array('h',f.readframes(f.getnframes()))
 peak=max(abs(x) for x in samples);gain=min(2.0,0.82*32767/max(1,peak));samples=array.array('h',(round(x*gain) for x in samples))
 file=out/(id+'.wav')
 with wave.open(str(file),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(samples.tobytes())
 row={'id':id,'text':text,'seconds':round(len(samples)/rate,3),'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()};manifest['clips'].append(row);print(id,row['seconds'],flush=True)
(out/'credits.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
