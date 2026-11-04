# Les schémas des rubriques « Lanes et principes ».
from svg import Svg, ALLY, ENEMY, FG, MUTED, OK, GOLD


def carte_timers():
    s = Svg().title('La carte et les objectifs', 'Saison 2026 : ton équipe part d’en bas à gauche')
    s.map(40, 66, 350)
    bx, by = s.pit['baron']
    dx, dy = s.pit['drake']
    s.text(bx, by + 5, 'B', 15, FG, 'middle', 'bold')
    s.text(dx, dy + 5, 'D', 15, FG, 'middle', 'bold')
    s.text(40, 438, 'Ta base : en bas à gauche (bleu)', 14, ALLY, 'start')
    s.line(bx + 20, by - 4, 470, 140, MUTED, 1.5, '4 4')
    s.line(dx + 20, dy, 470, 318, MUTED, 1.5, '4 4')
    s.lines(480, 112, ['Fosse du haut (B)'], 17, FG, weight='bold')
    s.lines(480, 140, ['8:00  Larves du Néant (une seule fois)', '15:00  Héraut de la Faille (une fois)', '20:00  Baron Nashor (+6 min après', '           chaque Baron tué)'], 15, MUTED, gap=24)
    s.lines(480, 300, ['Fosse du bas (D)'], 17, FG, weight='bold')
    s.lines(480, 328, ['5:00  Premier dragon', 'Âme au 4e dragon d’une équipe,', 'puis Dragon ancestral'], 15, MUTED, gap=24)
    s.text(480, 420, 'Sbires : 0:30', 15, GOLD, 'start', 'bold')
    return s.render()


def etats_wave():
    s = Svg(800, 470).title('Les 3 façons de jouer sa wave', 'Ta tour à gauche (bleu), la tour adverse à droite (rouge)')
    rows = [(130, 'Slow push', 'grossit peu à peu', 'slow'), (250, 'Fast push', 'crash sous sa tour', 'fast'), (370, 'Freeze', 'reste devant ta tour', 'freeze')]
    for y, name, sub, kind in rows:
        s.hlane(y, 150, 770, 76)
        s.tower(178, y, 'a')
        s.tower(742, y, 'e')
        s.text(24, y - 4, name, 18, FG, 'start', 'bold')
        s.text(24, y + 18, sub, 13, MUTED, 'start')
        if kind == 'slow':
            s.wave(500, y, 'a', 9, 3)
            s.wave(560, y, 'e', 3, 3)
            s.arrow([(530, y - 30), (640, y - 30)], ALLY)
            s.text(600, y + 34, '9 contre 3', 13, MUTED)
        elif kind == 'fast':
            s.wave(690, y, 'a', 6, 3)
            s.arrow([(560, y - 30), (680, y - 30)], ALLY)
            s.text(600, y + 34, 'crash : tu peux back ou roam', 13, MUTED)
        else:
            s.wave(282, y, 'e', 6, 3)
            s.wave(226, y, 'a', 3, 3)
            s.zone(320, y - 34, 240, 68, ENEMY, 0.12)
            s.text(440, y + 5, 'zone de danger pour lui', 14, ENEMY, 'middle', 'bold')
    return s.render()


def freeze():
    s = Svg().title('Le freeze', 'Tu gardes la wave juste devant ta tour, sans la laisser entrer dedans')
    s.hlane(250, 40, 760, 120)
    s.tower_range(150, 250, 110, 'a')
    s.tower(150, 250, 'a', 'ta tour')
    s.wave(266, 250, 'a', 3, 3)
    s.wave(322, 250, 'e', 7, 3)
    s.champ(236, 214, 'a', 'T')
    s.text(236, 182, 'toi', 14, ALLY)
    s.zone(390, 190, 180, 120, ENEMY, 0.12, 'il doit venir ici')
    s.champ(640, 250, 'e', 'A')
    s.text(640, 292, "l\u2019adversaire", 14, ENEMY)
    s.arrow([(618, 250), (500, 250)], ENEMY, 3, '7 6')
    s.champ(440, 372, 'a', 'J')
    s.text(440, 412, 'ton jungler', 14, ALLY)
    s.arrow([(452, 352), (474, 300)], ALLY)
    s.lines(540, 352, ['Il y a un peu plus de sbires', 'adverses : la wave reste chez toi.', 'Tu ne tues que le dernier coup.'], 14, MUTED)
    return s.render()


