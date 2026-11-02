"""Local neural TTS with Kokoro-82M (Apache-2.0), American male voice. Usage: python tts_kokoro.py scenes.json audio_dir [voice]"""
import json, sys, numpy as np, soundfile as sf
from kokoro import KPipeline
scenes = json.load(open(sys.argv[1], encoding='utf-8'))['scenes']
out = sys.argv[2]; voice = sys.argv[3] if len(sys.argv) > 3 else 'am_michael'
p = KPipeline(lang_code='a')
dur = {}
for s in scenes:
    parts = [a.numpy() if hasattr(a, 'numpy') else a for _, _, a in p(s['voiceover'], voice=voice, speed=0.97, split_pattern=r'(?<=[.!?])\s+')]
    # short natural pause (0.25 s) between sentences
    gap = np.zeros(int(24000 * 0.32), dtype=np.float32)
    def trim(a, th=0.012, keep=int(24000*0.05)):
        idx = np.where(np.abs(a) > th)[0]
        return a[max(0, idx[0]-keep): idx[-1]+keep] if len(idx) else a
    parts = [trim(a) for a in parts]
    seq = []
    for a in parts: seq += [a, gap]
    audio = np.concatenate(seq[:-1])
    sf.write(f"{out}/{s['id']}.wav", audio, 24000, subtype='PCM_16')
    dur[s['id']] = round(len(audio) / 24000, 2)
    print(s['id'], dur[s['id']], flush=True)
json.dump(dur, open(f'{out}/durations.json', 'w'), indent=1)
