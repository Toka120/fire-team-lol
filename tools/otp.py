#!/usr/bin/env python3
"""One-tricks (rubrique POOL › One-tricks de FIRE) : les meilleurs joueurs de chaque champion en Corée et en Europe.

Chaque semaine (GitHub Actions), on relève les pages publiques de LoLalytics :
- le classement de chaque champion (« leaderboard ») en Corée (kr) et en Europe de l'Ouest (euw) :
  joueurs Diamant IV et plus, plus de 50 % de victoires et au moins 50 parties sur le champion en 90 jours ;
- la page « build » du champion en Master+ : sorts d'invocateur, runes, objets de départ, build principal, ordre des sorts.

Résultat : otp.json à la racine du dépôt (servi par GitHub Pages).
Usage : python3 tools/otp.py [Irelia Ahri …]   (sans argument : tous les champions)
"""
import html
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'otp.json'
REGIONS = ['kr', 'euw']
TOP = 10
UA = {'User-Agent': 'FIRE-LoL one-tricks (outil d equipe, 1 releve par semaine)', 'Accept-Language': 'en'}


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


def nocomment(s):
    return re.sub(r'<!--.*?-->', '', s, flags=re.S)


ROW = re.compile(r'<div class="flex h-\[52px\] justify-between[^"]*"')


def leaderboard(s):
    out = []
    for row in ROW.split(nocomment(s))[1:]:
        name = re.search(r'<a href="([^"]*)">([^<]+)</a>', row)
        emb = re.search(r'emblem40/([a-z]+)\.webp', row)
        div = re.search(r'emblem40/[^>]*>\s*<div[^>]*>([^<]+)</div>', row)
        reg = re.search(r'region35/([a-z0-9]+)\.webp', row)
        wr = re.search(r'>([\d.]+)%</div>', row)
        games = re.search(r'sm:flex">(\d[\d,]*)</div>', row)
        if not (name and wr and games):
            continue
        lanes = [(l, int(n)) for l, n in re.findall(r'alt="([a-z]+) lane"[^>]*>x (\d+)', row)]
        out.append({
            'n': html.unescape(name.group(2)).strip(),
            't': emb.group(1) if emb else '', 'd': (div.group(1).strip() if div else ''),
            'r': reg.group(1) if reg else '',
            'wr': float(wr.group(1)), 'g': int(games.group(1).replace(',', '')),
            'l': [l for l, _ in sorted(lanes, key=lambda x: -x[1])][:2],
        })
        if len(out) >= TOP:
            break
    return out


def build(s):
    s = nocomment(s)
    imgs = lambda kind, a=0, b=None: [(m.start(), m.group(1), m.group(0)) for m in re.finditer(r'<img[^>]*%s/(\d+)\.webp[^>]*>' % kind, s[a:b] if b else s[a:])]
    out = {}
    i = s.find('Summoner Spells')
    if i > 0:
        out['spells'] = [x[1] for x in imgs('spell64', i)[:2]]
    out['runes'] = [x[1] for x in imgs('rune68') if 'grayscale' not in x[2]][:6]
    out['shards'] = [x[1] for x in imgs('statmod32') if 'grayscale' not in x[2]][:3]

    def section(label, n):
        j = s.find('>' + label + '<')
        if j < 0:
            j = s.find(label + '<')
        if j < 0:
            return []
        k = s.find('mb-1 text-center text-sm', j + 10)
        return [x[1] for x in imgs('item64', j, k if k > 0 else j + 20000)][:n]
    out['start'] = section('Starting Items', 3)
    out['core'] = section('Core Build', 3)
    out['i4'] = section('Item 4', 2)
    j = s.find('Skill Priority')
    if j > 0:
        out['skills'] = [m.group(1).split('_')[-1].upper() for m in re.finditer(r'<img[^>]*?src="[^"]*skill68/([a-z0-9_]+)\.webp"', s[j:j + 20000])][:3]
    patch = re.search(r'Patch (\d+\.\d+)', s)
    return out, (patch.group(1) if patch else '')


def ddragon():
    v = json.loads(get('https://ddragon.leagueoflegends.com/api/versions.json'))[0]
    en = json.loads(get(f'https://ddragon.leagueoflegends.com/cdn/{v}/data/en_US/champion.json'))['data']
    # Même adresse que la rubrique Matchups de FIRE : l'identifiant Data Dragon en minuscules (Wukong à part).
    return [(cid, 'wukong' if cid == 'MonkeyKing' else cid.lower()) for cid in en]


def main():
    champs = ddragon()
    only = set(sys.argv[1:])
    if only:
        champs = [c for c in champs if c[0] in only]
    old = {}
    if OUT.exists() and not only:
        try:
            old = json.loads(OUT.read_text(encoding='utf-8')).get('champs', {})
        except ValueError:
            old = {}
    data, patch, n = {}, '', 0
    for cid, slug in champs:
        c = {}
        for region in REGIONS:
            try:
                c[region] = leaderboard(get(f'https://lolalytics.com/lol/{slug}/leaderboard/?region={region}'))
                n += len(c[region])
            except Exception as e:  # noqa: BLE001
                print('échec', cid, region, e, file=sys.stderr)
                c[region] = (old.get(cid) or {}).get(region, [])
            time.sleep(1.2)
        try:
            c['build'], p = build(get(f'https://lolalytics.com/lol/{slug}/build/?tier=master_plus'))
            patch = patch or p
        except Exception as e:  # noqa: BLE001
            print('échec build', cid, e, file=sys.stderr)
            c['build'] = (old.get(cid) or {}).get('build', {})
        time.sleep(1.2)
        data[cid] = c
        print(cid, len(c['kr']), len(c['euw']), c['build'].get('core'), file=sys.stderr)
    if n < (20 if only else 500):
        print('trop peu de données, fichier non modifié', file=sys.stderr)
        sys.exit(1)
    out = {'patch': patch, 'maj': time.strftime('%Y-%m-%d'), 'source': 'LoLalytics', 'regions': REGIONS, 'champs': data}
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('ok', n, 'joueurs, patch', patch, file=sys.stderr)


if __name__ == '__main__':
    main()
