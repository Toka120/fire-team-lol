"""Briques HTML des carnets (format du type Slides, 1920x1080)."""
import html, json

E = html.escape
GOLD = '#d4ab4f'
GREEN = '#5fd39a'
RED = '#ff6b6b'
BLUE = '#5aa9ff'
PURPLE = '#b48cff'
OS = "font-family:'Oswald', Arial, sans-serif"

SEC = ("background:#0c1018;color:#f3eee2;font-family:'Rubik', Arial, sans-serif;padding:150px 128px 150px;"
       "display:flex;flex-direction:column;justify-content:{j};gap:{g}px")


THEME = {'light': False}


def veil(mode):
    if THEME['light']:
        a = {'full': (0.34, 0.2, 0.06), 'light': (0.26, 0.12, 0.0)}.get(mode, (0.3, 0.16, 0.0))
        g = (f'linear-gradient(90deg, rgba(236,226,212,{a[0]}) 0%, rgba(236,226,212,{a[1]}) 55%, rgba(236,226,212,{a[2]}) 100%), '
             'linear-gradient(0deg, rgba(18,14,10,0.22), rgba(18,14,10,0.22))')
        return f'<div style="position:absolute;left:0;top:0;width:1920px;height:1080px;background:{g}"></div>'
    if mode == 'full':
        g = ('linear-gradient(90deg, rgba(10,13,20,0.9) 0%, rgba(10,13,20,0.8) 50%, rgba(10,13,20,0.5) 100%), '
             'linear-gradient(0deg, rgba(10,13,20,0.7) 0%, rgba(10,13,20,0) 22%)')
    elif mode == 'light':
        g = ('linear-gradient(90deg, rgba(10,13,20,0.8) 0%, rgba(10,13,20,0.6) 45%, rgba(10,13,20,0.2) 72%, rgba(10,13,20,0) 100%), '
             'linear-gradient(0deg, rgba(10,13,20,0.7) 0%, rgba(10,13,20,0) 22%)')
    else:
        g = ('linear-gradient(90deg, rgba(10,13,20,0.9) 0%, rgba(10,13,20,0.76) 48%, rgba(10,13,20,0.25) 74%, rgba(10,13,20,0) 100%), '
             'linear-gradient(0deg, rgba(10,13,20,0.7) 0%, rgba(10,13,20,0) 22%)')
    return f'<div style="position:absolute;left:0;top:0;width:1920px;height:1080px;background:{g}"></div>'


def section(sid, inner, skin, src, j='center', g=36, mode='left', xp=None, foot=None):
    img = (f'<img src="{src}" alt="Splash art de {E(skin["name"])}" style="position:absolute;left:0;top:0;'
           f'width:1920px;height:1080px;object-fit:cover;object-position:65% 30%">')
    top = ''
    if xp:
        n, tot, label = xp
        pct = round(100 * n / tot)
        top = (f'<div style="position:absolute;left:128px;top:56px;width:1664px;display:flex;align-items:center;gap:24px">\n'
               f'<p style="font-size:24px;font-weight:700;color:{GOLD};letter-spacing:3px">NIVEAU {n}/{tot}</p>\n'
               f'<div style="flex:1;height:14px;border-radius:999px;background:rgba(255,255,255,0.16);border:1px solid rgba(212,171,79,0.5)">'
               f'<div style="width:{pct}%;height:12px;border-radius:999px;background:linear-gradient(90deg,#ffb347,#ff5e3a)"></div></div>\n'
               f'<p style="font-size:24px;font-weight:700;color:#f3eee2">{E(label)}</p>\n</div>\n')
    f = (f'<p style="position:absolute;right:128px;bottom:56px;width:800px;text-align:right;font-size:24px;'
         f'color:#bdb6a6">{E(skin["name"])} · © Riot Games</p>\n')
    if foot:
        f += f'<p style="position:absolute;left:128px;bottom:56px;width:900px;font-size:24px;color:{GOLD}">{E(foot)}</p>\n'
    return (f'<section id="{sid}" data-transition="fade" style="{SEC.format(j=j, g=g)}">\n{img}\n{veil(mode)}\n{top}'
            f'{inner}\n{f}</section>\n')


def kicker(t, color=GOLD):
    return f'<p style="font-size:26px;letter-spacing:4px;text-transform:uppercase;color:{color};font-weight:700">{E(t)}</p>'


def h2(t, size=92, width=1300, color='#f3eee2'):
    return f'<h2 style="{OS};font-size:{size}px;font-weight:700;line-height:1.08;color:{color};width:{width}px">{E(t)}</h2>'


def para(t, size=34, width=1200, color='#f3eee2'):
    return f'<p style="font-size:{size}px;line-height:1.38;color:{color};width:{width}px">{t}</p>'


