# Les visuels animés de la rubrique « Lanes et principes » : un par principe.
# Clé : (id du thème, numéro du principe à partir de 0). Les schémas fixes de schemas.py restent utilisés là où ils suffisent.
from anim import A, cards, timeline, bars, BAD, PINK
from svg import ALLY, ENEMY, FG, MUTED, OK, GOLD

LY = 215  # hauteur de la lane dans les scènes de lane


def M(title, sub, dur=7):
    s = A(dur).title(title, sub)
    s.map(40, 66, 340)
    return s


def L(title, sub, dur=6, river=True):
    s = A(dur).title(title, sub)
    s.lane(LY, 120, river)
    return s


# ======================= Les bases =======================
def bases_golds():
    s = L('Golds et XP', 'Le dernier coup sur un sbire donne les golds, être proche donne l’XP', 6)
    s.add(f"<circle cx='300' cy='{LY}' r='120' fill='{ALLY}' fill-opacity='0.06' stroke='{ALLY}' stroke-opacity='0.4' stroke-dasharray='6 6'/>")
    s.text(300, LY - 128, 'zone d’XP', 13, ALLY)
    s.champ(300, LY - 40, 'a', 'T')
    xs = [380, 400, 420, 380, 400, 420]
    ys = [LY - 10, LY - 10, LY - 10, LY + 12, LY + 12, LY + 12]
    for i, (x, y) in enumerate(zip(xs, ys)):
        t = 0.1 + i * 0.12
        s.show_at(x, y, s.g_wave('e', 1, 1), 0, t)
        s.shot(300, LY - 40, x, y, GOLD, t - 0.05, 0.05, 5)
        s.show_at(x, y - 20, s.g_text('+💰', 15, GOLD, 'middle', 'bold'), t, t + 0.12)
    s.show_at(560, LY + 4, s.g_text('Raté = golds perdus', 16, BAD, 'middle', 'bold'), 0.82, 0.98)
    s.captions([(0.02, 0.5, '💰 Tu donnes le dernier coup : tu gagnes les golds'), (0.5, 0.98, '✨ Même sans le tuer, tu gagnes l’XP si tu es dans la zone', ALLY)])
    return s.render()


def bases_mort():
    s = L('Mourir coûte cher', 'Ce que tu perds pendant que tu es mort', 7)
    s.champ(250, LY - 40, 'e', 'A')
    s.move_champ('a', 'T', [(380, LY - 30), (380, LY - 30)], None, 0, 0.18)
    s.show_at(380, LY - 30, s.g_text('💀', 34, FG), 0.18, 0.98)
    s.shot(250, LY - 40, 380, LY - 30, ENEMY, 0.12)
    s.move_wave('e', 6, [(560, LY + 10), (160, LY + 10)], [(0.25, 0), (0.6, 1)], 0.2, 0.98)
    s.boom(80, LY, 0.62, BAD, '− plate')
    s.boom(80, LY, 0.7, BAD)
    s.captions([(0.02, 0.24, '1. Tu meurs : l’adversaire gagne des golds', BAD), (0.25, 0.6, '2. Sa wave arrive : tu perds tes sbires'),
                (0.61, 0.98, '3. Ta tour prend des dégâts : reculer valait plus qu’un kill', GOLD)])
    return s.render()


def bases_minimap():
    s = M('La minimap', 'Quand un adversaire disparaît, recule', 7)
    P = s.P
    s.move_champ('e', 'J', [P(0.62, 0.30), P(0.48, 0.22), P(0.33, 0.30), P(0.22, 0.20)], [(0, 0), (0.25, 1), (0.45, 2), (0.6, 3)], 0, 0.42, 13)
    s.show_at(*P(0.33, 0.30), s.g_text('?', 30, ENEMY, 'middle', 'bold'), 0.45, 0.98)
    s.boom(*P(0.12, 0.14), 0.5, ENEMY, 'MIA !')
    s.move_champ('a', 'T', [P(0.10, 0.10), P(0.10, 0.10), P(0.08, 0.30)], [(0, 0), (0.55, 1), (0.75, 2)], 0, 1, 13)
    s.steps([(0.05, ['1. Le jungler adverse est visible', '   puis il passe la rivière']), (0.45, ['2. Il disparaît : ping « MIA »'], ENEMY), (0.65, ['3. Le top recule vers sa tour'], OK),
             (0.8, ['Regarde la minimap', 'après chaque last-hit'], GOLD)])
    return s.render()


def bases_timers():
    return timeline('Les timers de la saison 2026', 'Ce qui apparaît sur la carte, et quand', [
        (0.025, '0:30', 'premiers sbires', ALLY), (0.25, '5:00', 'premier dragon', GOLD), (0.4, '8:00', 'larves du Néant', PINK),
        (0.75, '15:00', 'Héraut', '#4cc38a'), (1.0, '20:00', 'Baron Nashor', ENEMY)], 9)


def bases_comm():
    return cards('Communiquer simplement', 'Des pings et des phrases courtes', [
        ('🔙', 'Je back', 'pour que l’équipe sache', 'neutre'), ('🐉', 'Je viens drake', 'annoncer avant d’y aller', 'neutre'),
        ('⚡', 'Flash adverse : off', 'avec l’heure de retour', 'good'), ('❓', 'MIA', 'un adversaire a disparu', 'warn'),
        ('🚫', 'Pas de reproches', 'ça ne fait jamais gagner', 'bad'), ('👍', 'Pings positifs', 'après une bonne action', 'good')], 2, 7)


# ======================= Gérer sa wave =======================
def wave_slow():
    s = L('Le slow push', 'Tue ses sbires à distance en premier : ta wave grossit à chaque vague', 8)
    s.move_wave('a', 3, [(360, LY), (470, LY)], [(0, 0), (0.3, 1)], 0, 0.3)
    s.move_wave('a', 6, [(470, LY), (560, LY)], [(0.3, 0), (0.6, 1)], 0.3, 0.6)
    s.move_wave('a', 9, [(560, LY), (680, LY)], [(0.6, 0), (0.85, 1)], 0.6, 0.92)
    s.move_wave('e', 3, [(560, LY + 2), (520, LY + 2)], [(0, 0), (0.3, 1)], 0, 0.3)
    s.boom(690, LY, 0.86, GOLD, 'Grosse wave !')
    for t, c in ((0.12, '3'), (0.42, '6'), (0.7, '9')):
        s.show_at(400 + int(c) * 18, LY - 60, s.g_text(f'{c} sbires', 15, ALLY, 'middle', 'bold'), t, t + 0.22)
    s.captions([(0.02, 0.3, '1. Tu tues d’abord ses sbires à distance'), (0.3, 0.62, '2. Ta wave garde plus de sbires et grossit'),
                (0.62, 0.98, '3. Une grosse wave arrive sous sa tour : back ou objectif', OK)])
    return s.render()


def wave_fast():
    s = L('Le fast push (crash)', 'Tu tapes tout vite : ta wave s’écrase sous sa tour, puis tu bouges', 6)
    s.move_wave('e', 3, [(560, LY), (520, LY)], [(0, 0), (0.15, 1)], 0, 0.3)
    s.move_wave('a', 6, [(430, LY), (470, LY), (690, LY)], [(0, 0), (0.15, 1), (0.5, 2)], 0, 0.62)
    s.move_champ('a', 'T', [(360, LY - 50), (440, LY - 45), (560, LY - 50), (560, LY - 50)], [(0, 0), (0.15, 1), (0.5, 2), (0.62, 3)], 0, 0.8)
    for t in (0.18, 0.24, 0.3):
        s.shot(450, LY - 45, 520, LY - 5, GOLD, t)
    s.boom(690, LY, 0.5, GOLD, 'Crash !')
    s.recall(560, LY - 50, 0.62, 0.8)
    s.show_at(80, LY + 90, s.g_text('🏠 retour à la base', 15, ALLY, 'start', 'bold'), 0.8, 0.97)
    s.captions([(0.02, 0.32, '1. Tu tues ses sbires le plus vite possible'), (0.33, 0.6, '2. Ta wave s’écrase sous sa tour'),
                (0.61, 0.98, '3. Tu back ou tu roam sans perdre de sbires', OK)])
    return s.render()


def wave_back():
    s = A(8).title('Back au bon moment', 'En haut : bon timing · en bas : mauvais timing')
    for y, good in ((150, True), (320, False)):
        s.hlane(y, 40, 760, 90)
        s.tower(80, y, 'a')
        s.tower(720, y, 'e')
        s.text(40, y - 54, '✓ Crash, puis back' if good else '✗ Back avec une grosse wave adverse', 16, OK if good else BAD, 'start', 'bold')
        if good:
            s.move_wave('a', 6, [(420, y), (690, y)], [(0, 0), (0.35, 1)], 0, 0.45)
            s.boom(690, y, 0.36, GOLD)
            s.move_champ('a', 'T', [(480, y - 2), (480, y - 2)], None, 0, 0.6)
            s.recall(480, y - 2, 0.4, 0.6)
            s.move_wave('e', 3, [(640, y), (420, y)], [(0.5, 0), (0.95, 1)], 0.5, 0.98)
            s.show_at(400, y + 34, s.g_text('la wave revient doucement au milieu : tu ne perds rien', 14, OK), 0.65, 0.98)
        else:
            s.move_champ('a', 'T', [(330, y - 2), (330, y - 2)], None, 0, 0.3)
            s.recall(330, y - 2, 0.1, 0.3)
            s.move_wave('e', 9, [(520, y), (120, y)], [(0.15, 0), (0.6, 1)], 0.15, 0.85)
            s.boom(80, y, 0.62, BAD, '− plate')
            s.show_at(400, y + 34, s.g_text('9 sbires perdus et ta tour prend des dégâts', 14, BAD), 0.65, 0.98)
    return s.render()


