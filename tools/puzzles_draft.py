#!/usr/bin/env python3
"""Puzzles de draft « Contrez la composition adverse » (onglet Draft de FIRE).

Chaque semaine (GitHub Actions), on relève sur les pages publiques de LoLalytics (Émeraude+, patch en cours) :
  1. les champions les plus joués de chaque rôle (les adversaires de lane d'un champion « repère » et leur nombre de parties) ;
  2. pour chacun, ses taux de victoire contre chaque adversaire de sa lane (minimum 100 parties).
Puis on fabrique des puzzles : une compo adverse complète, 3 champions alliés déjà choisis, 2 rôles à remplir
et 4 duos proposés. La bonne réponse est le duo qui gagne le plus souvent contre ses deux adversaires directs,
avec un écart net sur les 3 autres pour qu'il n'y ait pas de doute.

Résultat : puzzles-draft.json à la racine du dépôt (servi par GitHub Pages).
Usage : python3 tools/puzzles_draft.py [--pool 20] [--n 80]
"""
import html
import json
import random
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'puzzles-draft.json'
LANES = ['top', 'jungle', 'middle', 'bottom', 'support']
# Un champion très joué par rôle : sa page « counters » liste tous les adversaires de la lane avec leur nombre de parties.
REPERES = {'top': ['darius', 'garen', 'sett'], 'jungle': ['leesin', 'graves', 'viego'], 'middle': ['ahri', 'yasuo', 'sylas'],
           'bottom': ['jinx', 'caitlyn', 'ezreal'], 'support': ['thresh', 'nautilus', 'lulu']}
UA = {'User-Agent': 'FIRE-LoL puzzles (outil d equipe, 1 releve par semaine)', 'Accept-Language': 'en'}


def get(url, tries=3):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
                return r.read().decode('utf-8', 'ignore')
        except Exception as e:  # noqa: BLE001
            if k == tries - 1:
                raise
            print('  nouvel essai', url, e, file=sys.stderr)
            time.sleep(5 * (k + 1))


ROW = re.compile(r'text-xs text-[\w-]+"><!--t=\w+-->([\d.]+)<!---->%<div class="text-cyan-200">VS</div></div>.*?champx46/([a-z0-9]+)\.webp'
                 r'.*?alt="([^"]+)".*?Δ<sub>1</sub> (-?[\d.]+)</span> • <span[^>]*>Δ<sub>2</sub> (-?[\d.]+)</span>.*?([\d,]+) Games', re.S)


def counters(slug, lane):
    """Taux de victoire de `slug` (dans `lane`) contre chaque adversaire de la même lane."""
    s = get(f'https://lolalytics.com/lol/{slug}/counters/?lane={lane}')
    patch = (re.search(r'Patch (\d+\.\d+)', s) or [None, ''])[1]
    out = {}
    for wr, opp, name, d1, d2, games in ROW.findall(s):
        out[opp] = {'wr': float(wr), 'd2': float(d2), 'n': int(games.replace(',', '')), 'name': html.unescape(name)}
    return out, patch


def ddragon():
    v = json.loads(get('https://ddragon.leagueoflegends.com/api/versions.json'))[0]
    en = json.loads(get(f'https://ddragon.leagueoflegends.com/cdn/{v}/data/en_US/champion.json'))['data']
    fr = json.loads(get(f'https://ddragon.leagueoflegends.com/cdn/{v}/data/fr_FR/champion.json'))['data']
    norm = lambda x: re.sub(r'[^a-z0-9]', '', x.lower())
    m = {}
    for cid, c in en.items():
        for k in {norm(cid), norm(c['name']), norm(c['name'].split(' ')[0])}:
            m.setdefault(k, cid)
    m['wukong'] = 'MonkeyKing'
    names = {cid: fr[cid]['name'] for cid in fr}
    return v, m, names