def bullets(xs, size=38, width=1300, mark='›', gap=20):
    out = []
    for x in xs:
        m, t = (x if isinstance(x, tuple) else (mark, x))
        out.append(f'<p style="font-size:{size}px;line-height:1.34;color:#f3eee2"><span style="color:{GOLD}">{m}</span>  {t}</p>')
    return f'<div style="display:flex;flex-direction:column;gap:{gap}px;width:{width}px">\n' + '\n'.join(out) + '\n</div>'


def box(inner, color=GOLD, flex='1', pad=32, bg='rgba(10,13,20,0.72)'):
    return (f'<div style="flex:{flex};display:flex;flex-direction:column;gap:14px;background:{bg};'
            f'padding:{pad}px;border:2px solid {color};border-radius:22px;min-width:0">\n{inner}\n</div>')


def h3(t, color=GOLD, size=44):
    return f'<h3 style="{OS};font-size:{size}px;font-weight:700;line-height:1.1;color:{color}">{E(t)}</h3>'


def line(t, size=28, color='#f3eee2', mark=None, mcolor=GOLD):
    m = f'<span style="color:{mcolor}">{mark}</span>  ' if mark else ''
    return f'<p style="font-size:{size}px;line-height:1.34;color:{color}">{m}{t}</p>'


def row(items, gap=28, width=1664):
    return f'<div style="display:flex;gap:{gap}px;width:{width}px;align-items:stretch">\n' + '\n'.join(items) + '\n</div>'


def chips(xs, size=28, color=GOLD):
    return ('<div style="display:flex;gap:14px;flex-wrap:wrap;width:1600px;align-items:center">\n' + '\n'.join(
        (f'<p style="font-size:{size}px;font-weight:700;color:{GOLD}">→</p>' if x == '→' else
         f'<p style="font-size:{size}px;padding:12px 26px;border:2px solid {color};border-radius:999px;color:#f3eee2;'
         f'background:rgba(10,13,20,0.6)">{x}</p>') for x in xs) + '\n</div>')


def icon(src, size=96, ring=GOLD):
    return (f'<img src="{src}" alt="" style="width:{size}px;height:{size}px;border-radius:999px;border:4px solid {ring};'
            'object-fit:cover;display:block">')


def checks(xs, size=32, width=1300):
    out = []
    for x in xs:
        out.append('<div style="display:flex;gap:22px;align-items:center">'
                   f'<div style="width:44px;height:44px;flex:none;border:3px solid {GOLD};border-radius:10px;background:rgba(10,13,20,0.6)"></div>'
                   f'<p style="font-size:{size}px;line-height:1.3;color:#f3eee2">{x}</p></div>')
    return f'<div style="display:flex;flex-direction:column;gap:20px;width:{width}px">\n' + '\n'.join(out) + '\n</div>'


def choices(xs, good=None, size=34):
    out = []
    for i, x in enumerate(xs):
        L = 'ABC'[i]
        ok = good is not None and i == good
        dim = good is not None and i != good
        col = GREEN if ok else ('rgba(255,255,255,0.25)' if dim else PURPLE)
        out.append(f'<div style="display:flex;gap:24px;align-items:center;padding:22px 30px;border:3px solid {col};border-radius:18px;'
                   f'background:{"rgba(40,120,80,0.35)" if ok else "rgba(10,13,20,0.7)"};width:1250px;opacity:{0.55 if dim else 1}">'
                   f'<p style="{OS};font-size:44px;font-weight:700;color:{col}">{"✓" if ok else L}</p>'
                   f'<p style="font-size:{size}px;line-height:1.3;color:#f3eee2">{x}</p></div>')
    return '<div style="display:flex;flex-direction:column;gap:18px">\n' + '\n'.join(out) + '\n</div>'


# Texte noir sur les images claires : on échange les couleurs du thème sombre.
LIGHT_MAP = [
    ('#f3eee2', '#14110e'), ('#e6dfcf', '#2a241e'), ('#d9d3c4', '#3a332b'), ('#bdb6a6', '#3d362e'),
    ('#ffd38a', '#7a4300'), ('#ffb347', '#a84a00'), ('#d4ab4f', '#7d5300'), ('#5fd39a', '#0b6e3c'),
    ('#ff6b6b', '#b3201f'), ('#5aa9ff', '#1652a8'), ('#b48cff', '#5c32b0'), ('#cbb8ff', '#4b2d96'),
    ('#05070b', '#efe6d8'), ('rgba(10,13,20,', 'rgba(232,223,209,'), ('rgba(212,171,79,', 'rgba(125,83,0,'),
    ('rgba(40,120,80,0.35)', 'rgba(30,150,85,0.22)'), ('rgba(255,255,255,0.25)', 'rgba(0,0,0,0.3)'),
    ('rgba(255,255,255,0.16)', 'rgba(0,0,0,0.14)'),
]


def to_light(h):
    for a, b in LIGHT_MAP:
        h = h.replace(a, b)
    return h
