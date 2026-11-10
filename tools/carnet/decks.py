"""Les 5 carnets, dans l'ordre des chapitres (niveaux)."""
from blocks import *
from blocks import patterns, deny, after_kill, tracking, vision, sides, cover, tempo, intentions, first_self, structures

# ================================================================ JUNGLE
def jungle():
    L = 'jungle'
    s = [dict(kind='cover', who='Le carnet du jungler', players='Toks42o · Kayn Effect', icon='🌲'),
         dict(kind='quest', levels=['Le rôle', 'Ta classe', 'Ton départ', 'Le carapateur', 'Les ganks',
                                    'Les buffs', 'Les vagues, vite fait', 'Fights et mindset', 'Entraînement et data'])]
    s += role(L, 1, 'Jarvan IV')
    s += [dict(kind='cards', niv=2, kick='Ta classe', title='Choisis ta classe', cols=2, champ='Lee Sin',
        cards=[('⚔️ GANKER', '#ff6b6b', ["Fort en early, souvent avec un CC.", "Il priorise les ganks.",
                                        "Peut skip des camps."]),
               ('🌾 FARMEUR', '#5fd39a', ["Pas très fort en early, mais il clear très bien.", "Il priorise le farm.",
                                         "Gank seulement si kill ou flash sûr."])],
        foot="Et dans chaque classe : monocible ou AOE (dégâts de zone). La plupart des farmeurs sont AOE."),
          dict(kind='quiz', niv=2, champ='Pantheon', q="Ton champion est fort en early et il a un CC. Tu es plutôt…",
        ch=["Un farmeur", "Un ganker", "Aucun des deux"], good=1,
        why="Regarde son kit de sorts : fort en early + CC = ganker. Faible en early mais clear rapide = farmeur."),
          dict(kind='path', niv=3, kick='Ton départ · monocible', title='Monocible : start Blue', champ='Zyra',
        steps=['🔵 Blue', 'Grump', 'Loups', '4 à 5 camps', '🦀 Carapateur'],
        bullets=["Pourquoi : le Blue, le Grump et les loups ont peu de cibles.",
                 f"{bold('Smite sur le Grump')}, pas pour le finir : en le tuant, tu récupères la vie qu'il t'a prise.",
                 f"Start Blue : {bold('ward à l’opposé, côté Red')}."]),
          dict(kind='path', niv=3, kick='Ton départ · AOE', title='Ganker AOE : start Red', champ='Jarvan IV',
        steps=['🔴 Red', 'Krugs', 'Corbins', 'Loups', '🔵 Blue', '🦀 ou gank'],
        bullets=["Après le Blue : contester le carapateur ou gank une lane.",
                 "Il peut skip un camp : il préfère aller au carapateur.",
                 "C'est situationnel : ça dépend de ton clear et de la game."]),
          dict(kind='std', niv=3, kick='Ton départ', title='Combien de camps ?', champ='Dr. Mundo',
        bullets=[f"{bold('Ganker')} : au minimum 4 à 5 camps. Full clear propre ? C'est carré.",
                 "Sinon, priorise les ganks : ton perso est un ganker.",
                 f"{bold('Farmeur')} : priorise le farm.",
                 "Des fois, un full clear est intéressant, ganker ou pas.",
                 "Ce sont les bases : après, à toi de voir comment tu te débrouilles dans la game."]),
          dict(kind='std', niv=4, kick='Le carapateur', title='Une course de vitesse', champ='Poppy',
        bullets=["Le carapateur : c'est une course pour arriver le premier.",
                 f"Dans tes runes, {bold('prends la vitesse')} en stats : c'est meilleur sur la plupart des champions.",
                 "Vrai pour les junglers et pour les laners."]),
          dict(kind='cards', niv=4, kick='Le carapateur', title='Les 2 voyants avant d’y aller', cols=2, champ='Lee Sin',
        cards=[('🚦 1 · Tes prios', '#ffb347', ["Carapateur bot : regarde la prio mid + bot.",
                                               "Carapateur top : regarde la prio mid + top.",
                                               "Pas de prio ? N'y va pas."]),
               ('➡️ 2 · Pousse-le du bon côté', '#5aa9ff', ["Pousse le carapateur vers la lane où tu as la prio.",
                                                         "Exemple : pas de prio top, mais prio mid : pousse-le vers le mid.",
                                                         "Ton mid laner décale plus vite pour toi."])],
        foot="Règle générale : rapproche-toi de tes alliés. Kite vers eux, bait vers eux."),
          dict(kind='quiz', niv=4, champ='Zyra', q="Tu veux le carapateur bot. Quelles prios tu regardes ?",
        ch=["Top + mid", "Mid + bot", "Seulement le bot"], good=1,
        why="Carapateur bot : prio mid et bot. Carapateur top : prio mid et top. Pas de prio : n'y va pas."),
          dict(kind='cards', niv=5, kick='Les ganks', title='Quelle lane ganker ?', cols=2, champ='Pantheon',
        cards=[('⚔️ Ganker', '#ff6b6b', ["Privilégie les ganks au farm, selon tes sorts.",
                                       "Toutes les lanes sont gankables (freeze installé) ? Prends :",
                                       "› la plus feed", "› la plus facile : ton allié a un grab ou un stun",
                                       "› un kill sûr, ou un adversaire sans flash"]),
               ('🌾 Farmeur', '#5fd39a', ["Gank seulement pour un kill ou un flash.", "Ne perds pas de temps.",
                                         "Connais le rythme de la game : accélère quand il faut.",
                                         "Ne sois pas obnubilé par tes camps."])]),
          dict(kind='quiz', niv=5, champ='Jarvan IV', q="Ganker, toutes les lanes sont gankables. Tu vas où ?",
        ch=["La plus proche de toi", "La plus feed, ou celle où le kill est facile", "Celle de ton duo"], good=1,
        why="La plus feed, ou la plus facile : allié avec grab ou stun, kill sûr, adversaire sans flash."),
          dict(kind='cards', niv=6, kick='Les buffs', title='Ce que te donnent les buffs', cols=3, champ='Amumu',
        cards=[('🔴 Red', '#ff6b6b', ["Dégâts sur tes auto-attaques", "Slow", "Régénération de PV"]),
               ('🔵 Blue', '#5aa9ff', ["Régénération de mana", "Réduction des cooldowns"]),
               ('🐾 Familier', '#5fd39a', ["Trois bonus possibles en l'invoquant"])])]
    s += tracking(L, 5) + cover(L, 5) + sides(L, 5)
    s += waves_short(L, 7)
    s += tempo(L, 8) + structures(L, 8) + vision(L, 8)
    s += fights(L, 8)[:2]
    s += patterns(L, 8)
    s += mindset(L, 8, jungle=True) + first_self(L, 8) + intentions(L, 8)
    s += [dict(kind='std', niv=9, kick='Les outils', title='Runes et data', champ='Fiddlesticks',
        chips=['📊 LoLalytics', '📊 DPM', '🔎 Porofessor', '📈 OP.GG'],
        bullets=["Des sites pour tes runes et pour la data.",
                 f"Rappel : {bold('la vitesse')} en stats, c'est meilleur sur la plupart des champions."])]
    s += training(L, 9)
    s += [dict(kind='final', title='Boss final : la checklist du jungler',
        items=["Je connais ma classe : ganker ou farmeur, monocible ou AOE", "Je choisis mon start : Blue ou Red",
               "Smite sur le Grump au bon moment, ward à l'opposé", "Je regarde mes prios avant le carapateur",
               "Je gank la bonne lane, je ne perds pas de temps", "Je laisse les ressources quand il faut"])]
    return s


