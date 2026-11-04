# Outils d'animation pour les schémas (SVG animé avec SMIL : fonctionne dans une balise <img>, sans script).
import math
from svg import Svg, ALLY, ENEMY, FG, MUTED, OK, GOLD, LANE, RIVER, BG, esc

BAD = '#ef5a5a'
PINK = '#e05bd8'


def _f(x):
    return f'{x:.3f}'.rstrip('0').rstrip('.') if isinstance(x, float) else str(x)


class A(Svg):
    """Svg + animations en boucle. Tous les temps sont des fractions (0 à 1) de la durée de la boucle."""

    def __init__(self, dur=6, w=800, h=450):
        super().__init__(w, h)
        self.dur = dur

    # ----- capture : dessine avec les méthodes de Svg mais récupère le texte au lieu de l'ajouter -----
    def cap(self, fn):
        n = len(self.parts)
        fn()
        out = ''.join(self.parts[n:])
        del self.parts[n:]
        return out

    def g_champ(self, team, letter, r=18, label=None):
        return self.cap(lambda: self.champ(0, 0, team, letter, r=r, label=label))

    def g_wave(self, team, n, cols=3, gap=16, r=7):
        return self.cap(lambda: self.wave(0, 0, team, n, cols, gap, r))

    def g_ward(self, team='a', pink=False):
        return self.cap(lambda: self.ward(0, 0, team, pink))

    def g_text(self, t, size=16, color=FG, anchor='middle', weight='normal'):
        return self.cap(lambda: self.text(0, 0, t, size, color, anchor, weight))

    # ----- animations -----
    def _times(self, t0, t1, fade=0.03):
        t0 = max(0.0, min(0.99, t0))
        t1 = max(t0 + fade + 0.005, min(1.0, t1))
        if t0 <= 0.001:
            if t1 >= 0.999:
                return None
            return '1;1;0;0', f'0;{_f(t1)};{_f(min(0.999, t1 + fade))};1'
        if t1 >= 0.999:
            return '0;0;1;1', f'0;{_f(t0)};{_f(min(0.999, t0 + fade))};1'
        return '0;0;1;1;0;0', f'0;{_f(t0)};{_f(t0 + fade)};{_f(t1)};{_f(min(0.999, t1 + fade))};1'

    def visible(self, inner, t0=0.0, t1=1.0):
        tt = self._times(t0, t1)
        if not tt:
            return f'<g>{inner}</g>'
        v, k = tt
        return f"<g opacity='{v.split(';')[0]}'>{inner}<animate attributeName='opacity' dur='{self.dur}s' repeatCount='indefinite' values='{v}' keyTimes='{k}'/></g>"

    def moving(self, inner, pts, stops=None):
        """Déplace `inner` (dessiné autour de 0,0) le long des points. stops = [(temps, index du point)]."""
        if stops is None:
            stops = [(0, 0), (1, len(pts) - 1)]
        seg = [0.0]
        for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
            seg.append(seg[-1] + math.hypot(x2 - x1, y2 - y1))
        L = seg[-1] or 1.0
        st = sorted(stops)
        if st[0][0] > 0:
            st.insert(0, (0, st[0][1]))
        if st[-1][0] < 1:
            st.append((1, st[-1][1]))
        kt, kp, last = [], [], -1
        for t, i in st:
            t = round(float(t), 3)
            if t <= last:
                t = round(last + 0.001, 3)
            kt.append(_f(t))
            kp.append(_f(round(seg[i] / L, 4)))
            last = t
        kt[-1] = '1'
        d = 'M ' + ' L '.join(f'{x},{y}' for x, y in pts)
        return f"<g>{inner}<animateMotion dur='{self.dur}s' repeatCount='indefinite' path='{d}' keyPoints='{';'.join(kp)}' keyTimes='{';'.join(kt)}' calcMode='linear'/></g>"

    def pulse(self, x, y, color, t0, r0=8, r1=46, length=0.12):
        t0 = max(0.002, min(0.97, t0))
        t1 = min(0.995, t0 + length)
        k = f'0;{_f(t0)};{_f(t0 + 0.002)};{_f(t1)};1'
        return self.add(f"<circle cx='{x}' cy='{y}' r='{r0}' fill='none' stroke='{color}' stroke-width='3' opacity='0'>"
                        f"<animate attributeName='r' dur='{self.dur}s' repeatCount='indefinite' values='{r0};{r0};{r0};{r1};{r1}' keyTimes='{k}'/>"
                        f"<animate attributeName='opacity' dur='{self.dur}s' repeatCount='indefinite' values='0;0;0.9;0;0' keyTimes='{k}'/></circle>")

    def steps(self, items, x=440, y=104, gap=58, size=16):
        """Étapes à droite d'une carte, qui apparaissent puis restent : [(t0, [lignes], couleur)]."""
        for i, it in enumerate(items):
            t0, lines = it[0], it[1]
            col = it[2] if len(it) > 2 else FG
            inner = ''.join(f"<text x='0' y='{j * (size + 5)}' font-size='{size}' fill='{col if j == 0 else MUTED}' font-weight='{'bold' if j == 0 else 'normal'}'>{esc(l)}</text>" for j, l in enumerate(lines))
            self.show_at(x, y + i * gap, inner, t0, 0.985)
        return self

    def mtower(self, u, v, team, t1=1.0):
        x, y = self.P(u, v)
        col = ALLY if team == 'a' else ENEMY
        inner = f"<rect x='-8' y='-8' width='16' height='16' rx='3' fill='#1a1614' stroke='{col}' stroke-width='3'/>"
        return self.show_at(x, y, inner, 0, t1)

    def at(self, x, y, inner):
        return f"<g transform='translate({x},{y})'>{inner}</g>"

    def show_at(self, x, y, inner, t0, t1=1.0):
        return self.add(self.visible(self.at(x, y, inner), t0, t1))

    def move_champ(self, team, letter, pts, stops=None, t0=0.0, t1=1.0, r=18):
        return self.add(self.visible(self.moving(self.g_champ(team, letter, r), pts, stops), t0, t1))

    def move_wave(self, team, n, pts, stops=None, t0=0.0, t1=1.0, cols=3):
        return self.add(self.visible(self.moving(self.g_wave(team, n, cols), pts, stops), t0, t1))

    def shot(self, x1, y1, x2, y2, color, t0, length=0.06, r=6):
        """Un projectile qui part de (x1,y1) vers (x2,y2) entre t0 et t0+length."""
        inner = f"<circle r='{r}' fill='{color}' stroke='#fff' stroke-width='1.5'/>"
        return self.add(self.visible(self.moving(inner, [(x1, y1), (x2, y2)], [(t0, 0), (t0 + length, 1)]), t0, t0 + length + 0.01))

    def boom(self, x, y, t0, color=GOLD, text=None):
        self.pulse(x, y, color, t0)
        if text:
            self.show_at(x, y - 28, self.g_text(text, 15, color, 'middle', 'bold'), t0, min(0.99, t0 + 0.2))
        return self

    def recall(self, x, y, t0, t1):
        """Effet de retour à la base : anneau bleu qui tourne."""
        ring = (f"<circle r='26' fill='none' stroke='{ALLY}' stroke-width='3' stroke-dasharray='10 8'>"
                f"<animateTransform attributeName='transform' type='rotate' from='0' to='360' dur='1s' repeatCount='indefinite'/></circle>")
        return self.show_at(x, y, ring, t0, t1)

    def captions(self, steps, y=424):
        """Étapes affichées les unes après les autres en bas du schéma : [(t0, t1, texte, couleur)]."""
        for st in steps:
            t0, t1, txt = st[0], st[1], st[2]
            col = st[3] if len(st) > 3 else FG
            box = (f"<rect x='-370' y='-22' width='740' height='32' rx='10' fill='#221c19' stroke='#2e2622'/>"
                   + self.g_text(txt, 16, col, 'middle', 'bold'))
            self.show_at(self.w / 2, y, box, t0, t1)
        return self

    def grow_bar(self, x, y, w, h, color, t0, t1, rx=6):
        k = f'0;{_f(t0)};{_f(t1)};1' if t0 > 0 else f'0;{_f(t1)};{_f(min(0.995, t1 + 0.001))};1'
        v = f'0;0;{w};{w}' if t0 > 0 else f'0;{w};{w};{w}'
        return self.add(f"<rect x='{x}' y='{y}' width='0' height='{h}' rx='{rx}' fill='{color}'>"
                        f"<animate attributeName='width' dur='{self.dur}s' repeatCount='indefinite' values='{v}' keyTimes='{k}'/></rect>")

    def lane(self, y=220, h=110, river=True, towers=True, x1=40, x2=760):
        self.hlane(y, x1, x2, h, river)
        if towers:
            self.tower(x1 + 40, y, 'a')
            self.tower(x2 - 40, y, 'e')
        return self