def niveau2():
    s = Svg().title('Bot : la course au niveau 2', 'Niveau 2 = 1re wave complète + 3 sbires mêlée de la 2e')
    s.hlane(250, 40, 760, 110)
    s.tower(80, 250, 'a')
    s.tower(720, 250, 'e')
    s.text(260, 160, '1re wave : 6 sbires', 15, FG, 'middle', 'bold')
    s.wave(260, 250, 'e', 6, 3, 22, 9)
    s.text(470, 160, '2e wave : 3 mêlée', 15, GOLD, 'middle', 'bold')
    s.wave(470, 250, 'e', 3, 3, 22, 9)
    s.circle(470, 250, 44, 'none', GOLD, 2)
    s.champ(160, 330, 'a', 'A', label='ADC')
    s.champ(220, 345, 'a', 'S', label='support')
    s.arrow([(250, 320), (400, 290)], ALLY)
    s.lines(520, 330, ['Le duo qui y arrive le premier', 'peut engager tout de suite.', 'Tapez fort la 1re wave à deux !'], 15, MUTED)
    return s.render()


def gank():
    s = Svg().title('Un bon gank', 'La wave est chez toi, l’adversaire a avancé : tu arrives par derrière')
    s.hlane(200, 40, 760, 100, river=False)
    s.tower(80, 200, 'a', 'ta tour')
    s.tower(720, 200, 'e', 'sa tour')
    s.wave(190, 200, 'e', 6, 3)
    s.wave(160, 200, 'a', 3, 3)
    s.champ(150, 150, 'a', 'T')
    s.champ(300, 200, 'e', 'A', ring=ENEMY)
    s.rect(380, 280, 380, 140, '#1f2a1c', 14, op=0.9)
    s.text(570, 405, 'jungle / rivière', 14, MUTED)
    s.champ(470, 330, 'a', 'J')
    s.arrow([(455, 315), (345, 230)], ALLY, 4)
    s.arrow([(300, 200), (470, 200)], ENEMY, 3, '6 6')
    s.text(530, 175, 'sa fuite est longue', 14, ENEMY, 'middle', 'bold')
    s.lines(40, 310, ['Bons signes :', '✓ wave proche de ta tour', '✓ il n’a pas de Flash', '✓ pas de ward sur ton chemin'], 15, OK, gap=24)
    return s.render()


def chemin_jungle():
    s = Svg().title('Choisir son chemin', 'Exemple : commencer en haut, finir en bas pour le drake ou un gank bot')
    s.map(40, 70, 360, labels=True)
    P = s.P
    camps = [(0.23, 0.45), (0.17, 0.35), (0.27, 0.59), (0.41, 0.68), (0.53, 0.75), (0.44, 0.83)]
    s.arrow([P(u, v) for u, v in camps] + [P(0.60, 0.80)], GOLD, 3)
    for i, (u, v) in enumerate(camps):
        x, y = P(u, v)
        s.circle(x, y, 11, '#1a1614', GOLD, 2)
        s.text(x, y + 5, str(i + 1), 13, GOLD, 'middle', 'bold')
    s.lines(450, 300, ['1 Bleu \u2022 2 Gromp \u2022 3 Loups', '4 Rapaces \u2022 5 Rouge \u2022 6 Krugs'], 14, GOLD, gap=21)
    s.lines(450, 110, ['1. Pars du côté opposé', '    à celui où tu veux finir.', '2. Fais tes camps sans t’arrêter.', '3. Finis près de la lane à ganker', '    ou de la scuttle / du drake.'], 16, FG, gap=26)
    s.lines(450, 240, ['Avant la game : quelle lane peut', 'être gankée ? De quel côté joue ton équipe ?'], 14, MUTED, gap=21)
    s.text(450, 372, 'Un exemple de full clear,', 14, MUTED, 'start', italic=True)
    s.text(450, 394, 'pas un ordre obligatoire.', 14, MUTED, 'start', italic=True)
    return s.render()