# ================================================================ ADC
def adc():
    L = 'adc'
    s = [dict(kind='cover', who='Le carnet de l’ADC', players='The World', icon='🏹'),
         dict(kind='quest', levels=['Le rôle', 'Les 4 catégories', 'Les fondamentaux', 'Le farm', 'Le trading',
                                    'Les vagues', 'La bot lane en duo', 'Back et mid game', 'Les fights', 'Mindset et entraînement'])]
    s += role(L, 1, 'Zeri')
    s += [dict(kind='grid4', niv=2, kick='Les 4 catégories d’ADC', title='Quel ADC tu joues ?', champ='Miss Fortune',
        cells=[('Hyper carry', '#ff6b6b', ['Jinx'], ['Faible early / fort late', 'FARMIIIING !!']),
               ('Utilitaire', '#5aa9ff', ['Ashe', 'Jhin'], ['Combat long', 'Pas besoin d’être feed']),
               ('Lane bully', '#ffb347', ['Draven', 'Kalista'], ['Fort early / faible late', 'FIGHTIIIING !!!']),
               ('Front to back', '#5fd39a', ['Miss Fortune', "Kai'Sa"], ['Correct en lane', 'Excellent en teamfight'])]),
          dict(kind='std', niv=3, kick='Fondamental 1', title='Savoir farmer', champ='Xayah',
        bullets=[f"Tu {bold('scales avec les golds')}. Les autres lanes scalent avec l'XP.",
                 "C'est pour ça qu'on swap mid / bot, en général vers 15 min.",
                 "Le farm compte partout, mais en ADC encore plus."]),
          dict(kind='std', niv=3, kick='Fondamental 2', title='Identifier les menaces', champ='Fiddlesticks',
        bullets=[f"{bold('Un assassin')} en face : il est pick pour toi.",
                 f"{bold('Fiddlesticks')} : attention aux escarmouches.",
                 "Tu te rapproches trop pendant une escarmouche ? One-shot par sa R."]),
          dict(kind='std', niv=3, kick='Fondamental 3', title='Anticiper : sois parano', champ="Kai'Sa",
        bullets=[f"{bold('Pas de face check')}. Tu dois faire le tour ? Fais vraiment le tour.",
                 "Persos qui peuvent checker : Ezreal, envoie ton Q. Kai'Sa, envoie ton Z.",
                 "Pas sûr ? Doute toujours. « Où sont-ils ? Je ne vois personne : je fais attention. »"]),
          dict(kind='std', niv=3, kick='Fondamental 4', title='Se positionner', champ='Fiddlesticks',
        bullets=["Fiddlesticks vu au top, tu es mid ? Joue vers le bas de la lane, pas vers le haut.",
                 "Fiddlesticks vu jungle côté bot ? Joue vers le haut.",
                 "Danger des deux côtés ? Recule, ou bait en le disant à ton équipe.",
                 f"{bold('Trop loin')} : tu ne fais pas de dégâts. {bold('Trop près')} : tu es mort. Joue entre les deux."]),
          dict(kind='quiz', niv=3, champ='Ezreal', q="Fiddlesticks a été vu au top. Tu es au mid. Tu joues…",
        ch=["Vers le haut de la lane", "Vers le bas de la lane", "Au milieu, ça ne change rien"], good=1,
        why="Tu restes au mid, mais tu te places à l'opposé de la menace : vers le bas."),
          dict(kind='std', niv=3, kick='Fondamental 5', title='Être patient', champ='Amumu',
        bullets=["Avec ou sans R, avec ou sans flash : tu ne joues pas pareil.",
                 "Sans flash ou sans R : joue safe et call-le, en équipe comme en solo queue.",
                 f"Tu prends une {bold('R ou une bandelette d’Amumu')} ? Le fautif, c'est toi.",
                 "Un tank peut encaisser un stun. Toi, stun = mort. C'est à toi d'être à range."]),
          dict(kind='quiz', niv=3, champ='Amumu', q="Tu es l'ADC et tu prends la bandelette d'Amumu, puis tu meurs. La faute de qui ?",
        ch=["Ton support", "Ta team", "La tienne"], good=2,
        why="Un ADC qui se fait stun puis meurt : c'est sa faute. Anticipe, reste à range."),
          dict(kind='std', niv=3, kick='Fondamental 6', title='Matchups et responsabilités', champ='Miss Fortune',
        bullets=[f"{bold('Comprends les matchups')} : les forces et les faiblesses de chacun.",
                 "Comprends qui est important dans le fight.",
                 f"Tu es {bold('10-0 en early')} ? On ne doit pas arriver au late game.",
                 "Tu avais toutes les ressources pour carry : crée du jeu, snowball."])]
    s += farm_tour(4)
    s += cs_defi(L, 4)
    s += trading(L, 5) + patterns(L, 5) + deny(L, 5) + after_kill(L, 5)
    s += waves_full(L, 6)
    s += botlane(L, 7)
    s += back_mid(L, 8) + tracking(L, 8) + vision(L, 8) + sides(L, 8) + cover(L, 8) + tempo(L, 8) + structures(L, 8)
    s += fights(L, 9)
    s += mindset(L, 10) + first_self(L, 10) + intentions(L, 10)
    s += training(L, 10)
    s += [dict(kind='final', title='Boss final : la checklist de l’ADC',
        items=["Je farme : 7 CS/min à 10 et à 20 min", "Je repère les menaces et je ne face check jamais",
               "Je me place : ni trop loin, ni trop près", "Je check R et flash avant chaque fight",
               "Chaque wave a un but : freeze, slow push, fast push, reset", "Feed ? Je prends mes responsabilités"])]
    return s


