"""Convertit les visuels sur carte de « Lanes et principes » en plans LoLValue Map Planner (https://lolvalue.com/lol-map).

On rejoue chaque scène en enregistrant ce qu'elle dessine (pions, déplacements, wards, sbires, flèches, textes, étapes),
puis on en tire jusqu'à 12 étapes LoLValue. Le lien contient tout le plan (JSON compressé « deflate-raw » en base64url,
préfixé par « z ») : rien n'est stocké sur le site.

Carte LoLValue : 1000 x 1000, origine en haut à gauche, base bleue en bas à gauche, comme nos visuels (u, v de 0 à 1).
"""
import base64, json, math, re, zlib

import svg as _svg
import anim as _anim

# Champions de l'équipe FIRE (pools) pour nos pions, champions classiques pour l'adversaire. Identifiants Riot.
ALLY = {'T': 58, 'J': 59, 'M': 61, 'A': 21, 'S': 111}     # Renekton, Jarvan IV, Orianna, Miss Fortune, Nautilus
ENEMY = {'T': 122, 'J': 64, 'M': 103, 'A': 222, 'S': 412}  # Darius, Lee Sin, Ahri, Jinx, Thresh
ROLES = 'TJMAS'
MAX_STEPS = 12

_rec = None          # enregistrement en cours
_map = [None]        # dernière carte dessinée : (x0, y0, taille)
_mark = '<!--R:'


def _uv(x, y):
    if not _map[0]:
        return None
    x0, y0, s = _map[0]
    u, v = (x - x0) / s, (y - y0) / s
    return (u, v) if -0.02 <= u <= 1.02 and -0.02 <= v <= 1.02 else None


def _tag(d):
    return _mark + json.dumps(d) + '-->'


def _tags(inner):
    return [json.loads(m) for m in re.findall(r'<!--R:(.*?)-->', inner)]


# ---------- enregistrement : on enveloppe les méthodes de dessin ----------
_orig = {}


def _wrap(cls, name, fn):
    _orig[(cls, name)] = getattr(cls, name)
    setattr(cls, name, fn)


