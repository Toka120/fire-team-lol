"""python3 gen.py <deck> <outdir> local|blobs  → slides HTML + deck.json + titles.json"""
import json, os, sys, re
sys.path.insert(0, os.path.dirname(__file__))
from kit import *
from decks import DECKS
from blocks import bold
import kit
from lum import lum
LIGHT = 0.45
UNDERLINE = {('adc', 's35')}
sys.path.insert(0, '/home/claude/lanes')
from outline import process

SK = json.load(open('/home/claude/carnet/skins.json'))
ICONS = json.load(open('/home/claude/carnet/icons.json'))
SKIP = set(json.load(open('/home/claude/carnet/skip.json')))
NAMES = {'jungle': 'Jungle', 'adc': 'ADC', 'top': 'Top', 'mid': 'Mid', 'support': 'Support'}


def expand(slides):
    out = []
    for s in slides:
        if s['kind'] == 'quiz':
            out.append(dict(s, kind='quizq'))
            out.append(dict(s, kind='quiza'))
        else:
            out.append(s)
    return out


def assign(deck, slides):
    pool = [x for x in SK[deck] if x['file'] not in SKIP]
    used = set(); res = []
    for s in slides:
        c = s.get('champ')
        cand = [x for x in pool if x['file'] not in used and (not c or x['champ'] == c)]
        if not cand:
            cand = [x for x in pool if x['file'] not in used]
        if not cand:
            used = set(); cand = pool
        x = cand[0]; used.add(x['file']); res.append(x)
    return res