def botlane(lane, niv):
    sup = lane == 'support'
    return [
        dict(kind='std', niv=niv, kick='La bot lane en duo', title='Le plan de jeu vient des vagues', champ='Caitlyn',
            bullets=["C'est un travail à deux : l'ADC et le support.",
                     f"Pour créer un plan de jeu, la base c'est {bold('le wave management')}.",
                     "Il y a 3 types de bot lane : all-in, poke et sustain.",
                     "La bot lane n'est pas figée : elle change avec la game."]),
        dict(kind='triangle', niv=niv, kick='La bot lane en duo', title='Feu, eau, nature', champ='Xayah' if not sup else 'Nautilus'),
        dict(kind='cards', niv=niv, kick='Les 3 types de bot', title='Ce que fait chaque bot', cols=3, champ='Pyke' if sup else 'Zeri',
            cards=[('🔥 All-in', '#ff6b6b', ["Deux temps : poke ou faire flash, puis kill.",
                                            "Préfère les longs trades.",
                                            "Danger : se faire poke niveau 1. Garde tes PV."]),
                   ('💧 Poke', '#5aa9ff', ["Étouffer la bot adverse : slow push.",
                                         "Lui faire rater du farm, gratter des plates, punir ses erreurs.",
                                         "Danger : long trade contre all-in, et les ganks."]),
                   ('🌿 Sustain', '#5fd39a', ["Prêt à recevoir : scale, punis les erreurs.",
                                            "Freeze pour rester safe, puis slow push pour crash.",
                                            "Sortir de lane avec le plus de ressources."])]),
        dict(kind='botid', niv=niv, kick='Identifier le type de bot', title='C’est le duo qui décide', champ='Caitlyn'),
        dict(kind='synergy', niv=niv, kick='ADC + support', title='Chaque duo change la lane', champ='Miss Fortune' if not sup else "Vel'Koz"),
        dict(kind='quiz', niv=niv, champ='Shaco', q="Shaco + Caitlyn en face. C'est une bot lane…",
            ch=["Poke", "Prête à recevoir (un bait)", "All-in"], good=1,
            why="À première vue ça poke, mais c'est un bait : c'est plutôt une bot lane qui reçoit."),
    ]


