"""Génère les carnets du coach (une deck par joueur) au format du type Slides.
Usage : python3 gen_carnet.py <deck> <outdir> <local|blobs>
"""
import json, os, re, sys, html, hashlib
sys.path.insert(0, '/home/claude/carnet'); sys.path.insert(0, '/home/claude/lanes')
from contenu_carnets import DECKS
from outline import process as outline

E = html.escape
GOLD = '#d4ab4f'; GREEN = '#4cc38a'; RED = '#ef5a5a'; BLUE = '#5aa9ff'; PURPLE = '#b07cff'
OS = "font-family:'Oswald', Arial, sans-serif"
SEC = ("background:#0c1018;color:#f3eee2;font-family:'Rubik', Arial, sans-serif;padding:120px 128px 150px;display:flex;"
       "flex-direction:column;justify-content:{j};gap:{g}px")
SK = json.load(open('/home/claude/carnet/skins.json', encoding='utf-8'))


def skin_pool(deck):
    seen, out = set(), []
    for s in SK[deck]:
        p = '/home/claude/carnet/' + s['file']
        h = hashlib.md5(open(p, 'rb').read()).hexdigest()
        if h in seen: continue
        seen.add(h); out.append(s)
    by = {}
    for s in out: by.setdefault(s['champ'], []).append(s)
    rr = []
    while any(by.values()):
        for c in list(by):
            if by[c]: rr.append(by[c].pop(0))
    return rr


def expand(slides):
    out = []
    for s in slides:
        if s['k'] == 'quiz':
            out.append(dict(s, k='quizq')); out.append(dict(s, k='quiza'))
        else: out.append(s)
    return out


def p(t, size=34, color='#f3eee2', extra=''):
    return f'<p style="font-size:{size}px;line-height:1.35;color:{color};{extra}">{t}</p>'


def h2(t, w=1150, size=84):
    return f'<h2 style="{OS};font-size:{size}px;font-weight:700;line-height:1.08;color:#f3eee2;width:{w}px">{E(t)}</h2>'


def kick(t, color=GOLD):
    return f'<p style="font-size:24px;letter-spacing:4px;text-transform:uppercase;color:{color};font-weight:700">{E(t)}</p>'


def bullets(xs, size=34, w=1180):
    return (f'<div style="display:flex;flex-direction:column;gap:16px;width:{w}px">' + ''.join(
        p(f'<span style="color:{GOLD}">›</span>  {E(x)}', size) for x in xs) + '</div>')


def chips(xs):
    return ('<div style="display:flex;gap:16px;flex-wrap:wrap;width:1300px">' + ''.join(
        f'<p style="font-size:28px;padding:12px 26px;border:2px solid rgba(212,171,79,0.75);border-radius:999px;color:#f3eee2;background:rgba(10,13,20,0.55)">{E(x)}</p>'
        for x in xs) + '</div>')


def box(inner, border=GOLD, w=None, flex=True):
    st = (f'{"flex:1;" if flex else ""}{"width:%dpx;" % w if w else ""}display:flex;flex-direction:column;gap:14px;background:rgba(10,13,20,0.66);'
          f'padding:32px 34px;border:2px solid {border};border-radius:22px')
    return f'<div style="{st}">{inner}</div>'


def xpbar(n, total):
    if not n: return ''
    pct = int(100 * n / total)
    return ('<div style="position:absolute;right:128px;top:64px;display:flex;align-items:center;gap:16px">'
            f'<p style="font-size:22px;font-weight:700;color:{GOLD};letter-spacing:2px">NIV {n}/{total}</p>'
            '<div style="width:260px;height:16px;border-radius:999px;background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.3)">'
            f'<div style="width:{pct}%;height:100%;border-radius:999px;background:linear-gradient(90deg,{GOLD},#ff8a3a)"></div></div></div>')


def section(sid, inner, skin, src, n=0, total=0, j='flex-start', g=36, dense=True):
    a = 0.84 if dense else 0.74
    img = (f'<img src="{src}" alt="Splash art de {E(skin["name"])}" style="position:absolute;left:0;top:0;'
           'width:1920px;height:1080px;object-fit:cover;object-position:65% 30%">')
    veil = ('<div style="position:absolute;left:0;top:0;width:1920px;height:1080px;background:'
            f'linear-gradient(90deg, rgba(10,13,20,{a}) 0%, rgba(10,13,20,{a-0.2:.2f}) 42%, rgba(10,13,20,0.12) 72%, rgba(10,13,20,0) 100%), '
            'linear-gradient(0deg, rgba(10,13,20,0.7) 0%, rgba(10,13,20,0) 22%)"></div>')
    foot = (f'<p style="position:absolute;right:128px;bottom:56px;width:700px;text-align:right;font-size:22px;color:#bdb6a6">'
            f'{E(skin["name"])} · © Riot Games</p>')
    return (f'<section id="{sid}" data-transition="fade" style="{SEC.format(j=j, g=g)}">\n{img}\n{veil}\n{xpbar(n, total)}\n'
            f'{inner}\n{foot}\n</section>\n')