def render(deck, s, i, skin, src, ico, tot):
    sid = f's{i:02d}'
    k = s['kind']
    xp = (s['niv'], tot, NAMES[deck]) if s.get('niv') else None
    title = s.get('title') or ''
    if k == 'cover':
        inner = (kicker('FIRE LoL · Carnet du coach') + '\n'
                 f'<p style="font-size:120px;line-height:1">{s["icon"]}</p>\n'
                 f'<h1 style="{OS};font-size:150px;font-weight:700;line-height:1;letter-spacing:-1px;color:#f3eee2;width:1500px">{E(s["who"])}</h1>\n'
                 f'<p style="font-size:52px;font-weight:700;color:#ffb347">{E(s["players"])}</p>\n'
                 '<p style="font-size:34px;line-height:1.35;color:#e6dfcf;width:1100px">Ta quête : passe chaque niveau, valide les défis, réponds aux quiz.</p>')
        return sid, section(sid, inner, skin, src, j='center', g=26, mode='light'), s['who']
    if k == 'quest':
        cells = '\n'.join(
            f'<div style="display:flex;gap:20px;align-items:center;padding:14px 24px;background:rgba(10,13,20,0.7);border:2px solid rgba(212,171,79,0.55);border-radius:16px">'
            f'<p style="{OS};font-size:40px;font-weight:700;color:{GOLD};width:60px">{n}</p>'
            f'<p style="font-size:32px;color:#f3eee2">{E(t)}</p></div>' for n, t in enumerate(s['levels'], 1))
        inner = (kicker('La quête') + '\n' + h2('Tes niveaux à passer') + '\n'
                 f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px 24px;width:1500px">\n{cells}\n</div>\n'
                 + para('🎯 Défis à valider · ❓ Quiz : la réponse est sur la slide suivante · 🏆 Boss final à la fin', 28, 1500, '#e6dfcf'))
        return sid, section(sid, inner, skin, src, g=30, mode='full'), 'La quête'
    if k == 'std':
        parts = [kicker(s['kick']), h2(title)]
        if s.get('para'): parts.append(para(s['para'], 38, 1150))
        if s.get('bigs'):
            parts.append(row([box(f'<p style="{OS};font-size:64px;font-weight:700;color:#ffb347">{E(a)}</p>' + line(E(b), 28, '#e6dfcf'),
                                  color=GOLD, flex='none', pad=30) for a, b in s['bigs']], gap=28, width=1500))
        if s.get('bullets'): parts.append(bullets(s['bullets'], s.get('size', 38)))
        if s.get('chips'): parts.append(chips([E(x) for x in s['chips']]))
        many = len(s.get('bullets') or []) > 4
        return sid, section(sid, '\n'.join(parts), skin, src, g=30, mode='full' if many or s.get('bigs') else 'left', xp=xp), title
    if k == 'cards':
        cols = s['cols']
        cs = [box(h3(a, col, 44 if cols == 3 else 52) + '\n' + '\n'.join(line(x, 30 if cols == 3 else 34) for x in xs), color=col, pad=28)
              for a, col, xs in s['cards']]
        if cols == 3 and len(cs) > 3:
            grid = (f'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:22px;width:1664px">\n' + '\n'.join(cs) + '\n</div>')
        else:
            grid = row(cs, gap=28)
        parts = [kicker(s['kick']), h2(title, 76), grid]
        if s.get('foot'): parts.append(para('💡 ' + s['foot'], 28, 1664, '#ffd38a'))
        return sid, section(sid, '\n'.join(parts), skin, src, g=26, mode='full', xp=xp), title
    if k == 'wave':
        col = s['color']
        head = (f'<div style="display:flex;gap:28px;align-items:center"><p style="font-size:110px;line-height:1">{s["emo"]}</p>'
                f'<div style="display:flex;flex-direction:column;gap:6px">{kicker("Carte de vague", col)}'
                f'<h2 style="{OS};font-size:96px;font-weight:700;line-height:1;color:#f3eee2">{E(s["term"])}</h2></div></div>')
        d = para(s['defn'], 40, 1600, '#ffd38a')
        c1 = box(h3('✅ Forces · quand', GREEN, 38) + '\n' + '\n'.join(line(x, 31) for x in s['forces']), color=GREEN, pad=28)
        c2 = box(h3('⚠️ Faiblesses · pièges', RED, 38) + '\n' + '\n'.join(line(x, 31) for x in s['faibl']), color=RED, pad=28)
        inner = head + '\n' + d + '\n' + row([c1, c2], 28)
        return sid, section(sid, inner, skin, src, g=26, mode='full', xp=xp), s['term']
    if k == 'quizq':
        inner = (kicker('❓ Quiz', PURPLE) + '\n' + h2(s['q'], 66, 1400) + '\n' + choices(s['ch']) + '\n'
                 + para('Réfléchis… la réponse est sur la slide suivante.', 28, 1300, '#cbb8ff'))
        return sid, section(sid, inner, skin, src, g=30, mode='full', xp=xp), 'Quiz'
    if k == 'quiza':
        inner = (kicker('✅ Réponse', GREEN) + '\n' + h2(s['q'], 52, 1400, '#d9d3c4') + '\n' + choices(s['ch'], s['good']) + '\n'
                 + box(line('💡 ' + s['why'], 32), color=GREEN, flex='none', pad=26))
        return sid, section(sid, inner, skin, src, g=26, mode='full', xp=xp), 'Réponse'
    if k == 'path':
        parts = [kicker(s['kick']), h2(title)]
        st = []
        for j, x in enumerate(s['steps']):
            if j: st.append('→')
            st.append(E(x))
        parts.append(chips(st, 32))
        parts.append(bullets(s['bullets']))
        return sid, section(sid, '\n'.join(parts), skin, src, g=34, mode='full', xp=xp), title
    if k == 'defi':
        inner = (kicker('🎯 Défi', '#ffb347') + '\n' + h2(title, 76) + '\n'
                 f'<div style="display:flex;gap:28px;align-items:baseline"><p style="{OS};font-size:96px;font-weight:700;color:#ffb347">{E(s["big"])}</p>'
                 f'<p style="font-size:32px;color:#e6dfcf">{E(s["sub"])}</p></div>\n' + checks(s['items'], 36))
        return sid, section(sid, inner, skin, src, g=26, mode='full', xp=xp), title
    if k == 'final':
        inner = (kicker('🏆 Boss final', '#ffb347') + '\n' + h2(title, 72, 1500) + '\n' + checks(s['items'], 32, 1500) + '\n'
                 + para('Tout est coché ? <b style="color:#ffb347">Carnet terminé, badge débloqué.</b> On en parle au prochain débrief.', 30, 1500, '#e6dfcf'))
        return sid, section(sid, inner, skin, src, j='center', g=26, mode='full'), 'Boss final'
    if k == 'grid4':
        cells = []
        for name, col, champs, xs in s['cells']:
            icons = ''.join(icon(ico(c), 92, col) for c in champs)
            cells.append(box(f'<div style="display:flex;gap:14px;align-items:center">{icons}'
                             f'<h3 style="{OS};font-size:52px;font-weight:700;color:{col};margin-left:10px">{E(name)}</h3></div>'
                             + '\n'.join(line(x, 32, mark='›', mcolor=col) for x in xs), color=col, pad=28))
        grid = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;width:1664px">\n' + '\n'.join(cells) + '\n</div>'
        inner = kicker(s['kick']) + '\n' + h2(title, 76) + '\n' + grid
        return sid, section(sid, inner, skin, src, g=26, mode='full', xp=xp), title
    if k == 'triangle':
        node = lambda e, n, sub, col, x, y: (
            f'<div style="position:absolute;left:{x}px;top:{y}px;width:300px;display:flex;flex-direction:column;align-items:center;gap:8px">'
            f'<div style="width:170px;height:170px;border-radius:999px;border:6px solid {col};background:rgba(10,13,20,0.8);display:flex;align-items:center;justify-content:center">'
            f'<p style="font-size:90px;line-height:1">{e}</p></div>'
            f'<p style="{OS};font-size:50px;font-weight:700;color:{col}">{n}</p><p style="font-size:24px;color:#e6dfcf">{sub}</p></div>')
        arrow = lambda t, col, x, y, w: (f'<p style="position:absolute;left:{x}px;top:{y}px;width:{w}px;text-align:center;font-size:30px;'
                                         f'font-weight:700;color:{col};line-height:1.25">{t}</p>')
        dia = ('<div style="position:relative;width:1000px;height:660px">'
               + node('🔥', 'ALL-IN', 'le feu', '#ff6b6b', 350, 0)
               + node('🌿', 'SUSTAIN', 'la nature', '#5fd39a', 700, 390)
               + node('💧', 'POKE', 'l’eau', '#5aa9ff', 0, 390)
               + arrow('➘ Le feu brûle<br>la nature', '#ff6b6b', 690, 150, 300)
               + arrow('⟵ La nature<br>absorbe l’eau', '#5fd39a', 340, 520, 320)
               + arrow('➚ L’eau éteint<br>le feu', '#5aa9ff', 10, 150, 300)
               + '</div>')
        side = bullets([f"{bold('All-in bat sustain')} : il frappe fort avant qu'elle se soigne.",
                        f"{bold('Sustain bat poke')} : elle soigne tout le poke.",
                        f"{bold('Poke bat all-in')} : il te poke, tu n'as plus les PV pour all-in."], 30, 560)
        inner = (kicker(s['kick']) + '\n' + h2(title, 76) + '\n'
                 f'<div style="display:flex;gap:40px;align-items:center;width:1664px">{dia}{side}</div>')
        return sid, section(sid, inner, skin, src, g=16, mode='full', xp=xp), title
    if k == 'botid':
        one = lambda c, lab, col: (f'<div style="display:flex;flex-direction:column;align-items:center;gap:10px">'
                                   f'<p style="{OS};font-size:44px;font-weight:700;color:{col}">{lab}</p>'
                                   f'<div style="display:flex;gap:12px">{icon(ico("Caitlyn"), 120, "#5aa9ff")}{icon(ico(c), 120, col)}</div>'
                                   f'<p style="font-size:26px;color:#e6dfcf">Caitlyn + {E(c)}</p></div>')
        inner = (kicker(s['kick']) + '\n' + h2(title, 76) + '\n'
                 + para("Le même ADC peut jouer les 3 types : c'est le support à côté qui change la bot lane.", 34, 1500) + '\n'
                 + row([box(one('Leona', '🔥 ALL-IN', '#ff6b6b'), '#ff6b6b', pad=26),
                        box(one('Lux', '💧 POKE', '#5aa9ff'), '#5aa9ff', pad=26),
                        box(one('Soraka', '🌿 SUSTAIN', '#5fd39a'), '#5fd39a', pad=26)], 28) + '\n'
                 + para('💡 En draft : regarde le duo en face, et le vôtre, avant de choisir ton plan.', 28, 1600, '#ffd38a'))
        return sid, section(sid, inner, skin, src, g=26, mode='full', xp=xp), title
    if k == 'synergy':
        A = ['Jinx', 'Caitlyn', "Kai'Sa", 'Draven', 'Ezreal', 'Ashe']
        S = ['Lulu', 'Lux', 'Nautilus', 'Thresh', 'Soraka', 'Leona']
        col = lambda xs, ring: ('<div style="display:flex;flex-direction:column;gap:14px">' + ''.join(
            f'<div style="display:flex;gap:14px;align-items:center">{icon(ico(c), 78, ring)}<p style="font-size:26px;font-weight:700;color:#f3eee2;width:150px">{E(c)}</p></div>'
            for c in xs) + '</div>')
        lines = '<svg aria-label="Chaque ADC relié à chaque support" width="360" height="560" viewBox="0 0 360 560" style="display:block">' + ''.join(
            f'<line x1="0" y1="{39 + 92 * a}" x2="360" y2="{39 + 92 * b}" stroke="{"#5aa9ff" if (a + b) % 2 else "#5fd39a"}" stroke-opacity="0.55" stroke-width="2"/>'
            for a in range(6) for b in range(6)) + '</svg>'
        dia = f'<div style="display:flex;gap:10px;align-items:center">{col(A, "#5aa9ff")}{lines}{col(S, "#5fd39a")}</div>'
        side = bullets(["Chaque ADC peut aller avec chaque support.",
                        f"Mais {bold('chaque duo change le type de la bot')} : all-in, poke ou sustain.",
                        "Connaissez vos duos, et lisez celui d'en face."], 30, 560)
        inner = (kicker(s['kick']) + '\n' + h2(title, 70) + '\n'
                 f'<div style="display:flex;gap:50px;align-items:center;width:1664px">{dia}{side}</div>')
        return sid, section(sid, inner, skin, src, g=16, mode='full', xp=xp), title
    raise ValueError(k)


