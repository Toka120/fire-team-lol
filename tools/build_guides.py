# Construit guides.json (rubrique « Lanes et principes ») à partir de contenu.py et schemas.py.
import json, sys, os, base64
sys.path.insert(0, os.path.dirname(__file__))
from contenu import THEMES, CATEGORIES
from schemas import ALL
from scenes import SCENES

out = []
for t in THEMES:
    th = dict(t)
    secs = []
    for i, sec in enumerate(t['sections']):
        d = {'titre': sec['titre'], 'texte': sec['texte'], 'schema': None}
        leg = sec['schema'][1] if sec.get('schema') else ''
        if (t['id'], i) in SCENES:
            d['schema'] = {'svg': SCENES[(t['id'], i)](), 'legende': leg, 'anime': True}
        elif sec.get('schema'):
            name, leg = sec['schema']
            d['schema'] = {'svg': ALL[name](), 'legende': leg}
        secs.append(d)
    th['sections'] = secs
    out.append(th)
ids = {t['id'] for t in out}
cats = []
for c in CATEGORIES:
    for tid, _, _ in c['themes']:
        assert tid in ids, tid
    cats.append({**c, 'themes': [{'id': tid, 'focus': f, 'conseils': cs} for tid, f, cs in c['themes']]})
# Vraie carte de la Faille (la même vue que map.riftkit.net), mise une seule fois ici :
# les visuels y font référence par « rift:map » et l'app remplace ce lien par l'image.
_here = os.path.dirname(os.path.abspath(__file__))
_rift = 'data:image/jpeg;base64,' + base64.b64encode(open(os.path.join(_here, 'assets', 'rift720.jpg'), 'rb').read()).decode()
_lane = 'data:image/jpeg;base64,' + base64.b64encode(open(os.path.join(_here, 'assets', 'lane720.jpg'), 'rb').read()).decode()
_arena = 'data:image/jpeg;base64,' + base64.b64encode(open(os.path.join(_here, 'assets', 'arena720.jpg'), 'rb').read()).decode()
assets = {'rift': _rift, 'lane': _lane, 'arena': _arena, 'rift_credit': 'Carte : vue de la Faille de map.riftkit.net · © Riot Games'}
data = {'v': 1, 'assets': assets, 'mise_a_jour': '4 novembre 2026', 'saison': '2026', 'categories': cats, 'themes': out}
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
txt = json.dumps(data, ensure_ascii=False, indent=1) + '\n'
for p in ['guides.json', 'app/renderer/guides.default.json']:
    open(os.path.join(root, p), 'w', encoding='utf-8').write(txt)
print(sum(1 for t in out for s in t['sections'] if s['schema'] and 'rift:map' in s['schema']['svg']), 'sur la vraie carte ·', len(out), 'thèmes,', sum(len(t['sections']) for t in out), 'principes,', sum(1 for t in out for s in t['sections'] if s['schema']), 'visuels dont', sum(1 for t in out for s in t['sections'] if s['schema'] and s['schema'].get('anime')), 'animés,', len(txt) // 1024, 'Ko')