def triangle():
    def node(cx, cy, col, emo, t, sub):
        return (f'<circle cx="{cx}" cy="{cy}" r="88" fill="#0d1119" fill-opacity="0.85" stroke="{col}" stroke-width="7"/>'
                f'<text x="{cx}" y="{cy + 30}" font-size="84" text-anchor="middle">{emo}</text>'
                f'<text x="{cx}" y="{cy + 145}" font-size="48" font-weight="700" font-family="Oswald, Arial" text-anchor="middle" fill="{col}" stroke="#05070b" stroke-width="2" paint-order="stroke">{t}</text>'
                f'<text x="{cx}" y="{cy + 185}" font-size="26" font-family="Rubik, Arial" text-anchor="middle" fill="#e6dfcf" stroke="#05070b" stroke-width="3" paint-order="stroke">{sub}</text>')
    def lab(x, y, col, t):
        return f'<text x="{x}" y="{y}" font-size="28" font-weight="700" font-family="Rubik, Arial" text-anchor="middle" fill="{col}" stroke="#05070b" stroke-width="4" paint-order="stroke">{t}</text>'
    m = ''.join(f'<marker id="m{i}" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="{c}"/></marker>'
                for i, c in enumerate(['#ff6a3a', GREEN, BLUE]))
    return ('<svg aria-label="Triangle : le all-in bat le sustain, le sustain bat le poke, le poke bat le all-in" width="900" height="660" viewBox="0 0 900 660">'
            f'<defs>{m}</defs>'
            '<path d="M555 120 Q760 200 735 360" stroke="#ff6a3a" stroke-width="8" fill="none" marker-end="url(#m0)"/>'
            '<path d="M620 520 Q450 610 285 520" stroke="#4cc38a" stroke-width="8" fill="none" marker-end="url(#m1)"/>'
            '<path d="M165 360 Q140 200 345 120" stroke="#5aa9ff" stroke-width="8" fill="none" marker-end="url(#m2)"/>'
            + node(450, 110, '#ff6a3a', '🔥', 'ALL-IN', 'le feu') + node(735, 450, GREEN, '🌿', 'SUSTAIN', 'la nature') + node(165, 450, BLUE, '💧', 'POKE', 'l’eau')
            + lab(760, 190, '#ff8a5a', 'Le feu brûle la nature') + lab(450, 640, GREEN, 'La nature absorbe l’eau') + lab(150, 190, BLUE, 'L’eau éteint le feu') + '</svg>')