# ----- Modèles de scènes réutilisables -----

def cards(title, sub, items, cols=2, dur=7, start=0.05, step=None):
    """Infographie : des cartes qui apparaissent l'une après l'autre. items = [(icône, titre, texte, 'good'|'bad'|'neutre')]."""
    s = A(dur).title(title, sub)
    n = len(items)
    rows = math.ceil(n / cols)
    gw, gh = 740, 330
    cw, ch = (gw - (cols - 1) * 16) / cols, min(96, (gh - (rows - 1) * 12) / rows)
    step = step or (0.75 - start) / max(1, n)
    for i, it in enumerate(items):
        ico, t, txt, kind = (list(it) + [''] * 4)[:4]
        c, r = i % cols, i // cols
        x, y = 30 + c * (cw + 16), 80 + r * (ch + 12)
        col = {'good': OK, 'bad': BAD, 'warn': GOLD}.get(kind, '#3a302a')
        inner = (f"<rect x='0' y='0' width='{cw}' height='{ch}' rx='14' fill='#1a1614' stroke='{col}' stroke-width='2'/>"
                 f"<text x='34' y='{ch / 2 + 11}' font-size='30' text-anchor='middle'>{esc(ico)}</text>"
                 f"<text x='66' y='{ch / 2 - 4 if txt else ch / 2 + 6}' font-size='17' font-weight='bold' fill='{FG}'>{esc(t)}</text>"
                 + (f"<text x='66' y='{ch / 2 + 18}' font-size='14' fill='{MUTED}'>{esc(txt)}</text>" if txt else ''))
        t0 = start + i * step
        s.show_at(x, y, inner, t0, 0.97)
        s.pulse(x + 34, y + ch / 2, col if col != '#3a302a' else GOLD, t0, 10, 40, 0.1)
    return s.render()