def _install():
    S, A = _svg.Svg, _anim.A

    def map_(self, x0, y0, s, *a, **k):
        _map[0] = (x0, y0, s)
        return _orig[(S, 'map')](self, x0, y0, s, *a, **k)

    def champ(self, x, y, team, letter, *a, **k):
        if _rec is not None and not getattr(self, '_capturing', 0):
            _rec['static'].append({'k': 'champ', 'team': team, 'l': letter, 'xy': (x, y)})
        return _orig[(S, 'champ')](self, x, y, team, letter, *a, **k)

    def ward(self, x, y, team='a', pink=False):
        if _rec is not None and not getattr(self, '_capturing', 0):
            _rec['static'].append({'k': 'ward', 'team': team, 'pink': pink, 'xy': (x, y)})
        return _orig[(S, 'ward')](self, x, y, team, pink)

    def wave(self, x, y, team, n, *a, **k):
        if _rec is not None and not getattr(self, '_capturing', 0):
            _rec['static'].append({'k': 'wave', 'team': team, 'xy': (x, y)})
        return _orig[(S, 'wave')](self, x, y, team, n, *a, **k)

    def arrow(self, pts, color, *a, **k):
        if _rec is not None:
            p = pts if isinstance(pts[0], tuple) else [tuple(pts)]
            _rec['static'].append({'k': 'arrow', 'pts': list(p), 'color': color})
        return _orig[(S, 'arrow')](self, pts, color, *a, **k)

    def cap(self, fn):
        self._capturing = getattr(self, '_capturing', 0) + 1
        try:
            return _orig[(A, 'cap')](self, fn)
        finally:
            self._capturing -= 1

    def g_champ(self, team, letter, r=18, label=None):
        return _orig[(A, 'g_champ')](self, team, letter, r, label) + _tag({'k': 'champ', 'team': team, 'l': letter})

    def g_ward(self, team='a', pink=False):
        return _orig[(A, 'g_ward')](self, team, pink) + _tag({'k': 'ward', 'team': team, 'pink': pink})

    def g_wave(self, team, n, *a, **k):
        return _orig[(A, 'g_wave')](self, team, n, *a, **k) + _tag({'k': 'wave', 'team': team})

    def g_text(self, t, size=16, color=_svg.FG, *a, **k):
        return _orig[(A, 'g_text')](self, t, size, color, *a, **k) + _tag({'k': 'text', 's': str(t), 'color': color})

    def show_at(self, x, y, inner, t0, t1=1.0):
        if _rec is not None:
            for d in _tags(inner):
                _rec['timed'].append({**d, 'xy': (x, y), 't0': t0, 't1': t1})
        return _orig[(A, 'show_at')](self, x, y, inner, t0, t1)

    def move_champ(self, team, letter, pts, stops=None, t0=0.0, t1=1.0, r=18):
        if _rec is not None:
            _rec['moves'].append({'k': 'champ', 'team': team, 'l': letter, 'pts': pts, 'stops': stops, 't0': t0, 't1': t1})
        return _orig[(A, 'move_champ')](self, team, letter, pts, stops, t0, t1, r)

    def move_wave(self, team, n, pts, stops=None, t0=0.0, t1=1.0, cols=3):
        if _rec is not None:
            _rec['moves'].append({'k': 'wave', 'team': team, 'pts': pts, 'stops': stops, 't0': t0, 't1': t1})
        return _orig[(A, 'move_wave')](self, team, n, pts, stops, t0, t1, cols)

    def boom(self, x, y, t0, color=_svg.GOLD, text=None):
        if _rec is not None and text:
            _rec['timed'].append({'k': 'text', 's': text, 'color': color, 'xy': (x, y - 28), 't0': t0, 't1': min(0.99, t0 + 0.2)})
        # le texte est déjà enregistré ici : on évite le doublon de show_at
        r = _rec
        try:
            _set_rec(None)
            return _orig[(A, 'boom')](self, x, y, t0, color, text)
        finally:
            _set_rec(r)

    def recall(self, x, y, t0, t1):
        if _rec is not None:
            _rec['timed'].append({'k': 'text', 's': '↩ back', 'color': _svg.ALLY, 'xy': (x, y - 30), 't0': t0, 't1': t1})
        return _orig[(A, 'recall')](self, x, y, t0, t1)

    def steps(self, items, *a, **k):
        if _rec is not None:
            for it in items:
                _rec['steps'].append({'t0': it[0], 'txt': it[1][0].strip(), 'color': it[2] if len(it) > 2 else _svg.FG})
        return _orig[(A, 'steps')](self, items, *a, **k)

    def captions(self, items, *a, **k):
        if _rec is not None:
            for it in items:
                _rec['steps'].append({'t0': it[0], 'txt': it[2], 'color': it[3] if len(it) > 3 else _svg.FG})
        return _orig[(A, 'captions')](self, items, *a, **k)

    for cls, name, fn in [(S, 'map', map_), (S, 'champ', champ), (S, 'ward', ward), (S, 'wave', wave), (S, 'arrow', arrow),
                          (A, 'cap', cap), (A, 'g_champ', g_champ), (A, 'g_ward', g_ward), (A, 'g_wave', g_wave), (A, 'g_text', g_text),
                          (A, 'show_at', show_at), (A, 'move_champ', move_champ), (A, 'move_wave', move_wave), (A, 'boom', boom),
                          (A, 'recall', recall), (A, 'steps', steps), (A, 'captions', captions)]:
        _wrap(cls, name, fn)


def _set_rec(r):
    global _rec
    _rec = r


def _uninstall():
    for (cls, name), fn in _orig.items():
        setattr(cls, name, fn)
    _orig.clear()