def wave_erreurs():
    return cards('Les erreurs de wave', 'À éviter', [
        ('🙈', 'Pousser sans info', 'le jungler adverse n’a pas été vu', 'bad'), ('🔨', 'Taper sans plan', 'sans savoir ce que tu veux faire', 'bad'),
        ('🏠', 'Back au mauvais moment', 'une grosse wave arrive chez toi', 'bad'), ('🕳️', 'Suivre la wave trop loin', 'jusqu’à sa tour, sans ward', 'bad')], 2, 7)


# ======================= Lane top =======================
def top_matchup():
    s = A(7).title('Connaître son matchup', 'Qui est le plus fort, et quand ? (exemple)')
    x0, y0, w, hgt = 80, 360, 640, 240
    s.line(x0, y0, x0 + w, y0, '#3a302a', 2)
    s.line(x0, y0, x0, y0 - hgt, '#3a302a', 2)
    for i, lab in enumerate(['niv. 1', 'niv. 3', 'niv. 6', 'milieu de game', 'fin de game']):
        s.text(x0 + i * w / 4, y0 + 24, lab, 13, MUTED)
    s.text(x0 - 10, y0 - hgt + 10, 'force', 13, MUTED, 'end')
    early = [(x0, y0 - 150), (x0 + 160, y0 - 200), (x0 + 320, y0 - 190), (x0 + 480, y0 - 120), (x0 + 640, y0 - 90)]
    late = [(x0, y0 - 80), (x0 + 160, y0 - 95), (x0 + 320, y0 - 130), (x0 + 480, y0 - 180), (x0 + 640, y0 - 220)]
    for pts, col, lab, t0, lp in ((early, ENEMY, 'Fort tôt (ex. Renekton)', 0.05, (x0 + 250, y0 - 225)), (late, ALLY, 'Fort plus tard (ex. Gwen)', 0.35, (x0 + 640, y0 - 245))):
        d = 'M ' + ' L '.join(f'{x},{y}' for x, y in pts)
        s.add(f"<path d='{d}' fill='none' stroke='{col}' stroke-width='5' stroke-linecap='round' stroke-dasharray='900' stroke-dashoffset='900'>"
              f"<animate attributeName='stroke-dashoffset' dur='{s.dur}s' repeatCount='indefinite' values='900;900;0;0' keyTimes='0;{t0};{t0 + 0.25};1'/></path>")
        s.show_at(lp[0], lp[1], s.g_text(lab, 15, col, 'end', 'bold'), t0 + 0.22, 0.98)
    s.show_at(x0 + 420, y0 - 165, s.g_text('les courbes se croisent', 14, GOLD, 'middle', 'bold'), 0.65, 0.98)
    s.pulse(x0 + 410, y0 - 150, GOLD, 0.65)
    return s.render()


def top_trade():
    s = L('Trade quand il last-hit', 'Il s’avance pour un sbire : tu tapes, puis tu recules', 6)
    s.wave(300, LY + 20, 'a', 3)
    s.wave(470, LY + 20, 'e', 3)
    s.show_at(430, LY + 20, s.g_wave('a', 1, 1), 0, 0.35)
    s.move_champ('e', 'A', [(600, LY - 40), (470, LY - 30), (470, LY - 30), (600, LY - 40)], [(0, 0), (0.25, 1), (0.6, 2), (0.85, 3)])
    s.move_champ('a', 'T', [(240, LY - 40), (240, LY - 40), (420, LY - 40), (420, LY - 40), (240, LY - 40)], [(0, 0), (0.28, 1), (0.4, 2), (0.55, 3), (0.75, 4)])
    s.shot(470, LY - 30, 430, LY + 20, ENEMY, 0.3)
    for t in (0.42, 0.47, 0.52):
        s.shot(420, LY - 40, 465, LY - 32, GOLD, t, 0.04)
    s.boom(470, LY - 30, 0.45, GOLD, '−PV')
    s.captions([(0.02, 0.3, '1. Il s’avance pour tuer un sbire'), (0.3, 0.58, '2. Tu fais ton combo pendant ce temps', GOLD),
                (0.58, 0.98, '3. Tu recules : échange court, gagné', OK)])
    return s.render()


def top_wave():
    s = L('La wave en top', 'Devant : garde la wave près de ta tour · Derrière : crash avant de back', 7)
    s.add("<circle cx='80' cy='215' r='105' fill='#4aa3ff' fill-opacity='0.06' stroke='#4aa3ff' stroke-opacity='0.4' stroke-dasharray='6 6'/>")
    s.wave(210, LY, 'a', 3)
    s.wave(262, LY, 'e', 6)
    s.champ(200, LY - 55, 'a', 'T')
    s.move_champ('e', 'A', [(620, LY - 40), (360, LY - 40), (360, LY - 40), (620, LY - 40)], [(0.05, 0), (0.4, 1), (0.6, 2), (0.85, 3)])
    s.zone(320, LY - 60, 180, 120, ENEMY, 0.1)
    s.move_champ('a', 'J', [(400, LY + 120), (380, LY + 40)], [(0.42, 0), (0.6, 1)], 0.42, 0.98, 16)
    s.captions([(0.02, 0.4, '1. Tu freezes : la wave reste juste devant ta tour'), (0.4, 0.65, '2. Pour farmer, il doit s’avancer loin de sa tour', GOLD),
                (0.65, 0.98, '3. Ton jungler arrive : il n’a nulle part où fuir', OK)])
    return s.render()


def top_jungler():
    s = M('Surveiller le jungler adverse', 'Vers 3 minutes, une ward dans la rivière te sauve', 7)
    P = s.P
    wx, wy = P(0.24, 0.22)
    s.show_at(wx, wy, s.g_ward(), 0.08, 0.98)
    s.pulse(wx, wy, GOLD, 0.08)
    s.move_champ('e', 'J', [P(0.55, 0.25), P(0.38, 0.22), P(0.26, 0.20)], [(0.15, 0), (0.45, 1), (0.6, 2)], 0.15, 0.98, 13)
    s.boom(wx, wy, 0.58, ENEMY, 'vu !')
    s.move_champ('a', 'T', [P(0.12, 0.10), P(0.12, 0.10), P(0.08, 0.30)], [(0, 0), (0.62, 1), (0.8, 2)], 0, 1, 13)
    s.steps([(0.05, ['1. Ward dans la rivière vers 3:00']), (0.45, ['2. Le jungler adverse passe', '   dans la vision'], ENEMY), (0.65, ['3. Ping, et tu recules'], OK)])
    return s.render()


def top_tp():
    s = M('Bien utiliser la Téléportation', 'Pousse ta wave, puis TP sur le fight', 8)
    P = s.P
    s.move_wave('a', 6, [P(0.10, 0.12), P(0.22, 0.08)], [(0, 0), (0.3, 1)], 0, 0.35)
    s.move_champ('a', 'T', [P(0.10, 0.18), P(0.10, 0.18)], None, 0, 0.5, 13)
    s.recall(*P(0.10, 0.18), 0.32, 0.5)
    tx, ty = P(0.70, 0.74)
    s.show_at(tx, ty, f"<circle r='22' fill='none' stroke='{PINK}' stroke-width='4' stroke-dasharray='8 6'/>", 0.32, 0.55)
    s.move_champ('a', 'T', [(tx, ty), (tx, ty)], None, 0.5, 0.98, 13)
    s.boom(tx, ty, 0.5, PINK, 'TP !')
    for u, v in ((0.62, 0.74), (0.74, 0.66), (0.68, 0.82)):
        s.show_at(*P(u, v), s.g_champ('a', '', 9), 0, 0.98)
    for u, v in ((0.78, 0.76), (0.80, 0.68), (0.72, 0.60)):
        s.show_at(*P(u, v), s.g_champ('e', '', 9), 0, 0.98)
    s.steps([(0.05, ['1. Tu pousses ta wave d’abord'], FG), (0.32, ['2. Tu lances la TP'], PINK), (0.5, ['3. Tu arrives sur le fight', '   à 4 contre 3'], OK),
             (0.75, ['Sans wave poussée, tu perds', 'tes sbires et ta tour'], BAD)])
    return s.render()


def top_larves():
    s = M('Larves et Héraut', 'Ta prio en top aide ton jungler sur la fosse du haut', 8)
    P = s.P
    bx, by = s.pit['baron']
    s.text(bx, by + 5, '🐛', 18)
    s.move_wave('a', 6, [P(0.10, 0.10), P(0.25, 0.08)], [(0, 0), (0.3, 1)], 0, 0.4)
    s.move_champ('a', 'T', [P(0.10, 0.16), P(0.14, 0.12), P(0.27, 0.27)], [(0, 0), (0.3, 1), (0.55, 2)], 0, 1, 13)
    s.move_champ('a', 'J', [P(0.25, 0.55), P(0.36, 0.38)], [(0.2, 0), (0.55, 1)], 0, 1, 13)
    s.boom(bx, by, 0.62, PINK, '8:00')
    s.steps([(0.05, ['1. 30 s avant : tu pousses ta wave']), (0.3, ['2. Tu rejoins ton jungler']), (0.62, ['3. Larves (8:00) ou Héraut (15:00)', '   à deux contre un'], OK)])
    return s.render()


# ======================= Jungle =======================
def jungle_tempo():
    return cards('Le tempo du jungler', 'À chaque moment, une de ces actions', [
        ('🌲', 'Farmer', 'tes camps dès qu’ils reviennent', 'good'), ('⚔️', 'Ganker', 'seulement si le gank est bon', 'good'),
        ('👁️', 'Poser des wards', 'rivière, jungle adverse', 'good'), ('🐉', 'Préparer un objectif', '1 minute avant', 'good'),
        ('🏠', 'Back', 'avec des golds à dépenser', 'neutre'), ('🚫', 'Attendre sans rien faire', 'le pire choix', 'bad')], 2, 8)