def build(deck, src_of):
    D = DECKS[deck]
    slides = expand(D['slides'])
    total = max([int(re.match(r'Niveau (\d+)', s['lvl']).group(1)) for s in slides if s.get('lvl')] or [0])
    pool = skin_pool(deck)
    used = set()

    def pick(champ):
        cands = [s for s in pool if s['file'] not in used and (not champ or s['champ'] == champ)]
        if not cands: cands = [s for s in pool if s['file'] not in used]
        if not cands: used.clear(); cands = pool
        s = cands[0]; used.add(s['file']); return s

    # attribuer d'abord les skins demandés
    choice = {}
    for i, s in enumerate(slides):
        if s.get('champ'): choice[i] = pick(s['champ'])
    # couverture : premier champion du pool du joueur
    for i, s in enumerate(slides):
        if i in choice: continue
        if s['k'] == 'quiza': choice[i] = choice[i - 1]
        else: choice[i] = pick(None)

    order, out, titles = [], {}, {}
    qn = 0
    for i, s in enumerate(slides):
        k = s['k']; sid = f's{i + 1:02d}'
        n = int(re.match(r'Niveau (\d+)', s['lvl']).group(1)) if s.get('lvl') else 0
        sk = choice[i]; src = src_of(sk)
        put = lambda inner, title, **kw: (out.__setitem__(sid, section(sid, inner, sk, src, n, total, **kw)), titles.__setitem__(sid, title), order.append(sid))
        if k == 'cover':
            put(kick(f'FIRE LoL · {D["cat"]} · Carnet du coach') +
                f'<h1 style="{OS};font-size:140px;font-weight:700;line-height:1;letter-spacing:-2px;color:#f3eee2;width:1500px">{E(s["title"])}</h1>'
                + p(f'🎮 {E(s["who"])}', 52, GOLD, 'font-weight:700') + p(E(s['sub']), 38, '#e6dfcf', 'width:1000px'),
                s['title'], j='center', g=30, dense=False)
        elif k == 'quest':
            lv = ''.join(f'<p style="font-size:30px;line-height:1.25;padding:14px 22px;border-radius:14px;background:rgba(10,13,20,0.6);border:2px solid rgba(212,171,79,0.5)">'
                         f'<b style="color:{GOLD}">NIV {j}</b>  {E(t)}</p>' for j, t in enumerate(s['levels'], 1))
            put(kick('🗺️ Ta carte de quête') + h2('Les niveaux à débloquer') +
                f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;width:1300px">{lv}</div>' +
                p('🎯 Défis à valider · ❓ Quiz avec la réponse juste après · 🏆 Un badge à la fin', 28, '#e6dfcf'),
                'Ta carte de quête', g=30)
        elif k == 'text':
            inner = kick(s['lvl']) + h2(s['title'])
            if s.get('lead'): inner += p(E(s['lead']), 46, GOLD, 'font-weight:700;width:1250px;line-height:1.25')
            if s.get('bullets'): inner += bullets(s['bullets'])
            if s.get('chips'): inner += chips(s['chips'])
            put(inner, s['title'])
        elif k == 'cards':
            cs = s['cards']; w = 1660
            cols = 'display:grid;grid-template-columns:' + ' '.join(['1fr'] * (len(cs) if len(cs) <= 3 else (3 if len(cs) == 5 else 2))) + f';gap:24px;width:{w}px'
            cards = ''.join(box(f'<h3 style="{OS};font-size:40px;font-weight:700;color:{GOLD};line-height:1.15">{E(a)}</h3>' + p(E(b), 33), flex=False) for a, b in cs)
            inner = kick(s['lvl']) + h2(s['title'], 1500)
            if s.get('lead'): inner += p(E(s['lead']), 32, '#e6dfcf', 'width:1500px')
            put(inner + f'<div style="{cols}">{cards}</div>', s['title'], g=30, dense=True)
        elif k == 'path':
            steps = ''.join((f'<p style="font-size:32px;font-weight:700;padding:14px 24px;border-radius:14px;background:rgba(10,13,20,0.7);border:2px solid {GOLD}">{E(x)}</p>'
                             + (f'<p style="font-size:40px;color:{GOLD}">➜</p>' if j < len(s['steps']) - 1 else '')) for j, x in enumerate(s['steps']))
            put(kick(s['lvl']) + h2(s['title']) + f'<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;width:1660px">{steps}</div>'
                + bullets(s['bullets']), s['title'])
        elif k == 'quizq':
            qn += 1
            ch = ''.join(f'<p style="font-size:36px;font-weight:700;padding:20px 30px;border-radius:16px;background:rgba(10,13,20,0.7);border:2px solid {PURPLE}">'
                         f'<span style="color:{PURPLE}">{"ABC"[j]}</span>   {E(c)}</p>' for j, c in enumerate(s['choices']))
            put(kick(f'❓ Quiz n°{qn}', PURPLE) + h2(s['q'], 1300, 72) + f'<div style="display:flex;flex-direction:column;gap:16px;width:1150px">{ch}</div>'
                + p('Réfléchis… la réponse est sur la slide suivante.', 28, '#d9d3c4'), f'Quiz : {s["q"]}', g=34)
        elif k == 'quiza':
            a = s['choices'][s['ans']]
            put(kick(f'✅ Réponse du quiz n°{qn}', GREEN) + p(E(s['q']), 34, '#d9d3c4', 'width:1300px') +
                f'<p style="font-size:52px;font-weight:700;padding:22px 34px;border-radius:18px;background:rgba(20,60,40,0.75);border:3px solid {GREEN};width:1250px">'
                f'<span style="color:{GREEN}">{"ABC"[s["ans"]]} ✓</span>   {E(a)}</p>' + p('💡 ' + E(s['why']), 36, '#f3eee2', 'width:1250px'),
                f'Réponse : {a}', g=34)
        elif k == 'wave':
            plus = ''.join(p(f'<span style="color:{GREEN}">✔</span>  {E(x)}', 30) for x in s['plus'])
            moins = ''.join(p(f'<span style="color:{RED}">✖</span>  {E(x)}', 30) for x in s['moins'])
            cols = box(f'<h3 style="{OS};font-size:38px;font-weight:700;color:{GREEN}">💪 Forces</h3>' + plus, GREEN)
            if moins: cols += box(f'<h3 style="{OS};font-size:38px;font-weight:700;color:{RED}">⚠️ Faiblesses</h3>' + moins, RED)
            put(kick(s['lvl']) + f'<h2 style="{OS};font-size:96px;font-weight:700;line-height:1;color:#f3eee2">{s["emoji"]} {E(s["term"])}</h2>'
                + p(E(s['def']), 44, GOLD, 'font-weight:700') + f'<div style="display:flex;gap:28px;width:1660px">{cols}</div>', s['term'], g=28)
        elif k == 'big':
            inner = kick(s['lvl']) + f'<h2 style="{OS};font-size:100px;font-weight:700;line-height:1.08;color:#f3eee2;width:1400px">{E(s["text"])}</h2>'
            if s.get('sub'): inner += p(E(s['sub']), 38, '#e6dfcf', 'width:1200px')
            put(inner, s['text'], j='center', g=34)
        elif k == 'defi':
            it = ''.join(p(f'<span style="color:{GOLD}">⬜</span>&nbsp;&nbsp;{E(x)}', 36) for x in s['items'])
            put(kick(f'🎯 Défi · {s["lvl"]}') + h2(s['title']) + f'<div style="display:flex;flex-direction:column;gap:20px;width:1300px">{it}</div>'
                + p('⭐ ' + E(s['reward']), 32, GOLD, 'font-weight:700;width:1300px'), s['title'])
        elif k == 'triangle':
            put(kick(s['lvl']) + h2(s['title']) + triangle(), s['title'], g=20)
        elif k == 'final':
            it = ''.join(p(f'<span style="color:{GOLD}">⬜</span>&nbsp;&nbsp;{E(x)}', 34) for x in s['items'])
            badge = (f'<div style="position:absolute;right:200px;top:300px;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,#3a2a0e 0%,#140f08 70%);'
                     f'border:10px solid {GOLD};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px">'
                     f'<p style="font-size:120px">🏆</p><p style="{OS};font-size:40px;font-weight:700;color:{GOLD};text-align:center;width:300px">{E(s["badge"])}</p>'
                     '<p style="font-size:22px;color:#e6dfcf">Badge débloqué</p></div>')
            put(kick('🏆 Fin de la quête') + h2(s['title']) + f'<div style="display:flex;flex-direction:column;gap:18px;width:1100px">{it}</div>'
                + p('Tout coché ? Tu as gagné ton badge. Le détail : FIRE LoL › Lanes et principes.', 28, '#e6dfcf', 'width:1100px') + badge, s['title'])
        else:
            raise ValueError(k)
    for sid in out: out[sid] = outline(out[sid])
    build.used = sorted({choice[i]['file'] for i in choice})
    return order, out, titles


