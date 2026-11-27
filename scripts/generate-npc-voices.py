from pathlib import Path
import json,hashlib,argparse
parser=argparse.ArgumentParser();parser.add_argument("--only",nargs="*");args=parser.parse_args()
from voicevox_core.blocking import Onnxruntime,OpenJtalk,Synthesizer,VoiceModelFile
runtime=Path('C:/outputs/zero-emote-voice/runtime');out=Path('public/assets/online/npc-voices-v1');out.mkdir(parents=True,exist_ok=True)
s=Synthesizer(Onnxruntime.load_once(filename=str(runtime/'onnxruntime/lib/voicevox_onnxruntime.dll')),OpenJtalk(str(runtime/'dict/open_jtalk_dic_utf_8-1.11')),acceleration_mode='CPU',cpu_num_threads=4)
for model in ['0','4','12']:
 with VoiceModelFile.open(runtime/f'models/vvms/{model}.vvm') as m:s.load_voice_model(m)
clips=[('guide','やぁ。',53,.92,-.02),('merchant','いらっしゃいませ。',8,1.16,0),('barber','こんにちは。',10,1.03,.015),('lottery','いらっしゃい！',11,1.08,.02),('housing','いらっしゃい。',53,.88,-.07)]
rows=json.loads((out/'credits.json').read_text(encoding='utf-8')) if (out/'credits.json').exists() else []
for name,text,style,speed,pitch in clips:
 if args.only and name not in args.only:continue
 q=s.create_audio_query(text,style);q.speed_scale=speed;q.pitch_scale=pitch;q.intonation_scale=1.22 if name=='lottery' else .75 if style==53 else .88 if name=='merchant' else .7 if style==11 else 1.1;q.pre_phoneme_length=.015;q.post_phoneme_length=.04
 if name=='merchant' and q.accent_phrases:
  q.accent_phrases[-1].moras[-1].vowel_length*=1.2
 data=s.synthesis(q,style);file=f'{name}-v2.wav' ;(out/file).write_bytes(data);rows=[r for r in rows if r['id']!=name];rows.append(dict(id=name,file=file,text=text,style=style,credit='VOICEVOX:麒ヶ島宗麟' if style==53 else 'VOICEVOX:雨晴はう' if style==10 else 'VOICEVOX:玄野武宏' if style==11 else 'VOICEVOX:春日部つむぎ',sha256=hashlib.sha256(data).hexdigest()));print(name,flush=True)
(out/'credits.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