def sidelanes(niv):
    """TOP et MID : side lanes, échanges de matchups (exemple Gwen/Sion/Syndra/Mel). Commun aux carnets top et mid."""
    return [dict(kind='std', niv=niv, kick='TOP et MID', title='Qui prend quelle side lane ?', champ='Syndra',
        bullets=["Qui prend quelle wave ? Qui a la TP ? Qui reste près de l'équipe ?",
                 "Qui met le plus de pression ? Quels matchups sont bons ? Qui peut rejoindre l'objectif ? Qui risque de se faire attraper ?",
                 "Souvent : le top avec TP joue la side opposée, le mid reste plus proche de l'équipe.",
                 f"{bold('Un mid ne joue pas sa side lane comme un top')} : un mage prend vite sa wave et revient."], size=32),
          dict(kind='swap', niv=niv, kick='Exemple du coach', title='Gwen, Sion, Syndra et Mel : on échange ?',
        compos=[('Répartition 1 : on garde', '#5fd39a', [('Gwen', 'Sion', 'bonne pression pour Gwen'), ('Syndra', 'Mel', 'duel de mages')],
                 ["Gwen garde un duel où elle met la pression.", "Syndra reste sur un matchup qu'elle connaît."]),
                ('Répartition 2 : on échange', '#ff6b6b', [('Gwen', 'Mel', 'Gwen peut jouer contre elle'), ('Syndra', 'Sion', 'pas forcément mieux')],
                 ["Gwen pourrait jouer contre plusieurs champions…", "…mais Syndra contre Sion n'est pas forcément préférable."])],
        foot="Les questions : qui gagne son matchup ? qui serait avantagé, désavantagé ? quelle répartition garde le plus de pression et protège les joueurs fragiles ? À vérifier selon le patch et les objets."),
          dict(kind='std', niv=niv, kick='TOP et MID', title='Changer de matchup pour limiter un retard', champ='Orianna',
        bullets=["Ton mid est en retard, toi tu as gagné ta lane.",
                 "Échange : place ton mid contre un adversaire plus facile (par exemple un tank, contre qui il récupère ses waves).",
                 "Toi, va chercher un matchup où tu continues de mettre la pression.",
                 "Vérifie : waveclear, risques de dive et de 1v2, déplacements, objets, objectifs.",
                 f"{bold('Le but : la répartition la meilleure pour l’équipe')}, pas un matchup confortable pour un seul joueur."], size=31)]