def main():
    args = sys.argv[1:]
    pool_n = int(args[args.index('--pool') + 1]) if '--pool' in args else 20
    n_puz = int(args[args.index('--n') + 1]) if '--n' in args else 80
    v, idof, names = ddragon()
    patch = ''
    # 1. Champions les plus joués par rôle
    pools = {}
    for lane in LANES:
        seen = {}
        for rep in REPERES[lane]:
            try:
                rows, patch = counters(rep, lane)
            except Exception as e:  # noqa: BLE001
                print('repère indisponible', rep, e, file=sys.stderr)
                continue
            for o, x in rows.items():
                seen[o] = seen.get(o, 0) + x['n']
            seen[rep] = seen.get(rep, 0) + max([x['n'] for x in rows.values()] or [0])
            time.sleep(1.5)
        pools[lane] = [o for o, _ in sorted(seen.items(), key=lambda kv: -kv[1]) if o in idof][:pool_n]
        print(lane, pools[lane], file=sys.stderr)
    # 2. Matchups de chaque champion du pool
    mx = {lane: {} for lane in LANES}
    for lane in LANES:
        for slug in pools[lane]:
            try:
                rows, p = counters(slug, lane)
                patch = patch or p
                mx[lane][slug] = rows
            except Exception as e:  # noqa: BLE001
                print('matchups indisponibles', slug, lane, e, file=sys.stderr)
            time.sleep(1.5)
    # 3. Puzzles
    rnd = random.Random(f'{patch}-{time.strftime("%G-%V")}')
    puzzles, tries = [], 0
    vs = lambda lane, a, b: (mx[lane].get(a) or {}).get(b)
    while len(puzzles) < n_puz and tries < 20000:
        tries += 1
        red = {lane: rnd.choice(pools[lane]) for lane in LANES}
        if len(set(red.values())) < 5:
            continue
        open_ = sorted(rnd.sample(LANES, 2), key=LANES.index)
        blue = {}
        used = set(red.values())
        for lane in LANES:
            if lane in open_:
                continue
            c = rnd.choice([x for x in pools[lane] if x not in used])
            blue[lane] = c
            used.add(c)
        r1, r2 = open_
        c1 = [(a, vs(r1, a, red[r1])) for a in pools[r1] if a not in used and vs(r1, a, red[r1])]
        c2 = [(b, vs(r2, b, red[r2])) for b in pools[r2] if b not in used and vs(r2, b, red[r2])]
        if len(c1) < 4 or len(c2) < 4:
            continue
        pairs = [(a, b, x['wr'] + y['wr'] - 100) for a, x in c1 for b, y in c2 if a != b]
        pairs.sort(key=lambda p: -p[2])
        best = pairs[0]
        # 3 autres duos nettement moins bons (au moins 3 points d'écart) et pas tous du même champion.
        others = [p for p in pairs if p[2] <= best[2] - 3]
        if len(others) < 3:
            continue
        pick = []
        for p in rnd.sample(others[: max(12, len(others) // 2)], min(len(others), 12)):
            if len(pick) == 3:
                break
            if sum(1 for q in pick + [best] if q[0] == p[0] or q[1] == p[1]) >= 2:
                continue
            pick.append(p)
        if len(pick) < 3:
            continue
        opts = pick + [best]
        rnd.shuffle(opts)
        ent = lambda lane, slug: {'id': idof[slug], 'nom': names.get(idof[slug], slug)}
        puzzles.append({
            'id': f'{patch}-{len(puzzles) + 1}',
            'ouverts': open_,
            'bleu': {lane: ent(lane, c) for lane, c in blue.items()},
            'rouge': {lane: ent(lane, c) for lane, c in red.items()},
            'choix': [{'a': {**ent(r1, a), 'wr': vs(r1, a, red[r1])['wr'], 'n': vs(r1, a, red[r1])['n']},
                       'b': {**ent(r2, b), 'wr': vs(r2, b, red[r2])['wr'], 'n': vs(r2, b, red[r2])['n']},
                       'score': round(sc, 2)} for a, b, sc in opts],
            'bon': opts.index(best),
        })
    data = {'source': 'LoLalytics', 'niveau': 'Émeraude+', 'patch': patch, 'ddragon': v,
            'genere': time.strftime('%Y-%m-%d'), 'puzzles': puzzles}
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'{len(puzzles)} puzzles (patch {patch}) -> {OUT}', file=sys.stderr)
    if len(puzzles) < 20:
        sys.exit('trop peu de puzzles : la page de LoLalytics a peut-être changé')


if __name__ == '__main__':
    main()