def roam_mid():
    s = Svg().title('Mid : pousser puis bouger', 'Crash ta wave, puis va là où il y a quelque chose à gagner')
    s.map(40, 70, 360)
    P = s.P
    mx, my = P(0.5, 0.5)
    s.wave(mx + 34, my - 34, 'a', 4, 2, 14, 6)
    s.champ(mx - 8, my + 8, 'a', 'M', 15)
    bx, by = P(0.80, 0.90)
    s.champ(bx, by - 2, 'e', 'A', 14)
    s.arrow([(mx - 6, my + 28), P(0.62, 0.70), (bx - 22, by - 14)], ALLY, 3)
    wx, wy = P(0.36, 0.40)
    s.ward(wx, wy)
    wx2, wy2 = P(0.60, 0.62)
    s.ward(wx2, wy2)
    s.lines(450, 110, ['1. Pousse : ta wave arrive', '    sous sa tour.', '2. Pars par la rivière', '    (avec une ward devant toi).', '3. Gagne quelque chose : un kill,', '    le drake, une ward, un camp.'], 16, FG, gap=26)
    s.lines(450, 300, ['Si ton adversaire disparaît :', 'ping « MIA » tout de suite.'], 15, ENEMY, gap=22)
    s.legend([('ally', 'tes sbires'), ('ward', 'ward')], 450, 400)
    return s.render()


def fight():
    s = Svg().title('Se placer en fight', 'Les tanks devant, les carrys derrière, à portée')
    s.rect(40, 80, 720, 320, '#1b1714', 16, '#2e2622', 2)
    s.line(400, 90, 400, 390, '#2e2622', 2, '6 6')
    s.zone(70, 110, 140, 260, ALLY, 0.08)
    s.zone(230, 110, 140, 260, ALLY, 0.12)
    s.text(140, 360, 'carrys', 15, ALLY, 'middle', 'bold')
    s.text(300, 360, 'frontline', 15, ALLY, 'middle', 'bold')
    s.champ(130, 180, 'a', 'A', label='ADC')
    s.champ(150, 290, 'a', 'M', label='mid')
    s.champ(300, 170, 'a', 'T', label='top / tank')
    s.champ(320, 270, 'a', 'J', label='jungle')
    s.champ(250, 320, 'a', 'S', 16)
    s.champ(470, 190, 'e', 'T')
    s.champ(500, 290, 'e', 'J')
    s.champ(640, 200, 'e', 'A')
    s.champ(620, 300, 'e', 'M')
    s.champ(560, 350, 'e', 'S', 16)
    s.arrow([(150, 175), (448, 188)], ALLY, 3)
    s.text(300, 100, "l\u2019ADC tape ce qui est à portée", 14, ALLY, 'middle', 'bold')
    s.text(580, 425, 'Ne passe jamais devant ta frontline pour un kill.', 15, MUTED)
    return s.render()


def conceder():
    s = Svg().title('Concéder, puis échanger', 'Ils prennent le drake à 5 : vous prenez quelque chose de l’autre côté')
    s.map(40, 70, 360)
    P = s.P
    dx, dy = s.pit['drake']
    for i, (ox, oy) in enumerate([(-22, -18), (20, -24), (26, 14), (-16, 22), (0, 0)]):
        s.circle(dx + ox * 1.3, dy + oy * 1.3, 9, ENEMY, '#0f0d0c', 1.5)
    s.text(dx, dy + 52, '5 adversaires', 13, ENEMY)
    bx, by = s.pit['baron']
    tx, ty = P(0.08, 0.35)
    s.circle(bx - 10, by, 9, ALLY, '#0f0d0c', 1.5)
    s.circle(bx + 14, by + 8, 9, ALLY, '#0f0d0c', 1.5)
    s.circle(tx + 6, ty - 40, 9, ALLY, '#0f0d0c', 1.5)
    s.circle(tx + 22, ty - 52, 9, ALLY, '#0f0d0c', 1.5)
    s.rect(tx - 10, ty - 92, 20, 20, '#1a1614', 3, ENEMY, 3)
    s.arrow([(dx - 30, dy - 30), (bx + 30, by + 30)], GOLD, 3, '8 6')
    s.lines(450, 110, ['À la place d’un fight perdu :', '• une tour top ou mid', '• les larves ou le Héraut', '• la jungle adverse', '• des waves et des plates'], 16, FG, gap=27)
    s.lines(450, 290, ['Décide-le 30 secondes avant,', 'et dis-le : « on lâche le drake,', 'on prend top ».'], 15, MUTED, gap=23)
    return s.render()