# ================================================================ TOP
# Prompt TOPLANE du coach : 6 chapitres. Le contenu reste universel (pas rattaché à un joueur).
def top():
    L = 'top'
    s = [dict(kind='cover', who='Le carnet du top', players='La formation TOPLANE', icon='🛡️'),
         dict(kind='quest', levels=['Comprendre son rôle', 'Maîtriser sa phase de lane', 'Jouer avec les informations',
                                    'Comprendre la tempo', 'Mid et late game', 'Le bilan'])]
    # ---------- Chapitre 1 : comprendre son rôle
    s += [dict(kind='std', niv=1, kick='Le rôle', title='La lane du 1v1 pur', champ='Renekton',
        bullets=["Des duels individuels importants, sur une lane longue.",
                 "Des matchups qui pèsent beaucoup sur la phase de lane.",
                 f"{bold('La gestion des vagues')} y compte énormément, et les punitions sont fortes.",
                 "Beaucoup de micro, et de grosses responsabilités en side lane.",
                 "Mais le jungler, les objectifs et l'équipe restent dans l'équation."], size=34),
          dict(kind='std', niv=1, kick='Le rôle', title='Loin du bot, mais pas sans impact', champ='Zaahen',
        bullets=["Le top est loin du bot et du dragon : moins d'occasions d'intervenir directement en early.",
                 "Une game peut bouger vite sans que tu aies pu y faire grand-chose.",
                 f"Mais {bold('moins de déplacements ne veut pas dire peu d’impact')} :",
                 "ta lane, les ressources adverses, le jungler adverse, les objectifs du haut, les tours, les side lanes, les teamfights.",
                 "Certains tops pèsent énormément en teamfight."], size=34),
          dict(kind='std', niv=1, kick='Ta prio aide ton jungler', title='Ta prio compte', champ='Zaahen',
        bullets=["Pour le carapateur top, ton jungler regarde la prio mid + top.",
                 "Pas de prio chez toi ? Il pousse le carapateur vers le mid.",
                 f"Règle générale : {bold('rapproche-toi de tes alliés')}."]),
          dict(kind='grid4', niv=1, kick='Les 4 identités', title='Les 4 catégories de toplaners',
        cells=[('Tank', '#5aa9ff', ['Sion', 'Ornn'], ["Weak side : il tient sans ressources.", "Très fort en teamfight : engage, contrôle, protection."]),
               ('Splitpusher', '#b48cff', ['Trundle', 'Yorick'], ["Souvent besoin de 2 ou 3 objets.", "Demande une bonne connaissance macro."]),
               ('Bruiser', '#ff6b6b', ['Olaf', 'Darius'], ["Mêlée contre mêlée : dégâts + résistance.", "Un gank sur lui ? 1v2 EZ, il punit."]),
               ('Range', '#ffb347', ['Kennen', 'Vayne'], ["Très fort en lane contre la mêlée.", "Faible face au gank."])]),
          dict(kind='std', niv=1, kick='Les 4 identités', title='Des repères, pas des cases', champ='Gwen',
        bullets=["Tanks : Ornn, Sion, Malphite. Bruisers : Darius, Renekton, Aatrox.",
                 "Splitpushers : Fiora, Jax, Yorick. Range : Quinn, Vayne, Kennen, Gnar.",
                 f"Ces catégories {bold('se mélangent')} : un bruiser peut être un excellent splitpusher, un range peut bien jouer la side lane.",
                 "Pour ton champion : quelles forces, quelles limites, comment il gagne la game ?"], size=34),
          dict(kind='tiers', niv=1, kick='Les phases de jeu', title='Quand ton champion est-il fort ?',
        rows=[('EARLY / MID', '#ff6b6b', ['Renekton', 'Sett', 'Volibear', 'Kled', 'Riven', 'Shen']),
              ('MID / LATE', '#ffb347', ['Aatrox', 'Akali', 'Camille', "Cho'Gath", 'Dr. Mundo', 'Gangplank', 'Garen', 'Gnar', 'Kayle', 'Maokai', 'Lillia',
                                         'Nasus', 'Vladimir', 'Yone', 'Sion', 'Malphite', 'Illaoi', 'Jayce', 'Kennen', 'Rumble', 'Singed', 'Teemo']),
              ('POLYVALENT', '#ffd84a', ['Wukong', 'Darius', 'Yasuo', 'Fiora', 'Irelia', 'Sylas', 'Kassadin', 'Poppy', 'Yorick', 'Mordekaiser', 'Ornn',
                                         'Quinn', 'Urgot', 'Tryndamere']),
              ('MAUVAISE LANE', '#c9a36b', ['Vayne'])],
        foot="Repère du coach : ça bouge avec les patchs et les objets. Connais surtout le moment où TON champion est fort."),
          dict(kind='grid4', niv=1, kick='Les matchups', title='Ce que disent les matchups du top',
        cells=[('Range contre mêlée', '#ffb347', ['Quinn', 'Vayne'], ["Poke, punit les déplacements, contrôle l'accès aux sbires.", "Pas automatiquement safe : mobilité, vision, ganks."]),
               ('Bruiser contre tank', '#ff6b6b', ['Darius', 'Aatrox'], ["Dégâts prolongés, outils anti-tank, duel.", "Pas tous les bruisers contre tous les tanks."]),
               ('Tank contre range', '#5aa9ff', ['Ornn', 'Malphite'], ["Survivre à la lane, garder ses ressources.", "Puis apporter plus à l'équipe en fight."]),
               ('Splitpusher qui scale', '#b48cff', ['Fiora', 'Jax'], ["Accepte une lane moins bonne : limite les pertes, farme, prends l'XP.", "Pas tous plus forts après 2-3 objets : connais tes timings."])]),
          dict(kind='std', niv=1, kick='Les matchups', title='Un plan de lane, pas juste un counterpick', champ='Renekton',
        bullets=["Au top, le duel compte plus qu'au bot (où 4 champions s'affrontent).",
                 "Mais le jungler, les compos et les rotations changent quand même le matchup.",
                 f"{bold('Connaître le matchup sert à construire ton plan de lane')} : quand trade, quand reculer, quand scale."]),
          dict(kind='quiz', niv=1, champ='Yone', q="Tu joues un splitpusher qui a besoin de 2 objets, contre un range. Ton plan ?",
        ch=["All-in niveau 1 pour gagner la lane", "Limiter les pertes, farmer, prendre l'XP et atteindre mes timings", "Aller roam au mid tout de suite"], good=1,
        why="Ton champion gagne plus tard : la lane sert à arriver à tes timings sans trop perdre, puis à mettre la pression en side."),
          dict(kind='std', niv=1, kick='La draft', title='Comprends ta draft et tes conditions de victoire', champ='Gwen',
        bullets=["Ton rôle dans l'équipe, les forces et faiblesses de ton champion, les matchups.",
                 "Les besoins de tes alliés, les possibilités de teamfight et de splitpush, tes timings.",
                 "Un tank engage n'a pas les mêmes responsabilités qu'un splitpusher.",
                 "Tu domines ta lane ? N'oublie pas l'équipe. Tu as un bon plan ? Ne l'abandonne pas pour une action sans intérêt."], size=33)]
    s += first_self(L, 1)
    s += mindset(L, 1)
    # ---------- Chapitre 2 : maîtriser sa phase de lane
    s += [dict(kind='std', niv=2, kick='La micro', title='Connais ton champion par cœur', champ='Renekton',
        bullets=["Tes sorts, tes dégâts, tes combos, tes cooldowns, tes fenêtres d'engage et de repli, tes powerspikes, tes limites.",
                 "La micro est très importante dans les duels du top.",
                 f"Mais {bold('une très bonne micro ne compense pas une mauvaise wave')} ni de mauvaises décisions.",
                 "Maîtrise ton champion, et comprends dans quelles situations l'utiliser."], size=34)]
    s += patterns(L, 2)
    s += farm_tour(2) + cs_defi(L, 2) + trading(L, 2)
    s += [dict(kind='lane', niv=2, kick='Punir un last hit', title='Il s’avance pour un sbire : sois prêt',
        minions=[(36, 6, '#5aa9ff'), (52, 5, '#ff6b6b')],
        champs=[(24, 'mid', '🛡️', 'toi', '#5aa9ff'), (70, 'mid', '⚔️', 'lui', '#ff6b6b')],
        arrows=[(68, 36, 58, 46, '#ff6b6b'), (28, 34, 62, 30, '#ffb347')],
        bullets=["Il s'avance pour prendre un sbire : il ne peut pas venir gratuitement.",
                 "Sois prêt mentalement : place-toi, et lance ton attaque ou ton combo au moment de son last hit.",
                 "Pas besoin de réfléchir 3 secondes, mais pas d'attaque automatique non plus : le trade doit rester bon (sbires, réponse).",
                 f"{bold('Une bonne décision rapide repose sur une situation comprise à l’avance')}."], size=28)]
    s += waves_full(L, 2)
    s += [dict(kind='std', niv=2, kick='Les vagues au top', title='Pourquoi la wave compte encore plus ici', champ='Yone',
        bullets=["La lane est longue : une mauvaise wave te force à t'avancer loin de ta tour.",
                 "Un freeze adverse peut te mettre en grande difficulté.",
                 "Une erreur peut coûter : farm, XP, un gank, un mauvais back, un retard de niveau, le contrôle de la lane.",
                 "Exemple : mauvais trade, beaucoup de PV perdus, wave mal placée : il installe un freeze.",
                 f"{bold('Ça se rattrape')} : garde l'XP, demande un cover ou une aide au crash, back au bon moment."], size=32),
          dict(kind='lane', niv=2, kick='Les buissons', title='Utilise les buissons de la lane',
        bushes=[(30, True), (70, False)],
        minions=[(14, 4, '#5aa9ff'), (24, 4, '#ff6b6b')],
        champs=[(27, 'top', '🛡️', 'toi, caché', '#5aa9ff'), (54, 'mid', '⚔️', 'lui', '#ff6b6b')],
        arrows=[(34, 22, 47, 30, '#ffb347')],
        bullets=["Le premier buisson de ta lane : il cache où tu es et ce que tu prépares.",
                 "Il sert à menacer un trade, te repositionner, gêner son approche de ta wave, protéger un freeze.",
                 "Rester invisible te permet parfois de mieux gérer l'aggro des sbires.",
                 f"{bold('Un buisson ne garantit pas un freeze')} : comprends pourquoi la position est utile, et quand."], size=28,
        foot="Schéma simplifié : la position des buissons dépend de la carte, vérifie-la dans l'outil d'entraînement.")]
    s += deny(L, 2)
    s += after_kill(L, 2)
    # ---------- Chapitre 3 : jouer avec les informations
    s += tracking(L, 3) + vision(L, 3) + sides(L, 3)
    s += [dict(kind='std', niv=3, kick='Weakside au top', title='Savoir absorber la pression', champ='Ornn',
        bullets=["Un toplaner weakside doit savoir absorber la pression.",
                 "Joue plus prudent, préserve ton XP, évite les morts inutiles.",
                 "Reconnais les situations dangereuses et communique les menaces.",
                 "Attends tes fenêtres : ton moment va arriver."])]
    s += cover(L, 3)
    s += [dict(kind='map', niv=3, kick='Cover ou gank ?', title='Le jungler sécurise ton crash',
        maps=[dict(title='Gank : il cherche le kill', marks=[(9, 22, '⚔️', 'ennemi', '#ff6b6b'), (18, 34, '🌲', 'jungler', '#5fd39a')],
                   arrows=[(18, 32, 11, 25, '#ff6b6b', False)]),
              dict(title='Cover : il sécurise ton crash', marks=[(9, 12, '🌊', 'ta wave', '#5aa9ff'), (20, 22, '🌲', 'jungler à côté', '#5fd39a'), (9, 30, '🛡️', 'toi', '#5aa9ff')],
                   arrows=[(9, 28, 9, 16, '#5aa9ff', False)])],
        foot="Il peut aussi rester près de ta lane pour un countergank, ou t'aider à crash pour que tu puisses back.")]
    s += back_mid(L, 3)
    s += [dict(kind='std', niv=3, kick='Back, roam, invade', title='Les bons timings pour bouger', champ='Renekton',
        bullets=["Ne quitte pas ta lane quand tu perdrais trop de ressources.",
                 f"Les bonnes fenêtres : {bold('après un crash')}, sur une {bold('wave canon')}, après un kill, après un mauvais back adverse.",
                 "Aussi : quand une rotation importante ou un objectif vaut le déplacement.",
                 "Ce n'est pas interdit de roam à un autre moment : compare la valeur et le coût.",
                 f"{bold('Une bonne gestion de wave crée du temps pour agir ailleurs')}."], size=33)]
    s += intentions(L, 3)
    # ---------- Chapitre 4 : la tempo
    s += tempo(L, 4)
    s += [dict(kind='std', niv=4, kick='La quête du top (2026)', title='Ta quête de rôle : XP et Téléportation', champ='Gwen',
        bullets=["Elle avance avec tes sbires (deux fois plus vite sur ta lane) et le temps passé sur la lane du top.",
                 "Jusqu'au niveau 3, tu gagnes moins de gold et d'XP sur les sbires hors du top : reste sur ta lane.",
                 f"Une fois finie : {bold('niveau maximum 20')}, un bonus d'XP immédiat et plus d'XP ensuite.",
                 f"Et {bold('la Téléportation déchaînée')} en sort bonus si tu ne l'as pas prise (sinon, un bouclier après TP).",
                 "Les valeurs exactes changent avec les patchs : vérifie dans le jeu."], size=31),
          dict(kind='map', niv=4, kick='Exemple du coach', title='Jouer le 2e dragon avec la TP',
        maps=[dict(title='A · crash, TP, retour top', marks=[(12, 9, '💥', 'crash', '#5aa9ff'), (67, 70, '🌀', 'TP', '#b48cff')],
                   arrows=[(14, 12, 62, 64, '#b48cff', True), (62, 74, 14, 18, '#5fd39a', False)]),
              dict(title='B · crash, back, marche, TP retour', marks=[(12, 9, '💥', 'crash', '#5aa9ff'), (8, 92, '🏠', 'back', '#ffb347'), (67, 70, '🐉', 'dragon', '#ffb347')],
                   arrows=[(12, 12, 9, 86, '#ffb347', True), (14, 90, 60, 74, '#ffb347', False), (64, 66, 14, 14, '#b48cff', True)])],
        foot="Une possibilité, pas une obligation : wave, TP, PV, objets, son temps de retour, le risque pour ta tour, et si ton équipe peut vraiment jouer le fight."),
          dict(kind='std', niv=4, kick='Exemple du coach', title='Le 2e dragon : ce que tu vérifies', champ='Renekton',
        bullets=["La position de ta wave et le temps de retour de ton adversaire.",
                 "Ta TP, tes PV, tes ressources, tes objets.",
                 "Les positions adverses et le temps de trajet.",
                 "La valeur du dragon, le risque de perdre ta tour ou plusieurs waves.",
                 f"{bold('Si ton équipe peut vraiment jouer le combat')}."]),
          dict(kind='quiz', niv=4, champ='Gwen', q="Le 2e dragon arrive. Ta wave n'est pas crash et ta TP est en recharge. Tu fais quoi ?",
        ch=["Je pars au dragon en marchant tout de suite", "Je joue ma lane, je crash, et je dis à mon équipe que je ne viens pas", "Je reste sans rien dire"], good=1,
        why="Sans crash ni TP, tu perdrais beaucoup pour arriver tard. Préviens ton équipe : elle décide en connaissant ta situation.")]
    # ---------- Chapitre 5 : mid et late game
    s += [dict(kind='std', niv=5, kick='Après la lane', title='Ton rôle change', champ='Yone',
        bullets=["Après les premières tours, les lanes changent.",
                 "Récupère des side waves, mets la pression, prépare un objectif, rejoins ton équipe.",
                 "Défends une tour, attire une réponse adverse, participe au teamfight, crée de l'espace.",
                 "Ça dépend de ton champion et du plan de l'équipe : tous les tops ne jouent pas pareil."], size=34)]
    s += structures(L, 5)
    s += [dict(kind='cards', niv=5, kick='Teamfight ou splitpush ?', title='Choisis selon tes conditions de victoire', cols=2, champ='Gwen',
        cards=[('👥 Teamfight', '#5aa9ff', ["Votre compo est faite pour fight ensemble.", "Regroupez-vous quand c'est le bon moment."]),
               ('🗡️ Splitpush', '#b48cff', ["Vous perdez les fights, même avec une bonne compo ?",
                                           "Menace une tour, force une réponse, attire plusieurs adversaires.",
                                           "Crée de l'espace et des ressources pour l'équipe."])],
        foot="Le splitpush crée un avantage stratégique : ce n'est pas pousser une lane sans réfléchir."),
          dict(kind='std', niv=5, kick='Le splitpush', title='« Prendre la pression, c’est bien. Mais il ne faut pas mourir pour rien »', champ='Gwen',
        bullets=["Une mort peut faire perdre une tour, un objectif, ta pression, du gold, et le nombre.",
                 "Distingue : pression utile, pression sans effet, risque raisonnable, sacrifice rentable, mort inutile.",
                 f"{bold('La valeur de ta pression dépend de ce que ton équipe en fait')} pendant qu'ils te répondent.",
                 "Sacrifice ? Seulement si l'équipe gagne plus ailleurs, et que c'est prévu."], size=32),
          dict(kind='map', niv=5, kick='Le splitpush', title='Jouer à l’opposé de l’objectif',
        maps=[dict(marks=[(12, 10, '🗡️', 'toi en side', '#b48cff'), (67, 70, '🐉', 'objectif', '#ffb347'), (55, 62, '👥', 'ton équipe', '#5aa9ff')],
                   arrows=[(14, 14, 60, 64, '#b48cff', True)])],
        bullets=["Tu mets la pression en haut pendant que l'objectif est en bas.",
                 f"Avec ta {bold('TP')}, tu peux rejoindre ton équipe au bon moment.",
                 "Ça dépend : temps avant l'objectif, waves, TP disponible, cibles de TP, vision, matchup, menaces.",
                 "Pas toujours : l'idée est de créer de la pression sans perdre la possibilité d'aider."], size=28),
          dict(kind='std', niv=5, kick='Le splitpush', title='Garde tes bons matchups en side', champ='Renekton',
        bullets=["Tu gagnes ton duel contre leur top ? Continue de chercher ce duel en side lane.",
                 "Ça garde ta pression et force leurs réponses.",
                 f"Mais {bold('un bon duel ne te protège pas contre 2 ou 3 adversaires')}."])]
    s += sidelanes(5)
    s += fights(L, 5)
    # ---------- Chapitre 6 : bilan
    s += [dict(kind='std', niv=6, kick='Le bilan', title='Tout est relié', champ='Renekton',
        bullets=["Ta maîtrise du champion → tes trades → ton contrôle de la wave → tes ressources et tes déplacements.",
                 "Les infos et le tracking → ta prise de risque. La draft → tes responsabilités.",
                 "Weakside ou strongside → les ressources. La tempo → tes fenêtres d'action.",
                 "Les side lanes → la pression collective. La communication → les actions coordonnées.",
                 f"{bold('Ne retiens pas des conseils isolés')} : apprends à relier ces éléments."], size=31),
          dict(kind='quiz', niv=6, champ='Ornn', q="Quelle différence entre un gank et un cover ?",
        ch=["Aucune, c'est pareil", "Le gank cherche un kill, le cover sécurise ton action", "Le cover, c'est seulement pour le bot"], good=1,
        why="Le cover sécurise ton action (crash, back, déplacement), sans forcément chercher à tuer."),
          dict(kind='quiz', niv=6, champ='Yone', q="Pourquoi une avance de 15 CS compte ?",
        ch=["Ça ne compte pas sans kill", "C'est à peu près le gold d'un kill, sans avoir tué", "Seulement pour le score"], good=1,
        why="15 CS ≈ 250-300 golds : à peu près un kill. Et s'il a perdu de l'XP en plus, l'avance est encore plus grande.")]
    s += training(L, 6)
    s += [dict(kind='final', title='Boss final : la checklist du top',
        items=["Je connais l'identité de mon champion et le moment où il est fort",
               "Je sais quand utiliser mon combo, et pourquoi",
               "Chaque wave a un but, et je crash avant de bouger",
               "Je sais où est probablement le jungler adverse, sans le deviner",
               "Weakside, j'absorbe ; strongside, je punis",
               "Je joue la side lane avec ma TP, sans mourir pour rien",
               "Après un kill : ma wave, et où est leur jungler ?"])]
    return s