# ---------- position d'un déplacement à l'instant t (même calcul que l'animation) ----------
def _pos(mv, t):
    pts, stops = mv['pts'], mv['stops'] or [(0, 0), (1, len(mv['pts']) - 1)]
    seg = [0.0]
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        seg.append(seg[-1] + math.hypot(x2 - x1, y2 - y1))
    st = sorted(stops)
    if st[0][0] > 0:
        st.insert(0, (0, st[0][1]))
    if st[-1][0] < 1:
        st.append((1, st[-1][1]))
    for (ta, ia), (tb, ib) in zip(st, st[1:]):
        if ta <= t <= tb:
            f = 0 if tb == ta else (t - ta) / (tb - ta)
            d = seg[ia] + (seg[ib] - seg[ia]) * f
            break
    else:
        d = seg[st[-1][1]]
    for k in range(len(seg) - 1):
        if seg[k] <= d <= seg[k + 1]:
            L = seg[k + 1] - seg[k] or 1
            f = (d - seg[k]) / L
            (x1, y1), (x2, y2) = pts[k], pts[k + 1]
            return x1 + (x2 - x1) * f, y1 + (y2 - y1) * f
    return pts[-1]


# ---------- éléments LoLValue ----------
def _xy(u, v):
    return min(1000, max(0, round(u * 1000))), min(1000, max(0, round(v * 1000)))


def _col(team_or_color):
    if team_or_color in ('a', _svg.ALLY):
        return 'b'
    if team_or_color in ('e', _svg.ENEMY, _anim.BAD):
        return 'r'
    if team_or_color in (_svg.GOLD, _svg.OK, _anim.PINK):
        return 'y'
    return 'w'


class _Champs:
    """Donne un champion à chaque pion : la lettre décide du rôle ; un pion sans lettre prend un rôle libre."""

    def __init__(self):
        self.free = {'a': list(ROLES), 'e': list(ROLES)}

    def use(self, team, letter):
        if letter and letter in ROLES and letter in self.free[team]:
            self.free[team].remove(letter)

    def get(self, team, letter, slot):
        table = ALLY if team == 'a' else ENEMY
        if letter and letter[0] in table:
            return table[letter[0]]
        free = self.free[team] or list(ROLES)
        return table[free[slot % len(free)]]


def _frames(rec):
    steps = sorted({round(s['t0'], 3): s for s in rec['steps']}.values(), key=lambda s: s['t0'])
    if steps:
        times = [min(0.97, max(s['t0'] + 0.02, (steps[i + 1]['t0'] - 0.02) if i + 1 < len(steps) else 0.96)) for i, s in enumerate(steps)]
    else:
        ends = sorted({round(x, 3) for m in rec['moves'] for x in (m['t0'], m['t1'])} | {0.02, 0.96})
        times = [0.02, 0.96] if len(ends) < 3 else [0.02, 0.5, 0.96]
    if len(times) > MAX_STEPS:
        times, steps = times[:MAX_STEPS], steps[:MAX_STEPS]

    names = _Champs()
    for m in rec['moves'] + rec['static'] + rec['timed']:
        if m['k'] == 'champ':
            names.use(m['team'], m['l'])
    # un même pion qui bouge garde son champion d'une étape à l'autre
    ids, slots = {}, {'a': 0, 'e': 0}

    def cid(key, team, letter):
        if key not in ids:
            ids[key] = names.get(team, letter, slots[team])
            if not letter:
                slots[team] += 1
        return ids[key]

    frames = []
    for i, t in enumerate(times):
        items, seen = [], set()

        def add(it):
            k = json.dumps(it, sort_keys=True)
            if k not in seen and len(items) < 120:
                seen.add(k)
                items.append(it)

        for n, m in enumerate(rec['static']):
            if m['k'] == 'arrow':
                uv = [_uv(*p) for p in m['pts']]
                if all(uv) and len(uv) >= 2:
                    pts = [c for u, v in uv for c in _xy(u, v)]
                    add({'t': 'arrow', 'c': _col(m['color']), 'p': pts[:2] + pts[-2:]} if len(uv) == 2 else {'t': 'pen', 'c': _col(m['color']), 'p': pts})
                continue
            uv = _uv(*m['xy'])
            if not uv:
                continue
            x, y = _xy(*uv)
            if m['k'] == 'champ':
                add({'t': 'champ', 'c': _col(m['team']), 'x': x, 'y': y, 'id': cid(('s', n), m['team'], m['l'])})
            elif m['k'] == 'ward':
                add({'t': 'control' if m['pink'] else 'ward', 'c': _col(m['team']), 'x': x, 'y': y})
            elif m['k'] == 'wave':
                add({'t': 'text', 'c': _col(m['team']), 'x': x, 'y': y, 's': 'wave'})
        for n, m in enumerate(rec['moves']):
            if not (m['t0'] <= t <= m['t1']):
                continue
            uv = _uv(*_pos(m, t))
            if not uv:
                continue
            x, y = _xy(*uv)
            if m['k'] == 'champ':
                add({'t': 'champ', 'c': _col(m['team']), 'x': x, 'y': y, 'id': cid(('m', n), m['team'], m['l'])})
            else:
                add({'t': 'text', 'c': _col(m['team']), 'x': x, 'y': y, 's': 'wave'})
        for n, m in enumerate(rec['timed']):
            if not (m['t0'] <= t <= m['t1']):
                continue
            uv = _uv(*m['xy'])
            if not uv:
                continue
            x, y = _xy(*uv)
            if m['k'] == 'champ':
                add({'t': 'champ', 'c': _col(m['team']), 'x': x, 'y': y, 'id': cid(('t', n), m['team'], m['l'])})
            elif m['k'] == 'ward':
                add({'t': 'control' if m['pink'] else 'ward', 'c': _col(m['team']), 'x': x, 'y': y})
            elif m['k'] == 'wave':
                add({'t': 'text', 'c': _col(m['team']), 'x': x, 'y': y, 's': 'wave'})
            elif m['k'] == 'text':
                s = re.sub(r'\s+', ' ', m['s']).strip()
                if s and s not in ('🐉', '👾') and len(s) <= 40:
                    add({'t': 'text', 'c': _col(m['color']), 'x': x, 'y': y, 's': s})  # le site centre les textes
        if steps:
            s = steps[i]
            add({'t': 'text', 'c': _col(s['color']), 'x': 500, 'y': 975, 's': s['txt'][:40]})
        frames.append({'i': items, 'd': []})
    return frames