def jungle_track():
    s = M('Suivre le jungler adverse', 'Vu en haut ? Joue en bas', 8)
    P = s.P
    s.move_champ('e', 'J', [P(0.62, 0.22), P(0.52, 0.18)], [(0, 0), (0.25, 1)], 0, 0.5, 13)
    s.boom(*P(0.52, 0.18), 0.25, ENEMY, 'vu en haut')
    d = ' L '.join('%s,%s' % P(u, v) for u, v in ((0.52, 0.18), (0.70, 0.30), (0.80, 0.50)))
    s.add(s.visible(f"<path d='M {d}' fill='none' stroke='{ENEMY}' stroke-width='2' stroke-dasharray='6 6' opacity='0.6'/>", 0.3, 0.98))
    s.move_champ('a', 'J', [P(0.25, 0.60), P(0.50, 0.72), P(0.64, 0.68)], [(0.35, 0), (0.6, 1), (0.8, 2)], 0, 1, 13)
    dx, dy = s.pit['drake']
    s.text(dx, dy + 5, '🐉', 16)
    s.steps([(0.05, ['1. Le jungler adverse est vu en haut'], ENEMY), (0.35, ['2. Il ne peut pas être en bas', '   avant un moment'], FG),
             (0.6, ['3. Tu joues en bas : drake,', '   gank bot ou ses camps'], OK)])
    return s.render()


def jungle_scuttle():
    s = M('Scuttle et rivière', 'Avec la prio de tes lanes, tu y vas à plusieurs', 7)
    P = s.P
    s.move_wave('a', 4, [P(0.50, 0.50), P(0.58, 0.42)], [(0, 0), (0.25, 1)], 0, 0.98, 2)
    s.move_wave('a', 4, [P(0.80, 0.92), P(0.92, 0.82)], [(0, 0), (0.25, 1)], 0, 0.98, 2)
    sx, sy = P(0.705, 0.652)  # scuttle du bas
    s.text(sx, sy + 5, '🦀', 18)
    s.move_champ('a', 'J', [P(0.40, 0.75), P(0.62, 0.64)], [(0.2, 0), (0.5, 1)], 0, 1, 13)
    s.move_champ('a', 'M', [P(0.50, 0.50), P(0.60, 0.56)], [(0.35, 0), (0.55, 1)], 0, 1, 12)
    s.move_champ('e', 'J', [P(0.85, 0.40), P(0.72, 0.56)], [(0.3, 0), (0.55, 1)], 0, 0.8, 13)
    s.boom(sx, sy, 0.6, GOLD, '2 contre 1')
    s.steps([(0.05, ['1. Tes lanes mid et bot poussent']), (0.25, ['2. Tu vas à la scuttle']), (0.55, ['3. Ton mid arrive en premier', '   pour t’aider'], OK)])
    return s.render()


def jungle_objectifs():
    s = M('Préparer un objectif', '1 minute avant : lanes poussées, wards, et Smite à la fin', 8)
    P = s.P
    dx, dy = s.pit['drake']
    s.text(dx, dy + 5, '🐉', 18)
    s.move_wave('a', 4, [P(0.50, 0.50), P(0.58, 0.42)], [(0, 0), (0.2, 1)], 0, 0.98, 2)
    s.move_wave('a', 4, [P(0.80, 0.92), P(0.92, 0.80)], [(0, 0), (0.2, 1)], 0, 0.98, 2)
    for i, (u, v) in enumerate(((0.58, 0.60), (0.76, 0.62), (0.68, 0.80))):
        t = 0.22 + i * 0.06
        s.show_at(*P(u, v), s.g_ward(), t, 0.98)
        s.pulse(*P(u, v), GOLD, t)
    for k, (a, b) in enumerate(((0.40, 0.70), (0.50, 0.52), (0.84, 0.90), (0.86, 0.86))):
        s.move_champ('a', 'JMAS'[k], [P(a, b), P(0.64 + k * 0.02, 0.66 + (k % 2) * 0.04)], [(0.38, 0), (0.6, 1)], 0, 1, 11)
    s.boom(dx, dy, 0.82, GOLD, 'Smite !')
    s.steps([(0.05, ['1. Les lanes poussent']), (0.22, ['2. Wards autour de la fosse'], GOLD), (0.4, ['3. Tout le monde arrive', '   ensemble']), (0.8, ['4. Smite à la fin'], OK)])
    return s.render()


def jungle_invade():
    s = M('Voler la jungle adverse', 'Quand son jungler est de l’autre côté de la carte', 8)
    P = s.P
    s.show_at(*P(0.55, 0.22), s.g_champ('e', 'J', 12), 0, 0.98)
    s.boom(*P(0.55, 0.22), 0.05, ENEMY, 'il est en haut')
    camps = [(0.744, 0.434), (0.749, 0.530), (0.854, 0.567)]  # loups, bleu, gromp adverses
    for i, (u, v) in enumerate(camps):
        t = 0.45 + i * 0.13
        s.show_at(*P(u, v), f"<circle r='9' fill='#3a302a' stroke='{ENEMY}' stroke-width='2'/>", 0, t)
        s.show_at(*P(u, v - 0.05), s.g_text('+💰', 13, GOLD, 'middle', 'bold'), t, t + 0.15)
    s.move_champ('a', 'J', [P(0.55, 0.78), P(0.70, 0.62), P(0.78, 0.40), P(0.82, 0.52), P(0.74, 0.58), P(0.62, 0.68)],
                 [(0.2, 0), (0.35, 1), (0.45, 2), (0.58, 3), (0.71, 4), (0.85, 5)], 0, 1, 12)
    s.steps([(0.05, ['1. Son jungler est vu en haut'], ENEMY), (0.25, ['2. Tu entres dans sa jungle du bas']), (0.6, ['3. Tu prends ses camps et tu repars'], OK)])
    return s.render()


def jungle_erreurs():
    return cards('Les erreurs du jungler', 'À éviter', [
        ('🏰', 'Ganker sous la tour adverse', 'la wave est chez lui', 'bad'), ('🌲', 'Oublier ses camps', 'ils sont revenus', 'bad'),
        ('🙈', 'Objectif sans vision', 'le jungler adverse peut voler', 'bad'), ('⏳', 'Rester sur une lane perdue', 'le temps tourne ailleurs', 'bad'),
        ('⏰', 'Back sans regarder les timers', 'et rater le drake', 'bad')], 2, 8)


# ======================= Mid =======================
def mid_prio():
    s = L('La prio en mid', 'Ta wave pousse : il doit farmer, toi tu es libre de bouger', 7)
    s.move_wave('a', 6, [(430, LY), (690, LY)], [(0, 0), (0.35, 1)], 0, 0.98)
    s.champ(690, LY - 55, 'e', 'M')
    s.show_at(690, LY - 90, s.g_text('bloqué à farmer', 14, ENEMY, 'middle', 'bold'), 0.35, 0.98)
    s.move_champ('a', 'M', [(380, LY - 40), (520, LY - 40), (520, LY - 40), (400, LY - 150), (300, LY - 160)], [(0, 0), (0.3, 1), (0.42, 2), (0.65, 3), (0.85, 4)])
    s.show_at(300, LY - 190, s.g_text('→ scuttle, roam, drake…', 15, OK, 'middle', 'bold'), 0.7, 0.98)
    s.captions([(0.02, 0.38, '1. Tu pousses ta wave sous sa tour'), (0.38, 0.62, '2. Il doit rester pour ne pas perdre ses sbires', GOLD), (0.62, 0.98, '3. Toi, tu bouges en premier', OK)])
    return s.render()


def mid_wards():
    s = M('Des wards des deux côtés', 'Place-toi du côté que tu vois', 7)
    P = s.P
    for i, (u, v) in enumerate(((0.40, 0.38), (0.62, 0.60))):
        t = 0.08 + i * 0.15
        s.show_at(*P(u, v), s.g_ward(), t, 0.98)
        s.pulse(*P(u, v), GOLD, t)
    s.move_champ('a', 'M', [P(0.50, 0.50), P(0.50, 0.50), P(0.46, 0.46)], [(0, 0), (0.4, 1), (0.6, 2)], 0, 1, 13)
    s.move_champ('e', 'J', [P(0.30, 0.20), P(0.38, 0.36)], [(0.55, 0), (0.75, 1)], 0.55, 0.98, 12)
    s.boom(*P(0.38, 0.36), 0.75, ENEMY, 'vu !')
    s.steps([(0.05, ['1. Une ward de chaque côté', '   de la rivière'], GOLD), (0.4, ['2. Tu te places côté jungler adverse']), (0.75, ['3. Il arrive : tu le vois venir'], OK)])
    return s.render()


def mid_follow():
    s = M('Suivre les roams adverses', 'Il disparaît : ping, puis suis-le ou punis-le', 8)
    P = s.P
    s.move_champ('e', 'M', [P(0.54, 0.46), P(0.62, 0.62), P(0.78, 0.82)], [(0, 0), (0.2, 1), (0.4, 2)], 0, 0.25, 12)
    s.boom(*P(0.56, 0.50), 0.22, ENEMY, 'MIA !')
    s.move_wave('a', 6, [P(0.48, 0.52), P(0.58, 0.42)], [(0.35, 0), (0.6, 1)], 0, 0.98, 3)
    s.move_champ('a', 'M', [P(0.46, 0.54), P(0.56, 0.44)], [(0.35, 0), (0.6, 1)], 0, 1, 13)
    s.boom(*P(0.60, 0.40), 0.7, GOLD, 'plates !')
    s.steps([(0.05, ['1. Il disparaît de la lane'], ENEMY), (0.22, ['2. Ping « MIA » tout de suite'], GOLD), (0.45, ['3. Tu le suis, ou tu prends', '   sa wave et ses plates'], OK)])
    return s.render()