def vision_drake():
    s = Svg().title('Préparer un dragon', '1 minute avant : wards autour de la fosse, lanes poussées')
    s.map(40, 70, 360)
    P = s.P
    dx, dy = s.pit['drake']
    s.text(dx, dy + 5, 'D', 15, FG, 'middle', 'bold')
    for u, v in [(0.58, 0.58), (0.76, 0.62), (0.70, 0.78), (0.62, 0.80)]:
        x, y = P(u, v)
        s.ward(x, y)
    x, y = P(0.74, 0.70)
    s.ward(x, y, pink=True)
    mx, my = P(0.5, 0.5)
    s.wave(mx + 26, my - 26, 'a', 4, 2, 13, 6)
    bx, by = P(0.92, 0.75)
    s.wave(bx, by - 20, 'a', 4, 2, 13, 6)
    s.lines(450, 110, ['• Mid et bot poussent leur wave', '• Wards dans la rivière et', '   à l’entrée de sa jungle', '• Une pink près de la fosse', '• Le jungler a son Smite', '• Tout le monde arrive ensemble'], 16, FG, gap=27)
    s.legend([('ward', 'ward'), ('pink', 'pink'), ('ally', 'tes sbires')], 450, 400)
    return s.render()


def split():
    s = Svg().title('Le split push (side lane)', 'Un joueur pousse sur le côté, les 4 autres font pression ailleurs')
    s.map(40, 70, 360)
    P = s.P
    tx, ty = P(0.30, 0.08)
    s.champ(tx - 20, ty + 4, 'a', 'T', 14)
    s.arrow([(tx - 4, ty + 4), (tx + 60, ty + 4)], ALLY, 3)
    s.rect(tx + 66, ty - 6, 20, 20, '#1a1614', 3, ENEMY, 3)
    for u, v in [(0.46, 0.60), (0.52, 0.62), (0.50, 0.68), (0.44, 0.66)]:
        x, y = P(u, v)
        s.circle(x, y, 9, ALLY, '#0f0d0c', 1.5)
    wx, wy = P(0.30, 0.22)
    s.ward(wx, wy)
    s.lines(450, 110, ['Règles du side lane :', '• une ward devant toi', '• si 2 adversaires disparaissent,', '   recule', '• ne meurs pas sans que ton équipe', '   prenne quelque chose ailleurs'], 16, FG, gap=27)
    s.legend([('ally', 'alliés'), ('ward', 'ward')], 450, 400)
    return s.render()


def wards_def_off():
    s = Svg().title('Wards défensives et offensives', 'D = chez toi, pour te protéger · O = chez lui, pour le suivre')
    s.map(40, 70, 360)
    P = s.P
    spots_d = [(0.16, 0.22), (0.30, 0.50), (0.48, 0.70), (0.78, 0.86), (0.40, 0.38)]
    spots_o = [(0.52, 0.30), (0.70, 0.48), (0.62, 0.20), (0.84, 0.60)]
    for u, v in spots_d:
        x, y = P(u, v)
        s.add(f"<polygon points='{x},{y - 11} {x + 8},{y} {x},{y + 11} {x - 8},{y}' fill='{ALLY}' stroke='#0f0d0c' stroke-width='1.5'/>")
        s.text(x + 15, y + 5, 'D', 14, ALLY, 'start', 'bold')
    for u, v in spots_o:
        x, y = P(u, v)
        s.add(f"<polygon points='{x},{y - 11} {x + 8},{y} {x},{y + 11} {x - 8},{y}' fill='{GOLD}' stroke='#0f0d0c' stroke-width='1.5'/>")
        s.text(x + 15, y + 5, 'O', 14, GOLD, 'start', 'bold')
    s.lines(450, 108, ['Défensives (D)'], 17, ALLY, weight='bold')
    s.lines(450, 134, ['ta jungle, ton tri-bush, ta rivière', 'voir arriver un gank ou une invasion', 'quand vous êtes derrière ou en side'], 15, MUTED, gap=22)
    s.lines(450, 240, ['Offensives (O)'], 17, GOLD, weight='bold')
    s.lines(450, 266, ['sa jungle, ses buffs, ses entrées', 'suivre son jungler, préparer un gank', 'avec la prio, jamais seul sans vision'], 15, MUTED, gap=22)
    s.text(450, 400, 'Les emplacements sont des exemples.', 14, MUTED, 'start', italic=True)
    return s.render()


ALL = {
    'carte_timers': carte_timers, 'etats_wave': etats_wave, 'freeze': freeze, 'niveau2': niveau2, 'gank': gank,
    'chemin_jungle': chemin_jungle, 'roam_mid': roam_mid, 'fight': fight, 'conceder': conceder,
    'vision_drake': vision_drake, 'split': split, 'wards_def_off': wards_def_off
}