# ================================================================ MID
def mid():
    L = 'mid'
    s = [dict(kind='cover', who='Le carnet du mid', players='xena', icon='✨'),
         dict(kind='quest', levels=['Le rôle', 'Le farm', 'Le trading', 'Les vagues', 'Back, swap et mid game', 'Les fights', 'Mindset et entraînement'])]
    s += role(L, 1, 'Hwei')
    s += [dict(kind='std', niv=1, kick='Ta prio aide ton jungler', title='Ta prio compte', champ='Orianna',
        bullets=["Pour le carapateur, ton jungler regarde toujours ta prio mid.",
                 "Tu as la prio ? Il pousse le carapateur vers toi : décale vite pour l'aider.",
                 "Un objectif à deux avec ton jungler ? Ton ADC peut prendre tes camps.",
                 f"Règle générale : {bold('rapproche-toi de tes alliés')}."])]
    s += farm_tour(2) + cs_defi(L, 2) + trading(L, 3) + patterns(L, 3) + deny(L, 3) + after_kill(L, 3) + waves_full(L, 4)
    s += back_mid(L, 5) + tracking(L, 5) + vision(L, 5) + sides(L, 5) + cover(L, 5) + tempo(L, 5) + structures(L, 5) + sidelanes(5)
    s += fights(L, 6)
    s += mindset(L, 7) + first_self(L, 7) + intentions(L, 7) + training(L, 7)
    s += [dict(kind='final', title='Boss final : la checklist du mid',
        items=["Je garde ma prio pour mon jungler", "Je trade quand il va chercher un sbire",
               "Chaque wave a un but : freeze, slow push, fast push, reset", "Je crash ma wave avant de back",
               "Mage ou pick : jamais de face check", "Je check R et flash avant chaque fight"])]
    return s