def mid_trades():
    s = L('Trades et temps de recharge', 'Il rate son sort : c’est ta fenêtre', 6, river=False)
    s.move_champ('e', 'M', [(560, LY - 30), (560, LY - 30)])
    s.move_champ('a', 'M', [(240, LY - 30), (240, LY - 30), (320, LY - 30), (320, LY - 30), (240, LY - 30)], [(0, 0), (0.15, 1), (0.25, 2), (0.6, 3), (0.8, 4)])
    s.shot(560, LY - 30, 320, LY + 40, ENEMY, 0.08, 0.08, 8)
    s.show_at(560, LY - 80, s.g_text('⏳ sort en recharge', 15, MUTED, 'middle', 'bold'), 0.18, 0.75)
    for t in (0.32, 0.4, 0.48):
        s.shot(320, LY - 30, 555, LY - 30, ALLY, t, 0.06, 7)
    s.boom(560, LY - 30, 0.42, GOLD, '−PV')
    s.captions([(0.02, 0.18, '1. Il lance son sort… et le rate'), (0.18, 0.55, '2. Tu avances et tu fais ton combo', GOLD), (0.6, 0.98, '3. Tu recules avant qu’il récupère son sort', OK)])
    return s.render()


def mid_apres():
    s = M('Mid après la phase de lane', 'Pousse ta wave, puis suis ton jungler sur l’objectif', 7)
    P = s.P
    dx, dy = s.pit['drake']
    s.text(dx, dy + 5, '🐉', 18)
    s.move_wave('a', 6, [P(0.48, 0.52), P(0.58, 0.42)], [(0, 0), (0.25, 1)], 0, 0.98, 3)
    s.move_champ('a', 'M', [P(0.47, 0.53), P(0.55, 0.45), P(0.62, 0.62)], [(0, 0), (0.25, 1), (0.6, 2)], 0, 1, 13)
    s.move_champ('a', 'J', [P(0.40, 0.75), P(0.62, 0.70)], [(0.2, 0), (0.6, 1)], 0, 1, 13)
    s.steps([(0.05, ['1. Tu pousses la wave mid']), (0.3, ['2. Tu rejoins ton jungler']), (0.6, ['3. Vous arrivez ensemble', '   sur l’objectif'], OK)])
    return s.render()


