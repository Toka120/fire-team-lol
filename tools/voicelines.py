# Transcrit les répliques audio françaises (sélection et bannissement) de chaque champion,
# pour que le mode « Phrase » affiche exactement la phrase entendue. Résultat : app/voicelines.json
#   { "103": { "choose": "texte…", "ban": "texte…" }, ... }   (clé = numéro du champion)
import json, os, sys, subprocess, urllib.request, concurrent.futures as cf
import numpy as np
from faster_whisper import WhisperModel

OUT = sys.argv[1] if len(sys.argv) > 1 else 'voicelines.json'
MODEL = os.environ.get('WHISPER', 'medium')
D = '/tmp/vo'
os.makedirs(D, exist_ok=True)
op = urllib.request.build_opener(); op.addheaders = [('User-Agent', 'FIRE-LoL-tools/1.0')]; urllib.request.install_opener(op)
ver = json.load(urllib.request.urlopen('https://ddragon.leagueoflegends.com/api/versions.json'))[0]
champs = json.load(urllib.request.urlopen(f'https://ddragon.leagueoflegends.com/cdn/{ver}/data/fr_FR/champion.json'))['data']
BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/fr_fr/v1'

def dl(job):
    key, kind = job
    p = f'{D}/{kind}_{key}.ogg'
    if not os.path.exists(p) or os.path.getsize(p) == 0:
        try: open(p, 'wb').write(urllib.request.urlopen(f'{BASE}/champion-{kind}-vo/{key}.ogg', timeout=60).read())
        except Exception: open(p, 'wb').write(b'')
    return p
jobs = [(c['key'], k) for c in champs.values() for k in ('choose', 'ban')]
with cf.ThreadPoolExecutor(16) as ex: list(ex.map(dl, jobs))

prev = {}
if os.path.exists(OUT):
    try: prev = json.load(open(OUT))
    except Exception: prev = {}
model = WhisperModel(MODEL, device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 2)
names = ', '.join(c['name'] for c in champs.values())
out = prev
for i, (key, kind) in enumerate(jobs):
    if isinstance(out.get(key, {}).get(kind), list): continue
    p = f'{D}/{kind}_{key}.ogg'
    txt = ''
    if os.path.getsize(p) > 0:
        pcm = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', p, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
        audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0
        segs, _ = model.transcribe(audio, language='fr', beam_size=5, vad_filter=False, condition_on_previous_text=False)
        segs = list(segs)
        txt = ' '.join(s.text.strip() for s in segs).strip()
        # confiance : moyenne des log-probabilités (proche de 0 = sûr), et probabilité de « pas de parole »
        lp = min((s.avg_logprob for s in segs), default=-9)
        ns = max((s.no_speech_prob for s in segs), default=1)
        txt = [txt, round(lp, 2), round(ns, 2)]
    out.setdefault(key, {})[kind] = txt
    if i % 20 == 0:
        print(i, len(jobs), key, kind, txt, file=sys.stderr, flush=True)
        json.dump(out, open(OUT, 'w'), ensure_ascii=False, indent=0)
json.dump(out, open(OUT, 'w'), ensure_ascii=False, indent=0)
print('fini', sum(1 for v in out.values() for t in v.values() if t and t[0]))
