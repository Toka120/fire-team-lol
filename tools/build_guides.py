# Construit guides.json (rubrique « Lanes et principes ») à partir de contenu.py et schemas.py.
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from contenu import THEMES
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
data = {'v': 1, 'mise_a_jour': '4 novembre 2026', 'saison': '2026', 'themes': out}
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
txt = json.dumps(data, ensure_ascii=False, indent=1) + '\n'
for p in ['guides.json', 'app/renderer/guides.default.json']:
    open(os.path.join(root, p), 'w', encoding='utf-8').write(txt)
print(len(out), 'thèmes,', sum(len(t['sections']) for t in out), 'principes,', sum(1 for t in out for s in t['sections'] if s['schema']), 'visuels dont', sum(1 for t in out for s in t['sections'] if s['schema'] and s['schema'].get('anime')), 'animés,', len(txt) // 1024, 'Ko')