# ======================= Bot =======================
def bot_niveau2():
    s = L('La course au niveau 2', '1re wave complète + 3 sbires de mêlée de la 2e', 7)
    s.champ(250, LY - 55, 'a', 'A')
    s.champ(300, LY - 70, 'a', 'S')
    for i in range(9):
        x = 400 + (i % 3) * 18 + (60 if i >= 6 else 0)
        y = LY - 16 + (i // 3 % 2) * 18 if i < 6 else LY
        t = 0.08 + i * 0.06
        s.show_at(x, y, s.g_wave('e', 1, 1), 0, t)
        s.show_at(330, LY + 70, s.g_text(f'{i + 1} / 9', 22, GOLD, 'middle', 'bold'), t, t + 0.06 if i < 8 else 0.98)
    s.boom(275, LY - 60, 0.62, GOLD, 'NIVEAU 2 !')
    s.move_champ('a', 'S', [(300, LY - 70), (300, LY - 70), (520, LY - 40)], [(0, 0), (0.66, 1), (0.8, 2)], 0.62, 0.98)
    s.show_at(560, LY - 40, s.g_champ('e', 'A'), 0, 0.98)
    s.captions([(0.02, 0.6, 'Tapez fort la 1re wave à deux : comptez les sbires'), (0.6, 0.98, 'Niveau 2 avant eux : on engage !', OK)])
    return s.render()


def bot_adc():
    s = L('ADC : farmer sans mourir', 'Reste derrière tes sbires : ils bloquent les sorts', 6)
    s.wave(400, LY, 'a', 6)
    s.wave(480, LY, 'e', 6)
    s.champ(320, LY, 'a', 'A')
    s.champ(600, LY, 'e', 'S')
    s.shot(600, LY, 418, LY, ENEMY, 0.2, 0.1, 8)
    s.boom(410, LY, 0.3, GOLD, 'bloqué !')
    for t in (0.5, 0.65, 0.8):
        s.shot(320, LY, 470, LY - 8, GOLD, t, 0.05, 5)
    s.captions([(0.02, 0.45, '1. Le support adverse lance son grappin'), (0.3, 0.6, '2. Tes sbires le bloquent', OK), (0.6, 0.98, '3. Tu continues à farmer sans risque', OK)])
    return s.render()


def bot_support():
    s = L('Support : vision et pression', 'Wards dans la rivière, pink dans le buisson', 7)
    s.rect(330, 96, 140, 50, '#1f2a1c', 14)
    s.text(400, 90, 'buisson de la rivière', 13, MUTED)
    s.champ(250, LY + 10, 'a', 'A')
    s.move_champ('a', 'S', [(300, LY - 20), (380, 125), (380, 125), (330, LY - 10)], [(0, 0), (0.2, 1), (0.35, 2), (0.55, 3)])
    s.show_at(420, 120, s.g_ward('a', True), 0.25, 0.98)
    s.pulse(420, 120, PINK, 0.25)
    s.move_champ('a', 'S', [(330, LY - 10), (420, LY - 10), (330, LY - 10)], [(0.6, 0), (0.75, 1), (0.9, 2)], 0.55, 0.98)
    s.champ(560, LY, 'e', 'A')
    s.captions([(0.02, 0.3, '1. Une pink dans le buisson de la rivière', PINK), (0.3, 0.58, '2. Tu reviens près de ton ADC'), (0.58, 0.98, '3. Tu avances quand il farme : l’adversaire recule', OK)])
    return s.render()


def bot_wave():
    s = L('La wave à deux', 'Poussez ensemble, back ensemble', 7)
    s.move_wave('a', 6, [(420, LY), (690, LY)], [(0, 0), (0.35, 1)], 0, 0.45)
    s.boom(690, LY, 0.36, GOLD, 'Crash !')
    for letter, y in (('A', LY - 40), ('S', LY + 50)):
        s.move_champ('a', letter, [(360, y), (520, y), (520, y)], [(0, 0), (0.3, 1), (0.45, 2)], 0, 0.7)
        s.recall(520, y, 0.45, 0.7)
    s.show_at(80, LY + 90, s.g_text('🏠🏠 back ensemble', 15, ALLY, 'start', 'bold'), 0.7, 0.98)
    s.captions([(0.02, 0.4, '1. Vous poussez la wave à deux'), (0.4, 0.7, '2. Crash, puis back en même temps'), (0.7, 0.98, '3. Personne ne reste seul contre deux', OK)])
    return s.render()


def bot_dragon():
    s = M('Le dragon, l’objectif du bot', 'Wave poussée, rivière éclairée, jungler sur la fosse', 7)
    P = s.P
    dx, dy = s.pit['drake']
    s.text(dx, dy + 5, '🐉', 18)
    s.move_wave('a', 6, [P(0.82, 0.92), P(0.92, 0.80)], [(0, 0), (0.25, 1)], 0, 0.98, 3)
    s.move_champ('a', 'S', [P(0.84, 0.88), P(0.74, 0.74)], [(0.2, 0), (0.4, 1)], 0, 1, 11)
    s.show_at(*P(0.74, 0.70), s.g_ward(), 0.42, 0.98)
    s.pulse(*P(0.74, 0.70), GOLD, 0.42)
    s.move_champ('a', 'J', [P(0.42, 0.74), P(0.63, 0.67)], [(0.3, 0), (0.6, 1)], 0, 1, 12)
    s.move_champ('a', 'A', [P(0.88, 0.90), P(0.72, 0.76)], [(0.45, 0), (0.65, 1)], 0, 1, 11)
    s.boom(dx, dy, 0.75, GOLD, 'Dragon !')
    s.steps([(0.05, ['1. Le bot pousse sa wave']), (0.22, ['2. Le support éclaire la rivière'], GOLD), (0.45, ['3. Jungler et duo bot', '   sur le dragon'], OK)])
    return s.render()


def bot_roam():
    s = M('Les roams du support', 'Pendant ce temps, l’ADC joue prudent', 7)
    P = s.P
    s.move_wave('a', 6, [P(0.82, 0.92), P(0.92, 0.82)], [(0, 0), (0.2, 1)], 0, 0.98, 3)
    s.move_champ('a', 'S', [P(0.84, 0.88), P(0.66, 0.66), P(0.54, 0.54)], [(0.15, 0), (0.4, 1), (0.6, 2)], 0, 1, 11)
    s.show_at(*P(0.58, 0.60), s.g_ward(), 0.4, 0.98)
    s.move_champ('a', 'A', [P(0.86, 0.92), P(0.86, 0.92), P(0.72, 0.92)], [(0, 0), (0.25, 1), (0.45, 2)], 0, 1, 11)
    s.boom(*P(0.54, 0.54), 0.65, OK, 'mid 2v1')
    s.steps([(0.05, ['1. Wave bot poussée']), (0.2, ['2. Le support part en mid', '   avec une ward en chemin']), (0.45, ['3. L’ADC recule sous sa tour'], GOLD), (0.65, ['4. Kill ou pression en mid'], OK)])
    return s.render()


def bot_fight():
    s = A(6).title('En fight : la place de l’ADC', 'Derrière sa frontline, il tape le plus proche et recule')
    s.arena(40, 80, 720, 300)
    s.move_champ('a', 'T', [(330, 200), (420, 200)], [(0, 0), (0.25, 1)])
    s.move_champ('a', 'S', [(300, 280), (360, 260)], [(0, 0), (0.3, 1)], 0, 1, 16)
    s.move_champ('a', 'A', [(180, 230), (220, 230), (180, 240), (220, 230), (180, 240)], [(0, 0), (0.25, 1), (0.45, 2), (0.65, 3), (0.85, 4)])
    for t in (0.27, 0.47, 0.67, 0.87):
        s.shot(220, 230, 470, 205, GOLD, t, 0.06, 5)
    s.champ(480, 200, 'e', 'T')
    s.champ(600, 250, 'e', 'A')
    s.captions([(0.02, 0.5, '1. Le tank avance, l’ADC reste derrière lui'), (0.5, 0.98, '2. Il tape, recule, tape : jamais devant sa frontline', OK)], 418)
    return s.render()


# ======================= Fights =======================
def fights_compter():
    s = A(7).title('Avant de fight : compter', 'Nombre, ultimes, Flash, vision')
    for i in range(5):
        s.show_at(120 + i * 60, 140, s.g_champ('a', '', 20), 0, 0.98)
    for i in range(5):
        alive = i < 4
        s.show_at(470 + i * 60, 140, s.g_champ('e', '', 20), 0, 0.98 if alive else 0.15)
        if not alive:
            s.show_at(470 + i * 60, 140, s.g_text('?', 26, ENEMY, 'middle', 'bold'), 0.15, 0.98)
    s.text(400, 147, 'contre', 16, MUTED)
    checks = [('👥', 'Combien de chaque côté ?', 0.2), ('💥', 'Ultimes prêts ?', 0.35), ('⚡', 'Flash prêts ?', 0.5), ('👁️', 'Vision autour ?', 0.65)]
    for i, (ico, t, t0) in enumerate(checks):
        y = 220 + i * 44
        s.show_at(220, y, f"<text x='0' y='0' font-size='22'>{ico}</text><text x='40' y='-2' font-size='17' fill='{FG}' font-weight='bold'>{t}</text>", t0, 0.98)
        s.show_at(560, y - 8, s.g_text('✓', 24, OK, 'middle', 'bold'), t0 + 0.08, 0.98)
    s.show_at(400, 420, s.g_text('Un adversaire invisible ? On ne force rien.', 17, GOLD, 'middle', 'bold'), 0.8, 0.98)
    return s.render()


def fights_roles():
    s = A(7).title('Chacun son rôle', 'Le tank engage, les carrys tapent, quelqu’un protège')
    s.arena(40, 80, 720, 300)
    s.champ(560, 180, 'e', 'A')
    s.champ(520, 260, 'e', 'M')
    s.champ(470, 220, 'e', 'T')
    s.move_champ('a', 'T', [(320, 220), (320, 220), (520, 230)], [(0, 0), (0.15, 1), (0.35, 2)])
    s.boom(520, 230, 0.35, GOLD, 'Engage !')
    s.move_champ('a', 'A', [(170, 200), (170, 200), (250, 210)], [(0, 0), (0.4, 1), (0.55, 2)])
    s.move_champ('a', 'M', [(190, 290), (190, 290), (270, 280)], [(0, 0), (0.4, 1), (0.55, 2)])
    for t in (0.58, 0.68, 0.78):
        s.shot(250, 210, 515, 235, GOLD, t, 0.06, 5)
        s.shot(270, 280, 520, 255, '#b98cff', t + 0.03, 0.06, 6)
    s.move_champ('a', 'S', [(230, 160), (230, 160), (200, 215)], [(0, 0), (0.55, 1), (0.7, 2)], 0, 1, 16)
    s.show_at(200, 250, s.g_text('protège l’ADC', 13, OK, 'middle', 'bold'), 0.7, 0.98)
    s.captions([(0.02, 0.36, '1. Le tank lance le fight'), (0.36, 0.68, '2. Les carrys suivent et tapent', GOLD), (0.68, 0.98, '3. Le support garde ses sorts pour protéger', OK)], 418)
    return s.render()


def fights_cible():
    s = A(7).title('Choisir sa cible', 'Tout le monde sur le même adversaire, à portée')
    s.arena(40, 80, 720, 300)
    tx, ty = 520, 240
    s.champ(600, 170, 'e', 'T')
    s.champ(640, 300, 'e', 'M')
    s.show_at(tx, ty, s.g_champ('e', 'A'), 0, 0.72)
    s.show_at(tx, ty, s.g_text('💀', 30, FG), 0.72, 0.98)
    s.boom(tx, ty, 0.12, GOLD, 'ping !')
    srcs = [(240, 150), (220, 240), (260, 320), (320, 200)]
    for i, (x, y) in enumerate(srcs):
        s.champ(x, y, 'a', 'TAMJ'[i])
        for t in (0.25 + i * 0.03, 0.42 + i * 0.03, 0.58 + i * 0.03):
            s.shot(x, y, tx, ty, GOLD, t, 0.06, 5)
    s.captions([(0.02, 0.22, '1. Un ping sur la cible'), (0.22, 0.7, '2. Tout le monde tape le même adversaire', GOLD), (0.7, 0.98, '3. Il tombe tout de suite : 5 contre 4', OK)], 418)
    return s.render()


def fights_objectif():
    s = M('Les fights autour des objectifs', 'Arriver en premier, ensemble, avec vision', 8)
    P = s.P
    dx, dy = s.pit['drake']
    s.text(dx, dy + 5, '🐉', 18)
    starts = [(0.40, 0.70), (0.50, 0.54), (0.84, 0.92), (0.88, 0.86), (0.30, 0.82)]
    for k, (u, v) in enumerate(starts):
        s.move_champ('a', '', [P(u, v), P(0.60 + (k % 3) * 0.03, 0.66 + (k // 3) * 0.05)], [(0.05, 0), (0.35, 1)], 0, 1, 10)
    for k, (u, v, t) in enumerate(((0.78, 0.40, 0.45), (0.92, 0.55, 0.6), (0.70, 0.30, 0.75))):
        s.move_champ('e', '', [P(u, v), P(0.74, 0.62)], [(t, 0), (t + 0.15, 1)], t, 0.98, 10)
        s.boom(*P(0.74, 0.62), t + 0.15, OK)
    s.steps([(0.05, ['1. Toute ton équipe arrive', '   en premier, ensemble']), (0.45, ['2. Les adversaires arrivent', '   un par un'], ENEMY), (0.62, ['3. Vous gagnez le fight', '   à chaque fois'], OK)])
    return s.render()


def fights_apres():
    s = M('Après le fight', 'Gagné : prends un objectif tout de suite', 8)
    P = s.P
    bx, by = s.pit['baron']
    s.text(bx, by + 5, '👾', 18)
    for k in range(4):
        s.show_at(*P(0.52 + k * 0.03, 0.50), s.g_champ('e', '', 9), 0, 0.15 + k * 0.03)
        s.show_at(*P(0.52 + k * 0.03, 0.50), s.g_text('💀', 14, FG), 0.15 + k * 0.03, 0.98)
    for k in range(4):
        s.move_champ('a', '', [P(0.46 + k * 0.03, 0.56), P(0.34 + k * 0.025, 0.36 + (k % 2) * 0.03)], [(0.3, 0), (0.6, 1)], 0, 1, 10)
    s.boom(bx, by, 0.75, PINK, 'Baron !')
    s.steps([(0.05, ['1. Fight gagné : 4 adversaires morts'], OK), (0.3, ['2. Pas de poursuite :', '   direction l’objectif']), (0.72, ['3. Baron pris, puis on pousse'], PINK)])
    return s.render()


def fights_erreurs():
    return cards('Les erreurs qui perdent les fights', 'À éviter', [
        ('🏃', 'Poursuivre trop loin', 'dans sa jungle sans vision', 'bad'), ('💥', 'Ulti sur un presque mort', 'gâché', 'bad'),
        ('🌲', 'Fight dans le noir', 'sans aucune ward', 'bad'), ('4️⃣', 'Fight à 4 contre 5', 'on attend', 'bad'),
        ('🧍', 'Engager seul', 'l’équipe n’est pas là', 'bad')], 2, 8)


# ======================= Concéder =======================
def conceder_pourquoi():
    return bars('Pourquoi concéder', 'Ce qu’on perd dans chaque cas (exemple)', [
        ('Fight perdu d’avance', 100, BAD, 'le dragon + 3 morts + 1 minute à 2 contre 5'),
        ('Concéder le dragon', 30, GOLD, 'seulement le dragon'),
        ('Concéder + échanger', 10, OK, 'le dragon, mais une tour et des plates pour vous')], 7)


def conceder_quand():
    return cards('Quand concéder un objectif', 'Si une de ces cases est cochée, on lâche', [
        ('👥', 'Moins nombreux', '4 contre 5', 'bad'), ('🌊', 'Pas de prio', 'les lanes sont chez nous', 'bad'),
        ('📈', 'Ils sont plus forts', 'niveaux et objets', 'bad'), ('🙈', 'Pas de vision', 'autour de la fosse', 'bad'),
        ('💥', 'Ultis et Flash pas prêts', '', 'bad'), ('🏃', 'On arrive trop tard', 'l’objectif tombe déjà', 'bad')], 2, 8)


def conceder_tour():
    s = L('Lâcher une tour plutôt que mourir', 'Trois adversaires plongent : tu recules', 7, river=False)
    s.champ(120, LY - 10, 'a', 'T')
    s.move_champ('a', 'T', [(120, LY - 10), (120, LY - 10), (-20, LY - 10)], [(0, 0), (0.3, 1), (0.5, 2)], 0, 0.5)
    for k in range(3):
        s.move_champ('e', 'TJM'[k], [(560 + k * 40, LY - 40 + k * 30), (180 + k * 25, LY - 30 + k * 25)], [(0.05, 0), (0.35, 1)])
    s.show_at(80, LY, s.cap(lambda: s.tower(0, 0, 'a')), 0, 0.7)
    s.boom(80, LY, 0.7, BAD, 'tour perdue')
    s.show_at(400, LY + 80, s.g_text('1 tour  <  1 mort + la tour', 22, OK, 'middle', 'bold'), 0.75, 0.98)
    s.captions([(0.02, 0.3, '1. Trois adversaires arrivent sur ta tour', ENEMY), (0.3, 0.7, '2. Tu recules au lieu de te battre seul'), (0.7, 0.98, '3. Tu perds la tour… mais pas la tour ET ta vie', OK)])
    return s.render()


def conceder_retard():
    s = L('Quand on est en retard', 'Farmer en sécurité, attendre l’erreur', 7)
    s.add("<circle cx='80' cy='215' r='110' fill='#4aa3ff' fill-opacity='0.08' stroke='#4aa3ff' stroke-opacity='0.4' stroke-dasharray='6 6'/>")
    s.move_wave('e', 6, [(500, LY), (220, LY)], [(0, 0), (0.35, 1)], 0, 0.75)
    s.champ(150, LY - 40, 'a', 'T')
    for t in (0.4, 0.5, 0.6, 0.7):
        s.shot(150, LY - 40, 215, LY - 5, GOLD, t, 0.05, 5)
        s.show_at(215, LY - 30, s.g_text('+💰', 14, GOLD, 'middle', 'bold'), t + 0.04, t + 0.12)
    s.captions([(0.02, 0.38, '1. La wave vient sous ta tour : tu ne vas pas la chercher'), (0.38, 0.75, '2. Tu farmes en sécurité, la tour t’aide', GOLD), (0.75, 0.98, '3. Tu restes en vie et tu attends leur erreur', OK)])
    return s.render()


def conceder_dire():
    s = M('Le dire tôt', '30 secondes avant, tout le monde sait quoi faire', 8)
    P = s.P
    dx, dy = s.pit['drake']
    s.text(dx, dy + 5, '🐉', 18)
    s.show_at(605, 104, f"<rect x='-170' y='-22' width='340' height='34' rx='10' fill='#221c19' stroke='{GOLD}'/>" + s.g_text('« On lâche le drake, on prend top »', 14, GOLD, 'middle', 'bold'), 0.05, 0.98)
    for k in range(4):
        s.move_champ('a', '', [P(0.40 + k * 0.05, 0.62 + k * 0.03), P(0.10 + k * 0.03, 0.20 + (k % 2) * 0.04)], [(0.25, 0), (0.6, 1)], 0, 1, 10)
    s.mtower(0.08, 0.28, 'a')
    tx, ty = P(0.22, 0.08)
    s.show_at(tx, ty, f"<rect x='-8' y='-8' width='16' height='16' rx='3' fill='#1a1614' stroke='{ENEMY}' stroke-width='3'/>", 0, 0.7)
    s.boom(tx, ty, 0.7, OK, 'tour !')
    s.steps([(0.05, ['1. Un appel clair, 30 s avant'], GOLD), (0.25, ['2. Tout le monde part en haut']), (0.7, ['3. Une tour contre un dragon'], OK)], y=150)
    return s.render()


# ======================= Vision =======================
def vision_wards():
    s = M('Wards et trinket', 'Là où le danger arrive : rivière et buissons', 7)
    P = s.P
    for i, (u, v) in enumerate(((0.24, 0.22), (0.40, 0.40), (0.62, 0.60), (0.78, 0.76))):
        t = 0.08 + i * 0.15
        s.show_at(*P(u, v), s.g_ward(), t, 0.98)
        s.pulse(*P(u, v), GOLD, t, 10, 60, 0.15)
    s.steps([(0.05, ['Une ward = une zone éclairée'], GOLD), (0.35, ['Rivière et buissons :', 'là où passent les ganks']), (0.65, ['En milieu de partie : trinket', 'de balayage pour jungle et support'], OK)])
    return s.render()


def vision_pinks():
    s = A(7).title('Les pinks', 'Elle révèle et désactive les wards adverses')
    s.arena(230, 140, 340, 200, 18, 0.4)
    s.text(400, 132, 'buisson de la rivière', 14, MUTED)
    s.show_at(470, 260, s.g_ward('e'), 0, 0.98)
    s.move_champ('a', 'S', [(120, 240), (320, 240), (320, 240)], [(0, 0), (0.25, 1), (1, 2)])
    s.show_at(340, 220, s.g_ward('a', True), 0.3, 0.98)
    s.pulse(340, 220, PINK, 0.3, 10, 160, 0.2)
    s.boom(470, 260, 0.5, BAD, 'ward adverse trouvée')
    s.show_at(470, 260, s.g_text('✕', 30, BAD, 'middle', 'bold'), 0.6, 0.98)
    s.show_at(400, 395, s.g_text('Une pink à chaque back · posée là où elle dure', 17, GOLD, 'middle', 'bold'), 0.7, 0.98)
    return s.render()


def vision_off():
    s = M('Les wards offensives', 'Chez l’adversaire, avec la prio', 8)
    P = s.P
    for i, (u, v) in enumerate(((0.52, 0.30), (0.70, 0.48))):
        t = 0.12 + i * 0.15
        s.show_at(*P(u, v), s.g_ward(), t, 0.98)
        s.pulse(*P(u, v), GOLD, t, 10, 60, 0.15)
    s.move_champ('e', 'J', [P(0.62, 0.16), P(0.54, 0.30), P(0.66, 0.46)], [(0.35, 0), (0.55, 1), (0.75, 2)], 0, 0.98, 12)
    s.boom(*P(0.54, 0.30), 0.55, ENEMY, 'suivi !')
    s.steps([(0.05, ['1. Tes lanes ont la prio'], OK), (0.12, ['2. Wards dans sa jungle'], GOLD), (0.55, ['3. Tu vois son jungler passer', '   et tu sais où il va'], OK)])
    return s.render()


def vision_qui():
    return cards('Qui pose quoi', 'Chaque rôle a ses wards', [
        ('🛡️', 'Top', 'rivière, tri-bush, entrée de sa jungle', 'neutre'), ('🌲', 'Jungle', 'ses buffs et ses entrées', 'neutre'),
        ('✨', 'Mid', 'la rivière des deux côtés', 'neutre'), ('🏹', 'ADC', 'tri-bush ou rivière près du dragon', 'neutre'),
        ('💞', 'Support', 'les plus profondes + balayage', 'good')], 2, 8)


def vision_facecheck():
    s = A(8).title('Jouer avec la vision', 'Pas de facecheck : on éclaire avant d’entrer')
    for y, good in ((150, False), (320, True)):
        s.arena(380, y - 50, 160, 100, 16, 0.4)
        s.text(130, y - 56, '✗ Entrer sans voir' if not good else '✓ Éclairer d’abord', 16, BAD if not good else OK, 'start', 'bold')
        if not good:
            s.move_champ('a', 'M', [(200, y), (440, y)], [(0.05, 0), (0.35, 1)], 0, 0.45)
            s.show_at(480, y, s.g_champ('e', 'J'), 0.35, 0.98)
            s.show_at(440, y, s.g_text('💀', 30, FG), 0.45, 0.98)
        else:
            s.champ(260, y, 'a', 'M')
            s.shot(260, y, 440, y, GOLD, 0.45, 0.08, 6)
            s.show_at(440, y, s.g_ward(), 0.53, 0.98)
            s.pulse(440, y, GOLD, 0.53, 10, 80, 0.15)
            s.show_at(480, y, s.g_champ('e', 'J'), 0.55, 0.98)
            s.show_at(620, y, s.g_text('vu : tu restes en sécurité', 15, OK, 'middle', 'bold'), 0.62, 0.98)
    return s.render()


# ======================= Objectifs et macro =======================
def obj_prio():
    s = M('La prio donne le droit de prendre', 'Les lanes proches poussent, puis l’équipe va sur l’objectif', 8)
    P = s.P
    dx, dy = s.pit['drake']
    s.text(dx, dy + 5, '🐉', 18)
    s.move_wave('a', 6, [P(0.48, 0.52), P(0.58, 0.42)], [(0, 0), (0.25, 1)], 0, 0.98, 3)
    s.move_wave('a', 6, [P(0.82, 0.92), P(0.92, 0.80)], [(0, 0), (0.25, 1)], 0, 0.98, 3)
    s.show_at(*P(0.60, 0.40), s.g_champ('e', 'M', 9), 0, 0.98)
    s.show_at(*P(0.92, 0.76), s.g_champ('e', 'A', 9), 0, 0.98)
    s.boom(*P(0.60, 0.40), 0.3, ENEMY, 'bloqué')
    s.boom(*P(0.92, 0.76), 0.33, ENEMY, 'bloqué')
    for k in range(3):
        s.move_champ('a', '', [P(0.46 + k * 0.1, 0.56 + k * 0.1), P(0.62 + k * 0.03, 0.66)], [(0.4, 0), (0.65, 1)], 0, 1, 10)
    s.boom(dx, dy, 0.8, GOLD, 'Dragon !')
    s.steps([(0.05, ['1. Mid et bot poussent']), (0.3, ['2. Leurs adversaires doivent', '   rester farmer'], ENEMY), (0.6, ['3. Vous arrivez les premiers'], OK)])
    return s.render()


def obj_valeur():
    return cards('Ce que rapporte chaque objectif', 'Saison 2026', [
        ('🐉', 'Dragons (5:00)', 'bonus d’équipe, âme au 4e', 'good'), ('🐛', 'Larves (8:00)', 'dégâts en plus sur les tours', 'good'),
        ('👁️', 'Héraut (15:00)', 'à lancer sur une tour', 'good'), ('👾', 'Baron (20:00)', 'pousser les lanes', 'good'),
        ('🐲', 'Dragon ancestral', 'après une âme : achève', 'good'), ('🏰', 'Plates des tours', 'des golds pour l’équipe', 'good')], 2, 8)


def obj_apreskill():
    s = M('Après un kill : prends quelque chose', 'L’objectif le plus proche ou une tour', 7)
    P = s.P
    s.show_at(*P(0.86, 0.84), s.g_champ('e', 'A', 10), 0, 0.15)
    s.show_at(*P(0.86, 0.84), s.g_text('💀', 16, FG), 0.15, 0.98)
    s.boom(*P(0.86, 0.84), 0.15, GOLD, 'kill')
    s.move_champ('a', 'A', [P(0.82, 0.90), P(0.92, 0.76)], [(0.3, 0), (0.55, 1)], 0, 1, 11)
    s.move_champ('a', 'S', [P(0.80, 0.86), P(0.90, 0.74)], [(0.3, 0), (0.55, 1)], 0, 1, 10)
    tx, ty = P(0.92, 0.72)
    s.show_at(tx, ty, f"<rect x='-8' y='-8' width='16' height='16' rx='3' fill='#1a1614' stroke='{ENEMY}' stroke-width='3'/>", 0, 0.7)
    s.boom(tx, ty, 0.7, OK, 'tour !')
    s.steps([(0.05, ['1. Kill en bot'], GOLD), (0.3, ['2. Pas de back tout de suite :', '   on va sur la tour']), (0.7, ['3. Tour prise : le kill a servi'], OK)])
    return s.render()


def obj_tours():
    s = M('Les tours ouvrent la carte', 'Tour tombée = sa jungle s’ouvre à tes wards', 7)
    P = s.P
    tx, ty = P(0.60, 0.40)
    s.show_at(tx, ty, f"<rect x='-8' y='-8' width='16' height='16' rx='3' fill='#1a1614' stroke='{ENEMY}' stroke-width='3'/>", 0, 0.25)
    s.boom(tx, ty, 0.25, OK, 'tour mid !')
    for i, (u, v) in enumerate(((0.56, 0.26), (0.74, 0.46), (0.64, 0.30))):
        t = 0.4 + i * 0.12
        s.show_at(*P(u, v), s.g_ward(), t, 0.98)
        s.pulse(*P(u, v), GOLD, t, 10, 50, 0.15)
    s.steps([(0.05, ['1. La première tour tombe'], OK), (0.4, ['2. Tes wards entrent dans sa jungle'], GOLD), (0.75, ['3. Groupe mid ou side lane'], FG)])
    return s.render()


def obj_baron():
    s = M('Le Baron', 'Après des kills, ou avec toute la vision', 8)
    P = s.P
    bx, by = s.pit['baron']
    s.text(bx, by + 5, '👾', 18)
    for k in range(3):
        t = 0.08 + k * 0.06
        s.show_at(*P(0.62 + k * 0.05, 0.30), s.g_champ('e', '', 9), 0, t)
        s.show_at(*P(0.62 + k * 0.05, 0.30), s.g_text('💀', 14, FG), t, 0.98)
    for i, (u, v) in enumerate(((0.26, 0.24), (0.40, 0.26), (0.30, 0.42))):
        s.show_at(*P(u, v), s.g_ward(), 0.3 + i * 0.05, 0.98)
    for k in range(5):
        s.move_champ('a', '', [P(0.50 + k * 0.03, 0.48), P(0.36 + (k % 3) * 0.03, 0.38 + (k // 3) * 0.04)], [(0.42, 0), (0.65, 1)], 0, 1, 10)
    s.boom(bx, by, 0.85, PINK, 'Baron !')
    s.steps([(0.05, ['1. 3 adversaires morts'], OK), (0.3, ['2. Wards autour de la fosse'], GOLD), (0.45, ['3. Tout le monde sur le Baron']), (0.8, ['Jamais à 5 contre 5 sans vision'], BAD)])
    return s.render()


def obj_regroupe():
    s = M('Milieu de partie : se regrouper', '4 près du prochain objectif, 1 en side lane', 7)
    P = s.P
    dx, dy = s.pit['drake']
    s.text(dx, dy + 5, '🐉', 18)
    for k in range(4):
        s.move_champ('a', '', [P(0.30 + k * 0.08, 0.50 + k * 0.06), P(0.58 + (k % 2) * 0.04, 0.60 + (k // 2) * 0.05)], [(0.05, 0), (0.4, 1)], 0, 1, 10)
    s.move_champ('a', 'T', [P(0.10, 0.20), P(0.28, 0.08)], [(0.1, 0), (0.6, 1)], 0, 1, 11)
    s.move_wave('a', 6, [P(0.12, 0.12), P(0.30, 0.08)], [(0.1, 0), (0.6, 1)], 0, 0.98, 3)
    s.steps([(0.05, ['1. Quatre joueurs près du', '   prochain objectif']), (0.3, ['2. Un joueur pousse', '   une lane de côté'], GOLD), (0.6, ['3. L’adversaire doit choisir'], OK)])
    return s.render()


# ======================= Recall =======================
def recall_quand():
    s = L('Quand back', 'Après le crash, avec des golds, ou avec peu de vie', 6)
    s.move_wave('a', 6, [(430, LY), (690, LY)], [(0, 0), (0.35, 1)], 0, 0.45)
    s.boom(690, LY, 0.36, GOLD, 'Crash')
    s.move_champ('a', 'T', [(360, LY - 50), (500, LY - 50), (500, LY - 50)], [(0, 0), (0.3, 1), (0.42, 2)], 0, 0.7)
    s.show_at(500, LY - 90, s.g_text('💰 1 100', 18, GOLD, 'middle', 'bold'), 0.3, 0.7)
    s.recall(500, LY - 50, 0.45, 0.7)
    s.show_at(100, LY + 85, s.g_text('🛒 objet acheté', 16, OK, 'start', 'bold'), 0.72, 0.98)
    s.captions([(0.02, 0.4, '1. Tu crashes ta wave'), (0.4, 0.7, '2. Tu as les golds pour ton objet : back'), (0.7, 0.98, '3. Tu reviens plus fort sans rien perdre', OK)])
    return s.render()


def recall_achats():
    s = A(7).title('Prévoir ses achats', 'Back quand tu peux acheter quelque chose d’utile')
    s.rect(120, 200, 560, 34, '#221c19', 12)
    s.grow_bar(120, 200, 560, 34, GOLD, 0.05, 0.6, 12)
    s.line(120 + 560 * 0.78, 186, 120 + 560 * 0.78, 248, OK, 3, '5 5')
    s.text(120 + 560 * 0.78, 178, 'prix du composant', 14, OK)
    for t, v in ((0.05, '200'), (0.25, '500'), (0.45, '850'), (0.6, '1 100')):
        s.show_at(400, 290, s.g_text(f'💰 {v}', 26, GOLD, 'middle', 'bold'), t, t + 0.2 if v != '1 100' else 0.98)
    s.show_at(400, 350, s.g_text('✓ Assez pour l’objet prévu : back !', 18, OK, 'middle', 'bold'), 0.62, 0.98)
    s.show_at(400, 130, s.g_text('✗ Back à 200 golds : aller-retour pour rien', 16, BAD, 'middle', 'bold'), 0.05, 0.3)
    return s.render()


def recall_equipe():
    s = M('Back avec l’équipe', 'Le duo bot ensemble, le jungler prévenu', 7)
    P = s.P
    for letter, (u, v) in (('A', (0.84, 0.90)), ('S', (0.80, 0.86))):
        s.move_champ('a', letter, [P(u, v), P(u, v)], None, 0, 0.5, 11)
        s.recall(*P(u, v), 0.2, 0.5)
    s.boom(*P(0.40, 0.70), 0.12, GOLD, '« on back »')
    s.move_champ('a', 'J', [P(0.40, 0.70), P(0.40, 0.70), P(0.30, 0.50)], [(0, 0), (0.3, 1), (0.6, 2)], 0, 1, 11)
    s.steps([(0.05, ['1. Le duo bot annonce son back'], GOLD), (0.2, ['2. Les deux backent ensemble']), (0.45, ['3. Le jungler sait qu’il ne', '   faut pas aller en bas'], OK)])
    return s.render()


def recall_chaque():
    return cards('À chaque back', 'La petite routine', [
        ('🩷', 'Une pink', 'toujours une sur toi', 'good'), ('🧪', 'Des potions', 'si ta lane est difficile', 'good'),
        ('🛒', 'L’objet prévu', 'acheté sans hésiter', 'good'), ('🏃', 'Retour rapide', 'pour la wave suivante', 'good')], 2, 7)


def recall_partage():
    s = L('Partager les golds', 'Les sbires d’une lane sont pour son joueur', 6, river=False)
    s.wave(420, LY, 'e', 6)
    s.champ(330, LY - 40, 'a', 'A')
    for t in (0.15, 0.3, 0.45):
        s.shot(330, LY - 40, 410, LY - 5, GOLD, t, 0.05, 5)
    s.move_champ('a', 'J', [(200, LY + 100), (330, LY + 60), (520, LY + 100)], [(0.1, 0), (0.45, 1), (0.8, 2)], 0, 1, 16)
    s.show_at(330, LY + 135, s.g_text('le jungler passe sans voler', 14, OK, 'middle', 'bold'), 0.45, 0.85)
    s.captions([(0.02, 0.5, 'Ton coéquipier est là : ses sbires sont pour lui'), (0.5, 0.98, 'Les golds vont à ceux qui feront gagner l’équipe', OK)])
    return s.render()


# ======================= Mental =======================
def mental_une():
    s = A(7).title('Une chose par game', 'Un seul objectif, c’est plus efficace')
    items = ['Crash avant de back', 'Regarder la minimap', 'Moins de morts', 'Pink à chaque back']
    for i, t in enumerate(items):
        y = 120 + i * 62
        on = i == 0
        s.rect(200, y, 400, 48, '#1a1614', 12, OK if on else '#2e2622', 2)
        s.text(230, y + 31, t, 17, FG if on else MUTED, 'start', 'bold' if on else 'normal')
        if not on:
            s.show_at(400, y + 24, f"<line x1='-180' y1='0' x2='180' y2='0' stroke='{MUTED}' stroke-width='2'/>", 0.25 + i * 0.08, 0.98)
    s.show_at(570, 144, s.g_text('🎯', 26, FG), 0.55, 0.98)
    s.pulse(400, 144, OK, 0.55, 20, 220, 0.2)
    s.show_at(400, 400, s.g_text('Cette game, je travaille : crash avant de back', 17, OK, 'middle', 'bold'), 0.65, 0.98)
    return s.render()


def mental_positif():
    s = A(7).title('Rester positif', 'Ce qui aide l’équipe, ce qui la fait perdre')
    msgs = [(130, '« t’es nul, gank jamais »', False, 0.05), (210, '🔇 chat coupé', True, 0.3), (290, '« bien joué ! next drake 🐉 »', True, 0.5)]
    for y, t, good, t0 in msgs:
        col = OK if good else BAD
        inner = f"<rect x='-230' y='-26' width='460' height='46' rx='16' fill='#1a1614' stroke='{col}' stroke-width='2'/>" + s.g_text(t, 17, col, 'middle', 'bold')
        s.show_at(400, y, inner, t0, 0.98)
    s.show_at(400, 130, f"<line x1='-230' y1='-2' x2='230' y2='-2' stroke='{BAD}' stroke-width='3'/>", 0.25, 0.98)
    s.show_at(400, 380, s.g_text('Une équipe qui se dispute joue moins bien, même si elle a raison', 15, GOLD, 'middle', 'bold'), 0.7, 0.98)
    return s.render()


def mental_replay():
    s = A(7).title('Après une défaite', 'Deux minutes de replay sur un moment clé')
    s.rect(100, 200, 600, 14, '#221c19', 7)
    s.grow_bar(100, 200, 600, 14, '#5b4f48', 0.02, 0.3, 7)
    mx = 100 + 600 * 0.62
    s.show_at(mx, 207, f"<circle r='12' fill='{BAD}'/>", 0.3, 0.98)
    s.show_at(mx, 170, s.g_text('💀 18:42 : mort avant le Baron', 16, BAD, 'middle', 'bold'), 0.32, 0.98)
    s.show_at(mx, 260, s.g_text('⏪ ▶️ revoir ces 2 minutes', 17, ALLY, 'middle', 'bold'), 0.45, 0.98)
    s.show_at(400, 340, s.g_text('→ « Je n’avais pas de ward : je ne facecheck plus »', 17, OK, 'middle', 'bold'), 0.65, 0.98)
    return s.render()


def mental_pause():
    s = A(7).title('Faire des pauses', 'Deux défaites de suite : pause de quelques minutes')
    seq = [('D', BAD, 0.05), ('D', BAD, 0.18), ('☕', GOLD, 0.35), ('V', OK, 0.6)]
    for i, (t, col, t0) in enumerate(seq):
        x = 190 + i * 140
        inner = f"<circle r='40' fill='#1a1614' stroke='{col}' stroke-width='4'/>" + s.g_text(t, 30, col, 'middle', 'bold').replace("y='0'", "y='11'")
        s.show_at(x, 230, inner, t0, 0.98)
        s.pulse(x, 230, col, t0, 40, 70, 0.1)
    s.show_at(470, 300, s.g_text('pause', 16, GOLD, 'middle', 'bold'), 0.38, 0.98)
    s.show_at(400, 380, s.g_text('Jouer énervé coûte plus de LP qu’une pause ne coûte de temps', 16, FG, 'middle', 'bold'), 0.65, 0.98)
    return s.render()


def mental_fire():
    s = A(7).title('Utiliser FIRE LoL', 'Les chiffres qui montrent le plus vite si tu progresses')
    items = [('💀', 'Morts par game', 0.55, OK), ('⏱️', 'Golds à 15 min', 0.7, OK), ('🎯', 'Objectif obligatoire', 0.85, GOLD)]
    for i, (ico, lab, v, col) in enumerate(items):
        x = 60 + i * 240
        s.rect(x, 130, 220, 200, '#1a1614', 16, '#2e2622', 2)
        s.text(x + 110, 180, ico, 34)
        s.text(x + 110, 220, lab, 16, FG, 'middle', 'bold')
        s.rect(x + 20, 260, 180, 14, '#221c19', 7)
        s.grow_bar(x + 20, 260, 180 * v, 14, col, 0.1 + i * 0.15, 0.35 + i * 0.15, 7)
    s.show_at(400, 390, s.g_text('📊 Stats des joueurs → ta carte → Résumé', 17, ALLY, 'middle', 'bold'), 0.65, 0.98)
    return s.render()



SCENES = {
    ('bases', 1): bases_golds, ('bases', 2): bases_mort, ('bases', 3): bases_minimap, ('bases', 4): bases_timers, ('bases', 5): bases_comm,
    ('wave', 1): wave_slow, ('wave', 2): wave_fast, ('wave', 4): wave_back, ('wave', 5): wave_erreurs,
    ('top', 0): top_matchup, ('top', 1): top_trade, ('top', 2): top_wave, ('top', 3): top_jungler, ('top', 4): top_tp, ('top', 5): top_larves,
    ('jungle', 1): jungle_tempo, ('jungle', 3): jungle_track, ('jungle', 4): jungle_scuttle, ('jungle', 5): jungle_objectifs, ('jungle', 6): jungle_invade, ('jungle', 7): jungle_erreurs,
    ('mid', 0): mid_prio, ('mid', 1): mid_wards, ('mid', 3): mid_follow, ('mid', 4): mid_trades, ('mid', 5): mid_apres,
    ('bot', 0): bot_niveau2, ('bot', 1): bot_adc, ('bot', 2): bot_support, ('bot', 3): bot_wave, ('bot', 4): bot_dragon, ('bot', 5): bot_roam, ('bot', 6): bot_fight,
    ('fights', 0): fights_compter, ('fights', 1): fights_roles, ('fights', 3): fights_cible, ('fights', 4): fights_objectif, ('fights', 5): fights_apres, ('fights', 6): fights_erreurs,
    ('conceder', 0): conceder_pourquoi, ('conceder', 1): conceder_quand, ('conceder', 3): conceder_tour, ('conceder', 4): conceder_retard, ('conceder', 5): conceder_dire,
    ('vision', 0): vision_wards, ('vision', 1): vision_pinks, ('vision', 4): vision_off, ('vision', 5): vision_qui, ('vision', 6): vision_facecheck,
    ('objectifs', 0): obj_prio, ('objectifs', 1): obj_valeur, ('objectifs', 2): obj_apreskill, ('objectifs', 3): obj_tours, ('objectifs', 4): obj_baron, ('objectifs', 5): obj_regroupe,
    ('recall', 0): recall_quand, ('recall', 1): recall_achats, ('recall', 2): recall_equipe, ('recall', 3): recall_chaque, ('recall', 4): recall_partage,
    ('mental', 0): mental_une, ('mental', 1): mental_positif, ('mental', 2): mental_replay, ('mental', 3): mental_pause, ('mental', 4): mental_fire,
}


# ----- Les schémas fixes qui gagnent à bouger : on ajoute un déplacement par-dessus -----
import schemas as _S


def _overlay(svg, build, dur=7):
    a = A(dur)
    a.P = lambda u, v: (round(40 + u * 360, 1), round(70 + v * 360, 1))  # même carte que schemas.py (40, 70, 360)
    build(a)
    defs = ''.join(f"<marker id='{mid}' viewBox='0 0 10 10' refX='7' refY='5' markerWidth='5' markerHeight='5' orient='auto-start-reverse'><path d='M0,0 L10,5 L0,10 z' fill='{col}'/></marker>" for mid, col in sorted(a.markers))
    return svg.replace('</svg>', (f'<defs>{defs}</defs>' if defs else '') + ''.join(a.parts) + '</svg>')


def jungle_chemin_anim():
    def b(a):
        P = a.P
        camps = [(0.256, 0.469), (0.141, 0.435), (0.256, 0.563), (0.464, 0.637), (0.518, 0.731), (0.565, 0.818), (0.64, 0.80)]
        pts = [P(u, v) for u, v in camps]
        a.move_champ('a', 'J', pts, [(0.02, 0), (0.14, 1), (0.28, 2), (0.42, 3), (0.56, 4), (0.7, 5), (0.85, 6)], 0, 1, 13)
    return _overlay(_S.chemin_jungle(), b, 9)


def jungle_gank_anim():
    def b(a):
        a.move_champ('a', 'J', [(470, 330), (470, 330), (330, 215)], [(0, 0), (0.2, 1), (0.55, 2)], 0, 1)
        a.boom(300, 200, 0.58, OK, 'Gank !')
    return _overlay(_S.gank(), b, 6)


def mid_roam_anim():
    def b(a):
        P = a.P
        a.move_champ('a', 'M', [P(0.48, 0.52), P(0.62, 0.70), P(0.74, 0.86)], [(0.15, 0), (0.5, 1), (0.75, 2)], 0, 1, 15)
        a.boom(*P(0.80, 0.90), 0.78, OK, 'Kill !')
    return _overlay(_S.roam_mid(), b, 7)


def top_split_anim():
    def b(a):
        P = a.P
        a.move_champ('a', 'T', [P(0.22, 0.09), P(0.40, 0.09)], [(0.05, 0), (0.6, 1)], 0, 1, 14)
        a.boom(*P(0.47, 0.09), 0.62, OK, 'tour !')
    return _overlay(_S.split(), b, 7)


def conceder_anim():
    def b(a):
        P = a.P
        a.move_champ('a', '', [P(0.20, 0.55), P(0.10, 0.18)], [(0.05, 0), (0.45, 1)], 0, 1, 9)
        a.move_champ('a', '', [P(0.30, 0.60), P(0.14, 0.14)], [(0.1, 0), (0.5, 1)], 0, 1, 9)
        a.boom(*P(0.08, 0.10), 0.55, OK, 'tour prise')
    return _overlay(_S.conceder(), b, 7)


SCENES.update({('jungle', 0): jungle_chemin_anim, ('jungle', 2): jungle_gank_anim, ('mid', 2): mid_roam_anim, ('top', 6): top_split_anim, ('conceder', 2): conceder_anim})
