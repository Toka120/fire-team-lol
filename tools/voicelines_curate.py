# Garde les répliques bien transcrites et applique les corrections relues à la main.
# Entrée : tools/voicelines_raw.json (sortie de voicelines.py)  ->  Sortie : app/voicelines.json { "103": { "choose": "…", "ban": "…" } }
import json, re
raw = json.load(open('tools/voicelines_raw.json'))
FIX = {  # (clé champion, type) : texte corrigé, relu à l'écoute du sens
    ('34', 'choose'): "À tire-d'aile.",
    ('89', 'choose'): "L'aube se lève.",
    ('56', 'ban'): 'Vous avez peur du noir ?',
    ('56', 'choose'): 'Soumettez-vous aux ténèbres !',
    ('119', 'choose'): 'Bienvenue dans la ligue de Draven.',
    ('120', 'choose'): 'Admirez la puissance des Îles obscures.',
    ('147', 'choose'): 'Allons changer le monde !',
    ('4', 'choose'): 'Dame Chance nous sourit...',
}
KEEP = {('60', 'ban'), ('81', 'choose'), ('114', 'ban'), ('104', 'choose'), ('54', 'choose'), ('127', 'ban'), ('102', 'ban'),
        ('91', 'ban'), ('19', 'ban'), ('8', 'ban'), ('134', 'ban'), ('145', 'ban'), ('526', 'ban'),
        ('90', 'choose'), ('90', 'ban'), ('101', 'choose'), ('63', 'choose'), ('105', 'choose'), ('121', 'choose'), ('54', 'ban'),
        ('20', 'choose'), ('107', 'choose'), ('35', 'ban'), ('14', 'ban'), ('91', 'choose'), ('23', 'ban'), ('106', 'choose')}
DROP = {('31', 'ban'), ('85', 'choose'), ('950', 'ban'), ('518', 'ban'), ('78', 'ban'), ('72', 'ban'), ('163', 'ban'), ('67', 'ban'), ('101', 'ban')}
out = {}
for key, v in raw.items():
    for kind, t in v.items():
        if not isinstance(t, list) or not t[0]: continue
        text, lp, ns = t
        k = (key, kind)
        if k in DROP: continue
        good = (lp >= -0.45 and ns < 0.5) or k in KEEP or k in FIX
        if not good or len(text) < 6: continue
        letters = re.sub(r'[^A-Za-zÀ-ÿ]', '', text)
        if letters.isupper() and len(letters) > 3 and k not in FIX: continue   # cris transcrits en majuscules
        if re.search(r'(.)\1{3,}', text) or re.search(r'abonnez|sous-titr|amara|générique', text, re.I): continue
        out.setdefault(key, {})[kind] = FIX.get(k, text)
json.dump(out, open('app/voicelines.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('répliques gardées', sum(len(v) for v in out.values()), 'champions', len(out))
