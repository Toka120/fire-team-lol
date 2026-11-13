#!/usr/bin/env python3
"""Tier list méta (rubrique Draft de FIRE) : Corée et Europe de l'Ouest, par lane et par elo.

Chaque jour (GitHub Actions), on relève les pages publiques « tier list » de LoLalytics :
2 régions × 6 niveaux d'elo × 5 lanes. Pour chaque lane, les champions affichés (les mieux classés) avec
leur tier (S+, S, A…), taux de victoire, écart avec la moyenne, taux de pick et de ban, nombre de parties.

Résultat : tierlist.json à la racine du dépôt (servi par GitHub Pages).
Usage : python3 tools/tierlist.py
"""
import html
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'tierlist.json'
REGIONS = ['kr', 'euw']
ELOS = ['all', 'gold_plus', 'platinum_plus', 'emerald_plus', 'diamond_plus', 'master_plus']
LANES = ['top', 'jungle', 'middle', 'bottom', 'support']
UA = {'User-Agent': 'FIRE-LoL tierlist (outil d equipe, 1 releve par jour)', 'Accept-Language': 'en'}


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


ROW_SPLIT = re.compile(r'<div class="flex h-\[52px\][^"]*"')
NUM = r'(-?[\d.,]+)'


def cell(row, key):
    """Texte d'une colonne (q:key="N") d'une ligne, sans balises ni commentaires."""
    m = re.search(r'q:key="%s">(.*?)</div>' % key, row, re.S)
    if not m:
        return ''
    t = re.sub(r'<!--.*?-->', '', m.group(1))
    return html.unescape(re.sub(r'<[^>]+>', ' ', t)).strip()


def parse(s):
    rows = []
    parts = ROW_SPLIT.split(s)[1:]
    for row in parts:
        slug = re.search(r'href="/lol/([a-z0-9]+)/build/', row)
        name = re.search(r'alt="([^"]+)" data-id=', row)
        tier = re.search(r'q:key="3">.*?-->([A-Z][+-]?)<!--', row, re.S)
        lane_rate = re.search(r'alt="[a-z]+ lane"[^>]*>(?:<!--/qv-->)?([\d.]+)</div>', row)
        wr = re.search(r'q:key="5">.*?>([\d.]+)<!--t=', row, re.S)
        dm = re.search(r'q:key="5">.*?<span class="mt-\[2px\][^>]*>(?:<!--t=\w+-->)?([+-]?)<!---->([\d.]+)</span>', row, re.S)
        if not (slug and name and tier and wr):
            continue
        try:
            delta = float(dm.group(1) + dm.group(2)) if dm else None
            rows.append({
                'slug': slug.group(1), 'name': html.unescape(name.group(1)), 'tier': tier.group(1),
                'wr': float(wr.group(1)), 'd': delta,
                'lane': float(lane_rate.group(1)) if lane_rate else None,
                'pick': float(cell(row, 6) or 0), 'ban': float(cell(row, 7) or 0),
                'games': int((cell(row, 9) or '0').replace(',', '')),
            })
        except ValueError:
            continue
    patch = (re.search(r'Patch (\d+\.\d+)', s) or [None, ''])[1]
    return rows, patch


def ddragon_ids():
    v = json.loads(get('https://ddragon.leagueoflegends.com/api/versions.json'))[0]
    en = json.loads(get(f'https://ddragon.leagueoflegends.com/cdn/{v}/data/en_US/champion.json'))['data']
    fr = json.loads(get(f'https://ddragon.leagueoflegends.com/cdn/{v}/data/fr_FR/champion.json'))['data']
    norm = lambda x: re.sub(r'[^a-z0-9]', '', x.lower())
    m = {}
    for cid, c in en.items():
        for k in {norm(cid), norm(c['name'])}:
            m.setdefault(k, cid)
    m['wukong'] = 'MonkeyKing'
    return m, {cid: fr[cid]['name'] for cid in fr}


def main():
    idof, names = ddragon_ids()
    data, patch, n = {}, '', 0
    for region in REGIONS:
        for elo in ELOS:
            for lane in LANES:
                url = f'https://lolalytics.com/lol/tierlist/?lane={lane}&tier={elo}&region={region}'
                try:
                    rows, p = parse(get(url))
                except Exception as e:  # noqa: BLE001
                    print('échec', url, e, file=sys.stderr)
                    rows, p = [], ''
                patch = patch or p
                for r in rows:
                    r['id'] = idof.get(r['slug'])
                    r['fr'] = names.get(r['id'], r['name'])
                rows = [r for r in rows if r['id']]
                data.setdefault(region, {}).setdefault(elo, {})[lane] = rows
                n += len(rows)
                print(region, elo, lane, len(rows), file=sys.stderr)
                time.sleep(1.5)
    if n < 100:
        print('trop peu de données, fichier non modifié', file=sys.stderr)
        sys.exit(1)
    out = {'patch': patch, 'maj': time.strftime('%Y-%m-%d'), 'source': 'LoLalytics', 'regions': REGIONS, 'elos': ELOS, 'lanes': LANES, 'data': data}
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('ok', n, 'lignes, patch', patch, file=sys.stderr)


if __name__ == '__main__':
    main()
