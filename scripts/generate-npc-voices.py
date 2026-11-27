from pathlib import Path
import json,hashlib
from voicevox_core.blocking import Onnxruntime,OpenJtalk,Synthesizer,VoiceModelFile
runtime=Path('C:/outputs/zero-emote-voice/runtime');out=Path('public/assets/online/npc-voices-v1');out.mkdir(parents=True,exist_ok=True)
s=Synthesizer(Onnxruntime.load_once(filename=str(runtime/'onnxruntime/lib/voicevox_onnxruntime.dll')),OpenJtalk(str(runtime/'dict/open_jtalk_dic_utf_8-1.11')),acceleration_mode='CPU',cpu_num_threads=4)
for model in ['0','4']:
 with VoiceModelFile.open(runtime/f'models/vvms/{model}.vvm') as m:s.load_voice_model(m)
clips=[('guide','やあ。よく来たね。',11,.80,-.13),('merchant','いらっしゃいませ！',8,1.05,.02),('barber','こんにちは。',8,.98,-.02),('lottery','運だめしは、いかが？',8,1.04,.01),('housing','住まいを、お探しかな？',11,.95,-.04)]
rows=[]
for name,text,style,speed,pitch in clips:
 q=s.create_audio_query(text,style);q.speed_scale=speed;q.pitch_scale=pitch;q.intonation_scale=.7 if style==11 else 1.1;q.pre_phoneme_length=.03;q.post_phoneme_length=.06
 data=s.synthesis(q,style);(out/f'{name}.wav').write_bytes(data);rows.append(dict(id=name,text=text,credit='VOICEVOX:玄野武宏' if style==11 else 'VOICEVOX:春日部つむぎ',sha256=hashlib.sha256(data).hexdigest()));print(name,flush=True)
(out/'credits.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