# ================================================================ SUPPORT
def support():
    L = 'support'
    s = [dict(kind='cover', who='Le carnet du support', players='TheM3talDrakonar', icon='💞'),
         dict(kind='quest', levels=['Le rôle', 'La bot lane en duo', 'Le trading', 'Les vagues, vite fait', 'Le back', 'Les fights', 'Mindset et entraînement'])]
    s += role(L, 1, "Vel'Koz")
    s += botlane(L, 2)
    s += trading(L, 3) + patterns(L, 3) + deny(L, 3)
    s += waves_short(L, 4)
    s += [dict(kind='std', niv=5, kick='Le back', title='Back avec ton ADC', champ='Pyke',
        bullets=["Toujours crash la wave avant de back.",
                 f"Timing de {bold('wave canon')} : c'est le moment d'aller ward ou d'aider un objectif.",
                 "Gros composant ou objet à acheter ? Ne reste pas avec tes golds."])]
    s += tracking(L, 5) + vision(L, 5) + sides(L, 5) + cover(L, 5) + tempo(L, 5)
    s += fights(L, 6)
    s += mindset(L, 7) + first_self(L, 7) + intentions(L, 7) + training(L, 7)
    s += [dict(kind='final', title='Boss final : la checklist du support',
        items=["Je sais si notre bot est all-in, poke ou sustain", "Je conteste le niveau 2",
               "Freeze agressif : je zone, mon ADC farme", "Timing canon : je vais ward",
               "Tank ? Je face check. Squishy ? Je reste derrière", "Je check R et flash avant chaque fight"])]
    return s


DECKS = {'jungle': jungle, 'adc': adc, 'top': top, 'mid': mid, 'support': support}
