# Petits outils pour dessiner les schémas des rubriques (SVG 800 x 450).
BG = '#14110f'
ALLY = '#4aa3ff'
ENEMY = '#ff5e3a'
FG = '#f5ede6'
MUTED = '#a8988c'
OK = '#4cc38a'
LANE = '#2a2320'
RIVER = '#1d3a52'
GOLD = '#ffb347'


def esc(t):
    return str(t).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


class Svg:
    def __init__(self, w=800, h=450):
        self.w, self.h = w, h
        self.parts = []
        self.markers = set()

    def add(self, s):
        self.parts.append(s)
        return self

    def _marker(self, color):
        mid = 'm' + color.strip('#')
        self.markers.add((mid, color))
        return mid

    # ----- formes -----
    def rect(self, x, y, w, h, fill, rx=0, stroke=None, sw=2, op=1, dash=None):
        st = f" stroke='{stroke}' stroke-width='{sw}'" if stroke else ''
        d = f" stroke-dasharray='{dash}'" if dash else ''
        o = f" opacity='{op}'" if op != 1 else ''
        return self.add(f"<rect x='{x}' y='{y}' width='{w}' height='{h}' rx='{rx}' fill='{fill}'{st}{d}{o}/>")

    def circle(self, x, y, r, fill, stroke=None, sw=2, op=1):
        st = f" stroke='{stroke}' stroke-width='{sw}'" if stroke else ''
        o = f" opacity='{op}'" if op != 1 else ''
        return self.add(f"<circle cx='{x}' cy='{y}' r='{r}' fill='{fill}'{st}{o}/>")

    def line(self, x1, y1, x2, y2, color, sw=3, dash=None, op=1):
        d = f" stroke-dasharray='{dash}'" if dash else ''
        o = f" opacity='{op}'" if op != 1 else ''
        return self.add(f"<line x1='{x1}' y1='{y1}' x2='{x2}' y2='{y2}' stroke='{color}' stroke-width='{sw}' stroke-linecap='round'{d}{o}/>")

    def poly(self, pts, color, sw=3, fill='none', dash=None, op=1):
        p = ' '.join(f'{x},{y}' for x, y in pts)
        d = f" stroke-dasharray='{dash}'" if dash else ''
        o = f" opacity='{op}'" if op != 1 else ''
        return self.add(f"<polyline points='{p}' fill='{fill}' stroke='{color}' stroke-width='{sw}' stroke-linejoin='round' stroke-linecap='round'{d}{o}/>")

    def arrow(self, pts, color, sw=3, dash=None):
        if len(pts) == 2 and not isinstance(pts[0], tuple):
            pts = [pts]
        m = self._marker(color)
        p = ' '.join(f'{x},{y}' for x, y in pts)
        d = f" stroke-dasharray='{dash}'" if dash else ''
        return self.add(f"<polyline points='{p}' fill='none' stroke='{color}' stroke-width='{sw}' stroke-linejoin='round' stroke-linecap='round' marker-end='url(#{m})'{d}/>")

    def text(self, x, y, t, size=16, color=FG, anchor='middle', weight='normal', italic=False):
        it = " font-style='italic'" if italic else ''
        w = f" font-weight='{weight}'" if weight != 'normal' else ''
        return self.add(f"<text x='{x}' y='{y}' font-size='{size}' fill='{color}' text-anchor='{anchor}'{w}{it}>{esc(t)}</text>")

    def lines(self, x, y, rows, size=16, color=FG, anchor='start', gap=None, weight='normal'):
        gap = gap or size * 1.35
        for i, r in enumerate(rows):
            self.text(x, y + i * gap, r, size, color, anchor, weight)
        return self

    def title(self, t, sub=None):
        self.text(24, 34, t, 20, FG, 'start', 'bold')
        if sub:
            self.text(24, 58, sub, 16, MUTED, 'start')
        return self

    # ----- éléments de LoL -----
    def tower(self, x, y, team, label=None, size=30):
        col = ALLY if team == 'a' else ENEMY
        self.rect(x - size / 2, y - size / 2, size, size, '#1a1614', 4, col, 3)
        self.rect(x - size / 4, y - size / 4, size / 2, size / 2, col, 2)
        if label:
            self.text(x, y + size / 2 + 18, label, 14, MUTED)
        return self

    def tower_range(self, x, y, r, team):
        col = ALLY if team == 'a' else ENEMY
        return self.add(f"<circle cx='{x}' cy='{y}' r='{r}' fill='{col}' fill-opacity='0.07' stroke='{col}' stroke-opacity='0.45' stroke-width='2' stroke-dasharray='6 6'/>")

    def minion(self, x, y, team, r=7, op=1):
        col = ALLY if team == 'a' else ENEMY
        return self.circle(x, y, r, col, '#0f0d0c', 1.5, op)

    def wave(self, x, y, team, n, cols=3, gap=17, r=7, op=1):
        rows = (n + cols - 1) // cols
        for i in range(n):
            c, rr = i % cols, i // cols
            self.minion(x + (c - (cols - 1) / 2) * gap, y + (rr - (rows - 1) / 2) * gap, team, r, op)
        return self

    def champ(self, x, y, team, letter, r=18, label=None, ring=None):
        col = ALLY if team == 'a' else ENEMY
        self.circle(x, y, r, '#1a1614', col, 3)
        self.text(x, y + 6, letter, 17, col, 'middle', 'bold')
        if ring:
            self.circle(x, y, r + 6, 'none', ring, 2)
        if label:
            self.text(x, y + r + 20, label, 14, MUTED)
        return self

    def ward(self, x, y, team='a', pink=False):
        col = '#e05bd8' if pink else (GOLD if team == 'a' else ENEMY)
        self.add(f"<circle cx='{x}' cy='{y}' r='60' fill='{col}' fill-opacity='0.07'/>")
        self.add(f"<polygon points='{x},{y - 11} {x + 8},{y} {x},{y + 11} {x - 8},{y}' fill='{col}' stroke='#0f0d0c' stroke-width='1.5'/>")
        return self

    def zone(self, x, y, w, h, color, op=0.16, label=None, lcolor=None):
        self.add(f"<rect x='{x}' y='{y}' width='{w}' height='{h}' rx='14' fill='{color}' fill-opacity='{op}' stroke='{color}' stroke-opacity='0.6' stroke-width='2' stroke-dasharray='8 6'/>")
        if label:
            self.text(x + w / 2, y + 22, label, 15, lcolor or color, 'middle', 'bold')
        return self

    def hlane(self, y, x1=40, x2=760, h=86, river=True):
        self.rect(x1, y - h / 2, x2 - x1, h, LANE, 10)
        if river:
            mx = (x1 + x2) / 2
            self.rect(mx - 18, y - h / 2, 36, h, RIVER, 0, op=0.8)
        return self

    def legend(self, items, x=24, y=430):
        cx = x
        for kind, lab in items:
            if kind == 'ally':
                self.minion(cx + 7, y - 5, 'a')
            elif kind == 'enemy':
                self.minion(cx + 7, y - 5, 'e')
            elif kind == 'ward':
                self.add(f"<polygon points='{cx + 7},{y - 15} {cx + 14},{y - 5} {cx + 7},{y + 5} {cx},{y - 5}' fill='{GOLD}'/>")
            elif kind == 'pink':
                self.add(f"<polygon points='{cx + 7},{y - 15} {cx + 14},{y - 5} {cx + 7},{y + 5} {cx},{y - 5}' fill='#e05bd8'/>")
            self.text(cx + 22, y, lab, 14, MUTED, 'start')
            cx += 30 + len(lab) * 7.4
        return self

    # ----- carte simplifiée (alliés en bas à gauche, ennemis en haut à droite) -----
    def map(self, x0, y0, s, river=True, labels=True):
        P = lambda u, v: (round(x0 + u * s, 1), round(y0 + v * s, 1))
        self.rect(x0, y0, s, s, '#1b1714', 18, '#2e2622', 2)
        # jungle (zones)
        self.add(f"<polygon points='{' '.join('%s,%s' % P(u, v) for u, v in [(0.16, 0.30), (0.16, 0.84), (0.45, 0.55)])}' fill='#1f2a1c' opacity='0.9'/>")
        self.add(f"<polygon points='{' '.join('%s,%s' % P(u, v) for u, v in [(0.16, 0.84), (0.70, 0.84), (0.45, 0.55)])}' fill='#1f2a1c' opacity='0.9'/>")
        self.add(f"<polygon points='{' '.join('%s,%s' % P(u, v) for u, v in [(0.30, 0.16), (0.84, 0.16), (0.55, 0.45)])}' fill='#2a1c1c' opacity='0.9'/>")
        self.add(f"<polygon points='{' '.join('%s,%s' % P(u, v) for u, v in [(0.84, 0.16), (0.84, 0.70), (0.55, 0.45)])}' fill='#2a1c1c' opacity='0.9'/>")
        if river:
            a, b = P(0.12, 0.12), P(0.88, 0.88)
            self.line(a[0], a[1], b[0], b[1], RIVER, s * 0.09, op=0.9)
        lw = max(8, s * 0.035)
        for pts in ([(0.08, 0.92), (0.08, 0.08), (0.92, 0.08)], [(0.08, 0.92), (0.92, 0.92), (0.92, 0.08)], [(0.08, 0.92), (0.92, 0.08)]):
            self.poly([P(u, v) for u, v in pts], '#3a302a', lw)
        bx, by = P(0.08, 0.92)
        rx, ry = P(0.92, 0.08)
        self.circle(bx, by, s * 0.06, ALLY, op=0.85)
        self.circle(rx, ry, s * 0.06, ENEMY, op=0.85)
        self.pit = {'baron': P(0.33, 0.33), 'drake': P(0.67, 0.67)}
        for k, (px, py) in self.pit.items():
            self.circle(px, py, s * 0.045, '#14110f', '#8a7a6e', 2)
        if labels:
            self.text(P(0.04, 0.5)[0] - 4, P(0.04, 0.5)[1], 'TOP', 13, MUTED, 'middle', 'bold')
            self.text(P(0.5, 0.97)[0], P(0.5, 0.97)[1] + 4, 'BOT', 13, MUTED, 'middle', 'bold')
        self.P = P
        return self

    def render(self):
        defs = ''.join(
            f"<marker id='{mid}' viewBox='0 0 10 10' refX='7' refY='5' markerWidth='5' markerHeight='5' orient='auto-start-reverse'><path d='M0,0 L10,5 L0,10 z' fill='{col}'/></marker>"
            for mid, col in sorted(self.markers))
        return (f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {self.w} {self.h}' font-family='Segoe UI, system-ui, sans-serif'>"
                f"<defs>{defs}</defs><rect width='{self.w}' height='{self.h}' rx='16' fill='{BG}'/>" + ''.join(self.parts) + '</svg>')