def plan_link(frames):
    raw = json.dumps({'f': frames}, separators=(',', ':'), ensure_ascii=False).encode()
    co = zlib.compressobj(9, zlib.DEFLATED, -15)
    z = co.compress(raw) + co.flush()
    code = 'z' + base64.urlsafe_b64encode(z).decode().rstrip('=')
    assert len(code) <= 16000, 'plan trop gros pour LoLValue'
    return 'https://lolvalue.com/lol-map#plan=' + code


def record(fn):
    """Rejoue un visuel (fonction sans argument) et renvoie (svg, liste d'étapes LoLValue) ; None s'il n'a pas de carte."""
    _install()
    try:
        _map[0] = None
        _set_rec({'static': [], 'moves': [], 'timed': [], 'steps': []})
        out = fn()
        rec = _rec
    finally:
        _set_rec(None)
        _uninstall()
    out = re.sub(r'<!--R:.*?-->', '', out)
    if not _map[0]:
        return out, None
    fr = _frames(rec)
    return out, (fr if any(f['i'] for f in fr) else None)


# Visuels dessinés à la main (sans pions enregistrables) : plan écrit directement.
def _manual_wards_def_off():
    d = [(0.16, 0.22), (0.30, 0.50), (0.48, 0.70), (0.78, 0.86), (0.40, 0.38)]
    o = [(0.52, 0.30), (0.70, 0.48), (0.62, 0.20), (0.84, 0.60)]
    W = lambda u, v, c='b', t='ward': {'t': t, 'c': c, 'x': _xy(u, v)[0], 'y': _xy(u, v)[1]}
    T = lambda s, u, v, c: {'t': 'text', 'c': c, 'x': _xy(u, v)[0], 'y': _xy(u, v)[1], 's': s}
    f1 = [W(u, v) for u, v in d] + [T('D', u + 0.03, v, 'b') for u, v in d] + [T('Défensives : voir arriver un gank', 0.5, 0.975, 'b')]
    f2 = f1[:-1] + [W(u, v) for u, v in o] + [T('O', u + 0.03, v, 'y') for u, v in o] + [T('Offensives : suivre son jungler', 0.5, 0.975, 'y')]
    return [{'i': f1, 'd': []}, {'i': f2, 'd': []}]


MANUAL = {'wards_def_off': _manual_wards_def_off}
