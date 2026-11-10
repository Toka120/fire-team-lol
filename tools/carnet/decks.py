"""Les 5 carnets, dans l'ordre des chapitres (niveaux)."""
from blocks import *

# ================================================================ JUNGLE
def jungle():
    L = 'jungle'
    s = [dict(kind='cover', who='Le carnet du jungler', players='Toks42o', icon='🌲'),
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
    s += waves_short(L, 7)
    s += fights(L, 8)[:2]
    s += mindset(L, 8, jungle=True)
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
    s += trading(L, 5)
    s += waves_full(L, 6)
    s += botlane(L, 7)
    s += back_mid(L, 8)
    s += fights(L, 9)
    s += mindset(L, 10)
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


# ================================================================ TOP
def top():
    L = 'top'
    s = [dict(kind='cover', who='Le carnet du top', players='lebrésilien', icon='🛡️'),
         dict(kind='quest', levels=['Le rôle', 'Le farm', 'Le trading', 'Les vagues', 'Back et mid game', 'Les fights', 'Mindset et entraînement'])]
    s += role(L, 1, 'Renekton')
    s += [dict(kind='std', niv=1, kick='Ta prio aide ton jungler', title='Ta prio compte', champ='Zaahen',
        bullets=["Pour le carapateur top, ton jungler regarde la prio mid + top.",
                 "Pas de prio chez toi ? Il pousse le carapateur vers le mid.",
                 f"Règle générale : {bold('rapproche-toi de tes alliés')}."])]
    s += farm_tour(2) + cs_defi(L, 2) + trading(L, 3) + waves_full(L, 4) + back_mid(L, 5) + fights(L, 6)
    s += mindset(L, 7) + training(L, 7)
    s += [dict(kind='final', title='Boss final : la checklist du top',
        items=["Je farme sous ma tour sans perdre de sbire", "Je trade quand il va chercher un sbire",
               "Chaque wave a un but : freeze, slow push, fast push, reset", "Je crash ma wave avant de back",
               "Je ne vais jamais chercher une wave seul", "Je check R et flash avant chaque fight"])]
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
    s += farm_tour(2) + cs_defi(L, 2) + trading(L, 3) + waves_full(L, 4) + back_mid(L, 5) + fights(L, 6)
    s += mindset(L, 7) + training(L, 7)
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
    s += trading(L, 3)
    s += waves_short(L, 4)
    s += [dict(kind='std', niv=5, kick='Le back', title='Back avec ton ADC', champ='Pyke',
        bullets=["Toujours crash la wave avant de back.",
                 f"Timing de {bold('wave canon')} : c'est le moment d'aller ward ou d'aider un objectif.",
                 "Gros composant ou objet à acheter ? Ne reste pas avec tes golds."])]
    s += fights(L, 6)
    s += mindset(L, 7) + training(L, 7)
    s += [dict(kind='final', title='Boss final : la checklist du support',
        items=["Je sais si notre bot est all-in, poke ou sustain", "Je conteste le niveau 2",
               "Freeze agressif : je zone, mon ADC farme", "Timing canon : je vais ward",
               "Tank ? Je face check. Squishy ? Je reste derrière", "Je check R et flash avant chaque fight"])]
    return s


DECKS = {'jungle': jungle, 'adc': adc, 'top': top, 'mid': mid, 'support': support}