def timeline(title, sub, marks, dur=8, start='0:00', end='20:00'):
    """Frise du temps avec un curseur qui avance. marks = [(position 0-1, heure, texte, couleur)]."""
    s = A(dur).title(title, sub)
    x1, x2, y = 60, 740, 250
    s.line(x1, y, x2, y, '#3a302a', 8)
    s.text(x1, y + 34, start, 14, MUTED)
    s.text(x2, y + 34, end, 14, MUTED)
    for i, (p, hr, txt, col) in enumerate(marks):
        x = x1 + p * (x2 - x1)
        up = i % 2 == 0
        s.line(x, y, x, y - 60 if up else y + 60, col, 2, '4 4')
        s.circle(x, y, 8, col)
        t0 = 0.08 + p * 0.8
        lab = (f"<rect x='-80' y='-24' width='160' height='48' rx='10' fill='#1a1614' stroke='{col}' stroke-width='2'/>"
               f"<text x='0' y='-4' font-size='16' font-weight='bold' fill='{col}' text-anchor='middle'>{esc(hr)}</text>"
               f"<text x='0' y='15' font-size='13' fill='{FG}' text-anchor='middle'>{esc(txt)}</text>")
        s.show_at(x, y - 86 if up else y + 86, lab, t0, 0.97)
        s.pulse(x, y, col, t0, 8, 30, 0.1)
    cur = f"<polygon points='0,-22 10,-38 -10,-38' fill='{FG}'/><line x1='0' y1='-18' x2='0' y2='18' stroke='{FG}' stroke-width='3'/>"
    s.add(s.moving(cur, [(x1, y), (x2, y)], [(0.05, 0), (0.88, 1)]))
    return s.render()


def bars(title, sub, items, dur=6, maxv=None, unit=''):
    """Barres qui grandissent. items = [(texte, valeur, couleur, détail)]."""
    s = A(dur).title(title, sub)
    maxv = maxv or max(v for _, v, _, _ in items)
    y = 110
    for i, (lab, v, col, det) in enumerate(items):
        s.text(40, y + 22, lab, 17, FG, 'start', 'bold')
        s.rect(300, y + 4, 440, 26, '#221c19', 8)
        t0 = 0.08 + i * 0.18
        s.grow_bar(300, y + 4, 440 * v / maxv, 26, col, t0, t0 + 0.2)
        if det:
            s.show_at(300, y + 56, s.g_text(det, 14, MUTED, 'start'), t0 + 0.2, 0.97)
        y += 84
    return s.render()