def deck_json(deck, order):
    D = DECKS[deck]
    return {"v": 4, "createdOnFiles": {"v": 1, "at": "2026-11-05T00:30:00Z"}, "lists": "css",
            "title": f"{D['titre']} — {D['pseudo']} — FIRE LoL", "order": order,
            "sections": {"s1": {"description": "Ouverture et carte de quête", "start": order[0]},
                         "s2": {"description": "Les niveaux du carnet", "start": order[2]},
                         "s3": {"description": "Checklist finale", "start": order[-1]}},
            "cover": order[0],
            "faces": {"oswald": {"family": "Oswald", "href": "https://fonts.googleapis.com/css2?family=Oswald:wght@400..700&display=swap"},
                      "rubik": {"family": "Rubik", "href": "https://fonts.googleapis.com/css2?family=Rubik:wght@400..700&display=swap"}},
            "designSystems": []}


if __name__ == '__main__':
    deck, outdir, mode = sys.argv[1:4]
    if mode == 'local':
        src = lambda s: 'file:///home/claude/carnet/' + s['file']
    else:
        blobs = json.load(open(f'/home/claude/carnet/blobs-{deck}.json'))
        src = lambda s: blobs[s['file']]
    order, out, titles = build(deck, src)
    os.makedirs(f'{outdir}/slides', exist_ok=True)
    for f in os.listdir(f'{outdir}/slides'): os.remove(f'{outdir}/slides/{f}')
    for sid, h in out.items():
        open(f'{outdir}/slides/{sid}.html', 'w', encoding='utf-8').write(h)
    json.dump(deck_json(deck, order), open(f'{outdir}/deck.json', 'w', encoding='utf-8'), ensure_ascii=False)
    json.dump({'order': order, 'titles': titles, 'used': build.used}, open(f'{outdir}/titles.json', 'w', encoding='utf-8'), ensure_ascii=False)
    print(deck, len(order), 'slides')