def build(deck, mode):
    slides = expand(DECKS[deck]())
    skins = assign(deck, slides)
    tot = max(s.get('niv', 0) for s in slides)
    if mode == 'local':
        src = lambda f: 'file:///home/claude/carnet/' + f
    else:
        blobs = json.load(open(f'/home/claude/carnet/blobs-{deck}.json'))
        src = lambda f: blobs[f]
    ico = lambda c: src(ICONS[c])
    out, titles, order = {}, [], []
    for i, (s, sk) in enumerate(zip(slides, skins), 1):
        light = lum('/home/claude/carnet/' + sk['file']) > LIGHT
        kit.THEME['light'] = light
        sid, h, t = render(deck, s, i, sk, src(sk['file']), ico, tot)
        kit.THEME['light'] = False
        h = process(h)
        if light: h = kit.to_light(h)
        if (deck, sid) in UNDERLINE: h = h.replace('<h2 style="', '<h2 style="text-decoration:underline;', 1)
        out[sid] = h; order.append(sid); titles.append(t)
    return out, order, titles, skins


if __name__ == '__main__':
    deck, outdir, mode = sys.argv[1:4]
    out, order, titles, skins = build(deck, mode)
    os.makedirs(f'{outdir}/slides', exist_ok=True)
    for f in os.listdir(f'{outdir}/slides'):
        os.remove(f'{outdir}/slides/{f}')
    for sid, h in out.items():
        open(f'{outdir}/slides/{sid}.html', 'w', encoding='utf-8').write(h)
    secs = {}
    json.dump({"v": 4, "createdOnFiles": {"v": 1, "at": "2026-11-05T01:00:00Z"}, "lists": "css",
               "title": f"Le carnet du coach · {NAMES[deck]} — FIRE LoL", "order": order,
               "sections": {"s1": {"description": "Ouverture et quête", "start": order[0]},
                            "s2": {"description": "Les niveaux du carnet", "start": order[2]},
                            "s3": {"description": "Boss final", "start": order[-1]}},
               "cover": order[0],
               "faces": {"oswald": {"family": "Oswald", "href": "https://fonts.googleapis.com/css2?family=Oswald:wght@400..700&display=swap"},
                         "rubik": {"family": "Rubik", "href": "https://fonts.googleapis.com/css2?family=Rubik:wght@400..700&display=swap"}},
               "designSystems": []}, open(f'{outdir}/deck.json', 'w', encoding='utf-8'), ensure_ascii=False)
    json.dump(titles, open(f'{outdir}/titles.json', 'w', encoding='utf-8'), ensure_ascii=False)
    print(deck, len(order), 'slides')
