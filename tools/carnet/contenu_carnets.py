# Contenu des carnets du coach : uniquement les notes du coach (et ses images de cours), triées par lane.
# Chaque slide : dict avec 'k' (type) ; 'champ' facultatif pour choisir le skin de fond.

def lv(n, t): return f'Niveau {n} · {t}'

# ---------- Blocs communs ----------

def wave_intro(n):
    return {'k': 'text', 'lvl': lv(n, 'Les vagues'), 'title': 'La wave est un outil',
            'bullets': ["Le bon outil au bon moment : on n'enfonce pas un clou avec une scie.",
                        'Deux groupes de sbires s’affrontent : le plus nombreux gagne et pousse.',
                        'Comme un fight à 10 contre 10 : un mort, et c’est 10 contre 9… puis 8 contre 6.',
                        'Chaque gestion de wave a un but : dive, reset, objectif. Jamais pour rien.']}

def wave_cards(n, adc=False):
    freeze_plus = ['Tu farmes en sécurité près de ta tour.']
    if adc: freeze_plus.append('Freeze agressif : ton support zone la botlane adverse pendant que tu farmes.')
    freeze_plus.append('Freeze défensif : tu es en retard ou le jungler adverse rôde.')
    s = [
        {'k': 'wave', 'lvl': lv(n, 'Les vagues'), 'emoji': '🧊', 'term': 'Le freeze', 'def': 'La wave ne bouge plus.',
         'plus': freeze_plus, 'moins': ['Tu perds la prio.', 'Mal tenu : la wave bounce.']},
        {'k': 'text', 'lvl': lv(n, 'Les vagues'), 'title': 'Comment freeze devant la tour ?',
         'bullets': ['Garde 3 casters adverses full PV.', 'Wave canon : 3 casters + 1 mêlée.',
                     'Mal fait, la wave bounce : elle revient vers toi.'],
         'chips': ['3 casters full PV', '3 casters + 1 mêlée']},
        {'k': 'text', 'lvl': lv(n, 'Les vagues'), 'title': 'Quand éviter de freeze ?',
         'bullets': ['Pas de wave ? Ne force pas : laisse-la crash et farme sous ta tour.',
                     'Au mid game : rends-toi disponible sur la carte.'] +
                    (['Avec Tristana, freeze est très difficile.', 'Contre une Sivir aussi.'] if adc else [])},
        {'k': 'wave', 'lvl': lv(n, 'Les vagues'), 'emoji': '🐢', 'term': 'Le slow push', 'def': 'Tu amènes la wave lentement.',
         'plus': ['Reset : slow push la 1re wave, stack la 2e, fast push la 3e.',
                  'Dive' + (' avec ton support' if adc else '') + ' ou avec ton jungler : il perd XP et golds.',
                  "S'il casse ton slow push : sois agressif, tu as plus de sbires."],
         'moins': ['Tu es loin de ta tour : attention aux ganks.']},
        {'k': 'wave', 'lvl': lv(n, 'Les vagues'), 'emoji': '⚡', 'term': 'Le fast push', 'def': 'Tu pousses la wave le plus vite possible.',
         'plus': ['Termine un slow push pour back (reset).', 'Crash ta wave avant chaque back.'],
         'moins': ['Trop crash au mauvais moment : la wave bounce.']},
        {'k': 'big', 'lvl': lv(n, 'Les vagues'), 'text': 'Fast push SEULEMENT si tu peux crash la wave. Sinon : back instant pour acheter des items !'},
        {'k': 'wave', 'lvl': lv(n, 'Les vagues'), 'emoji': '↩️', 'term': 'Le bounce', 'def': 'La wave crash, puis revient naturellement.',
         'plus': ['Les sbires frappent ensemble, comme une seule personne : deux casters tapent le même mêlée.',
                  "Exemple : l'adversaire a crash la wave, donc il y a un bounce."],
         'moins': ['Le niveau 3 et demi : tu as trop crash, il passe niveau 3 avant toi.']},
        {'k': 'wave', 'lvl': lv(n, 'Les vagues'), 'emoji': '🔄', 'term': 'Le reset', 'def': 'Tu annules tout.',
         'plus': ['Il a pris sa wave, il reste 2 sbires, la suivante n’est pas là : tu prends les 2.',
                  'Tu back en même temps que lui : la wave revient au milieu.'],
         'moins': []},
        {'k': 'quiz', 'lvl': lv(n, 'Les vagues'), 'q': 'Tu as mieux farmé, mais il passe niveau 3 avant toi. Pourquoi ?',
         'choices': ['Il a eu de la chance', 'Ta wave a bounce : tu l’avais trop crash', 'Il a pris un camp'], 'ans': 1,
         'why': 'Le bounce tue vite tes sbires : il prend l’XP pendant que toi, tu es encore sous ta tour.'},
        {'k': 'text', 'lvl': lv(n, 'Les vagues'), 'title': 'Garder la main sur sa wave',
         'bullets': ['Place-toi près de tes sbires : ils tapent avec toi.',
                     'Avec plus de sbires, tu gagnes les longs fights, et même les courts trades.',
                     'Plus la game avance, plus les sbires sont forts.']},
    ]
    return s

def wave_short(n):
    return {'k': 'cards', 'lvl': lv(n, 'Les vagues, vite fait'), 'title': 'Les vagues en 5 mots',
            'cards': [('🧊 Freeze', 'La wave ne bouge plus.'), ('🐢 Slow push', 'La wave avance lentement.'),
                      ('⚡ Fast push', 'La wave avance vite.'), ('↩️ Bounce', 'La wave crash puis revient.'),
                      ('🔄 Reset', 'La wave revient au milieu.')]}

def farm_tour(n):
    return {'k': 'text', 'lvl': lv(n, 'Le farm'), 'title': 'Farmer sous ta tour',
            'bullets': ['La tour tape d’abord le canon, ou le premier sbire qu’elle voit.',
                        'Un ennemi te tape ? Elle change de cible et tape l’ennemi.',
                        'Caster : une auto, un coup de tour, une auto.',
                        'Plus tard, avec plus d’AD, une seule auto suffit.',
                        'Un sbire entamé arrive ? Prépare-le pour le last hit, en restant safe.',
                        'Utilise tes sorts pour farmer.']}

def trades(n, bot=False):
    return [
        {'k': 'cards', 'lvl': lv(n, 'Les trades'), 'title': 'Court trade ou long trade',
         'cards': [('⚡ Court trade', 'Tu tapes et tu repars.'), ('🗡️ Long trade', 'Le combat dure.')] +
                  ([('🔥 All-in', 'Préfère les longs trades.')] if bot else [])},
        {'k': 'cards', 'lvl': lv(n, 'Les trades'), 'title': 'Quand trade ? Les 5 repères',
         'cards': [('🔮 Les runes', 'Court trade ou long trade ?'), ('🎯 Les last hits', 'Il va chercher un sbire : punis-le.'),
                   ('🌊 L’état de la wave', 'Plus de sbires de ton côté : tu gagnes.'), ('⏱️ Les cooldowns', 'Ses sorts dangereux sont tombés ?'),
                   ('♟️ Les trading patterns', 'Comment il trade, et comment tu réponds.')]},
        {'k': 'text', 'lvl': lv(n, 'Les trades'), 'title': 'Trader en farmant',
         'bullets': ['Mets des dégâts sans rater tes sbires.',
                     'Jeu d’échange : quand il farme, tu tapes. Quand tu farmes, il peut taper.',
                     'Identifie ses sorts les plus dangereux, punis ses erreurs.',
                     'Trade gagné ? Ne prends pas la confiance : ne ruine pas ta lane en chassant.']},
    ]

def reponse(n):
    return {'k': 'big', 'lvl': lv(n, 'La carte'), 'text': 'Il y a toujours une réponse.',
            'sub': 'Après votre play, ils jouent ailleurs : un gank plus tard, à l’opposé, ou des camps.'}

def no_facecheck(n, lane):
    extra = {'adc': 'Toi, l’ADC : tu ne dois pas mourir au début du fight.',
             'mid': 'Mage ou pick comme TF : jamais de face check.',
             'top': 'Tu n’es pas un tank ? Laisse-les passer devant.',
             'support': 'Tu joues tank ? Tu peux checker. Sinon, reste derrière.',
             'jungle': 'Pas d’info ? Ne rentre pas dans la jungle à l’aveugle.'}[lane]
    return {'k': 'text', 'lvl': lv(n, 'Survivre'), 'title': 'Jamais de face check',
            'bullets': ['Pas d’info ? Doute de tout : « où sont les gens ? »',
                        'Les tanks passent devant et checkent. Les squishy restent derrière.',
                        extra,
                        'Sous une R de zone, ne vous regroupez jamais.',
                        'Rapproche-toi de tes alliés : kite vers eux, bait vers eux.']}

def check_fight(n):
    return {'k': 'defi', 'lvl': lv(n, 'Les fights'), 'title': 'Check avant chaque fight',
            'items': ['Mes R et mes flashs, ceux de mes alliés', 'Leurs R et leurs flashs',
                      'Sans R ou sans flash : je joue safe et je le call', 'Un ennemi sans flash : on joue sur lui',
                      'Ma team lance le fight : est-ce un bon fight ?'],
            'reward': 'Pense aussi comme l’ennemi : nos conseils valent pour eux.'}

def front_to_back(n):
    return {'k': 'text', 'lvl': lv(n, 'Les fights'), 'title': 'Jouer front to back',
            'bullets': ['Tape le champion que tu vois, pas l’ADC au fond.',
                        'Pas de tunnel vision : s’il est trop loin, il ne fait pas de dégâts.',
                        'Envoie tes sorts, recule un peu pour les récupérer, puis reviens.']}

def objectif_pos(n):
    return {'k': 'text', 'lvl': lv(n, 'Les fights'), 'title': 'Placé avant l’objectif',
            'bullets': ['Ton équipe commence un objectif ? Ils peuvent arriver.',
                        'Ils arrivent par le haut ? Place-toi à l’opposé.',
                        'Pense au pre-fight avant l’objectif.']}

def recall(n):
    return {'k': 'text', 'lvl': lv(n, 'Le back'), 'title': 'Back au bon moment',
            'bullets': ['Toujours crash ta wave avant de back.', 'Back sur une wave canon si possible.',
                        'Timing de wave canon : va ward, aide un objectif.',
                        'Un gros composant ou un objet à acheter ? Ne reste pas avec tes golds.']}

def midgame(n, lane):
    b = ['Push ta wave au mid, puis va fight.', 'Au mid game, évite de freeze : rends-toi disponible.',
         'Jamais de wave seul : fais-toi shadow, et dis-le.', 'Pas de shadow ? Attends la wave en sécurité.',
         'Aller à 5 chercher une wave, c’est bien aussi.']
    if lane != 'jungle':
        b.append('Ton jungler est à l’opposé ? Prends des camps : demande-lui.')
    return {'k': 'text', 'lvl': lv(n, 'Le mid game'), 'title': 'Toujours disponible', 'bullets': b}

def fog(n):
    return {'k': 'text', 'lvl': lv(n, 'Le mid game'), 'title': 'Savoir fog',
            'bullets': ['Ne donne pas d’infos : où tu es, ce que tu fais, tes objets.',
                        'Ils pensent que tu as un objet ? Tu en as peut-être deux.',
                        'Ça marche pour toutes les lanes et tous les rôles.']}

def mindset(n):
    return [
        {'k': 'text', 'lvl': lv(n, 'Le mental · Solo queue'), 'title': 'Solo queue : mode 1v9',
         'bullets': ['Concentre-toi sur ton jeu, pas sur celui de tes alliés.', 'Tes erreurs, tes placements : c’est ça qui compte.',
                     '« Comment je gagne cette game ? » avant la draft, pendant la draft, pendant la game.',
                     'Respecte ton plan.', 'Tu ne contrôles que toi-même.', 'Reste positif : ton moment va arriver.']},
        {'k': 'text', 'lvl': lv(n, 'Le mental · En équipe'), 'title': 'En équipe : on joue ensemble',
         'bullets': ['Call : « pas de flash », « pas de R », « je ne veux pas fight ».',
                     'Donne les infos : « je sens le danger », « ils veulent m’engage ».',
                     'Chacun fait ce travail d’info, à chaque game.',
                     'Demande les ressources : « je te prends ça ».']},
    ]

def entrainement(n, lane):
    quoi = {'jungle': 'ton clear de jungle', 'support': 'le warding avec tes sorts'}.get(lane, 'ton farm')
    return [
        {'k': 'defi', 'lvl': lv(n, 'L’entraînement'), 'title': 'Avant chaque game',
         'items': [f'5 à 10 min en outil d’entraînement : {quoi}',
                   'Shadow laning : imagine ta game de A à Z, comme le shadow boxing',
                   'Fixe-toi un objectif pour la game'],
         'reward': 'Jouer sans jouer.'},
        {'k': 'text', 'lvl': lv(n, 'L’entraînement'), 'title': 'Crée-toi des scénarios',
         'bullets': ['Plus tu imagines de scénarios, moins tu es surpris.',
                     '« Le fight commence. Il peut y avoir leur jungler. »',
                     '« J’ai mon flash ? Non. Alors je garde la wave de mon côté. »']},
    ]

def objectif_cs(n):
    return {'k': 'defi', 'lvl': lv(n, 'Ton objectif'), 'title': 'Défi CS',
            'items': ['7 CS par minute à 10 minutes', '7 CS par minute à 20 minutes : 140 CS',
                      'Réussi ? Passe au suivant : les teamfights'],
            'reward': 'Ne stagne pas. Mais pas matrixé par les CS : en fight, on a besoin de toi.'}

def bot_types(n):
    return [
        {'k': 'triangle', 'lvl': lv(n, 'La botlane'), 'title': 'Le triangle de la botlane'},
        {'k': 'cards', 'lvl': lv(n, 'La botlane'), 'title': 'Identifier le type de botlane',
         'cards': [('🔥 All-in · Leona', 'Deux temps : poke ou flash, puis kill.'), ('💧 Poke · Lux', 'Étouffe la lane adverse.'),
                   ('🌿 Sustain · Soraka', 'Reçoit, scale et punit.')],
         'lead': 'Chaque ADC peut aller avec chaque support : c’est le duo qui fait le type.'},
        {'k': 'wave', 'lvl': lv(n, 'La botlane'), 'emoji': '🔥', 'term': 'Botlane all-in', 'def': 'Deux temps : poke ou faire flash, puis kill.',
         'plus': ['Préfère les longs trades.'],
         'moins': ['Niveau 1 contre une lane poke : danger, tu peux perdre trop de PV pour all-in.', 'Ne te fais pas poke avant.']},
        {'k': 'wave', 'lvl': lv(n, 'La botlane'), 'emoji': '💧', 'term': 'Botlane poke', 'def': 'Tu étouffes la botlane adverse.',
         'plus': ['Slow push, fais-lui rater du farm, gratte des plates.', 'Pendant qu’il farme : sorts et punitions sur son placement.'],
         'moins': ['Contre une all-in, le long trade est pour eux.', 'Tu push sous leur tour : gank facile.']},
        {'k': 'wave', 'lvl': lv(n, 'La botlane'), 'emoji': '🌿', 'term': 'Botlane sustain', 'def': 'Prête à recevoir.',
         'plus': ['Scale et punis les erreurs adverses.', 'Freeze pour rester safe, puis slow push pour crash.',
                  'Sors de la lane avec le plus de ressources.'],
         'moins': []},
        {'k': 'quiz', 'lvl': lv(n, 'La botlane'), 'q': 'Shaco + Caitlyn : c’est une botlane poke ?',
         'choices': ['Oui, c’est du poke', 'Non : à première vue poke, mais c’est un bait pour recevoir'], 'ans': 1,
         'why': 'Certaines botlanes ont l’air poke mais jouent à recevoir. Et une botlane n’est pas immuable.'},
    ]

def bot_lane_rules(n):
    return {'k': 'text', 'lvl': lv(n, 'La botlane'), 'title': 'Les règles du duo',
            'bullets': ['Le plan de jeu du duo se construit avec le wave management.', 'Toujours contester le niveau 2 si possible.',
                        'Respecte le timing du jungler, pendant ou avant le carapateur.', 'Trade et réponds, ensemble.']}

def final(title, items, badge):
    return {'k': 'final', 'title': title, 'items': items, 'badge': badge}


# ---------- JUNGLE ----------
JUNGLE = dict(
    id='jungle', cat='JUNGLE', ico='🌲', pseudo='Toks42o · Kayn Effect', role='Jungle',
    titre='Le carnet du jungler', resume='Les notes du coach pour Toks42o et Kayn Effect : ta classe, ton départ, le carapateur, les ganks, en mode quête.',
    slides=[
        {'k': 'cover', 'title': 'Le carnet du jungler', 'who': 'Toks42o · Kayn Effect', 'sub': 'Ta quête en 9 niveaux, avec les notes du coach.'},
        {'k': 'quest', 'levels': ['Le rôle', 'Ta classe', 'Ton départ', 'Le carapateur', 'Les ganks', 'Les buffs', 'Les vagues, vite fait', 'La carte et les ressources', 'Le mental et l’entraînement']},
        {'k': 'text', 'lvl': lv(1, 'Le rôle'), 'title': 'Le jungler', 'lead': 'Tu farmes ta jungle et tu ganks les lanes.',
         'chips': ['4 camps', '+ Red', '+ Blue', '+ le Carapateur, à personne']},
        {'k': 'cards', 'lvl': lv(2, 'Ta classe'), 'title': 'Choisis ta classe',
         'cards': [('⚔️ Ganker', 'Fort en early, souvent un CC. Priorise les ganks.'),
                   ('🌾 Farmeur', 'Pas très fort en early, clear très bien. Priorise le farm.')],
         'lead': 'Puis : monocible ou AOE (dégâts de zone). La plupart des farmeurs sont AOE.'},
        {'k': 'quiz', 'lvl': lv(2, 'Ta classe'), 'q': 'Ton champion est fort en early et a un CC. Tu es…',
         'choices': ['Farmeur', 'Ganker', 'Les deux'], 'ans': 1,
         'why': 'Regarde le kit de sorts : fort en early + CC = ganker. Faible en early mais bon clear = farmeur.'},
        {'k': 'path', 'lvl': lv(3, 'Ton départ'), 'title': 'Monocible : start Blue', 'champ': 'Lee Sin',
         'steps': ['Blue', 'Grump', 'Loups', '4 à 5 camps', 'Carapateur'],
         'bullets': ['Blue, Grump, Loups : peu de cibles, parfait en monocible.',
                     'Smite sur le Grump avant de le finir : tu récupères la vie qu’il t’a prise.',
                     'Ward à l’opposé, côté red.']},
        {'k': 'path', 'lvl': lv(3, 'Ton départ'), 'title': 'Ganker AOE : start Red', 'champ': 'Jarvan IV',
         'steps': ['Red', 'Krugs', 'Corbins', 'Loups', 'Blue', 'Carapateur ou gank'],
         'bullets': ['Il peut skip un camp : il préfère aller au carapateur.', 'C’est situationnel : ça dépend de ton clear.']},
        {'k': 'cards', 'lvl': lv(3, 'Ton départ'), 'title': 'Combien de camps ?',
         'cards': [('⚔️ Ganker', 'Minimum 4 à 5 camps. Full clear propre ? Carré. Sinon, priorise les ganks.'),
                   ('🌾 Farmeur', 'Priorise le farm.'), ('🔁 Les deux', 'Parfois, un full clear est intéressant.')]},
        {'k': 'quiz', 'lvl': lv(3, 'Ton départ'), 'q': 'Tu joues un monocible. Tu commences où ?',
         'choices': ['Au Red', 'Au Blue', 'Au carapateur'], 'ans': 1,
         'why': 'Le Blue, puis le Grump et les loups : il y a peu de cibles dessus.'},
        {'k': 'text', 'lvl': lv(4, 'Le carapateur'), 'title': 'La course au carapateur',
         'bullets': ['C’est une course : arrive le premier.', 'Runes : la vitesse est meilleure sur la plupart des champions.',
                     'Les sites pour les runes et la data : LoLalytics, DPM, Porofessor, OP.GG.']},
        {'k': 'cards', 'lvl': lv(4, 'Le carapateur'), 'title': 'Les 2 voyants avant le carapateur',
         'cards': [('🚦 1 · Les prios', 'Carapateur bot : prio mid + bot. Carapateur top : prio mid + top. Pas de prio ? Tu n’y vas pas.'),
                   ('➡️ 2 · Le pousser', 'Pousse le carapateur vers la lane où tu as la prio : ton laner décale plus vite.')]},
        {'k': 'quiz', 'lvl': lv(4, 'Le carapateur'), 'q': 'Carapateur bot : tu regardes quelles prios ?',
         'choices': ['Top + mid', 'Mid + bot', 'Seulement bot'], 'ans': 1,
         'why': 'Bot : mid + bot. Top : mid + top. Et tu le pousses vers la lane où tu as la prio.'},
        {'k': 'big', 'lvl': lv(4, 'Le carapateur'), 'text': 'Rapproche-toi toujours de tes alliés.',
         'sub': 'Le carapateur, un fight, un bait : kite vers tes alliés, rapproche-toi d’eux.'},
        {'k': 'text', 'lvl': lv(5, 'Les ganks'), 'title': 'Ganker : choisis ta cible',
         'bullets': ['Ganker : les ganks avant le farm, selon tes sorts.', 'Lanes prêtes : elles ont installé un freeze.',
                     'La plus feed.', 'La plus facile : un allié qui grab ou qui stun.', 'Un kill sûr, ou un adversaire sans flash.']},
        {'k': 'text', 'lvl': lv(5, 'Les ganks'), 'title': 'Farmeur : gank seulement si…',
         'bullets': ['Kill sûr, ou flash sûr à faire claquer.', 'Ne perds pas de temps.',
                     'Adapte-toi au rythme de la partie : accélérer, plus de lanes, plus de camps.',
                     'Ne sois pas obnubilé par les camps.']},
        {'k': 'quiz', 'lvl': lv(5, 'Les ganks'), 'q': 'Toutes les lanes sont gankables. Tu choisis…',
         'choices': ['La plus proche', 'La plus feed, ou la plus facile à kill', 'Celle de ton duo'], 'ans': 1,
         'why': 'La plus feed, la plus facile (un allié grab ou stun), un kill sûr ou un adversaire sans flash.'},
        {'k': 'cards', 'lvl': lv(6, 'Les buffs'), 'title': 'Red, Blue, familier',
         'cards': [('🔴 Red buff', 'Dégâts sur les auto-attaques, slow, régénération de PV.'),
                   ('🔵 Blue buff', 'Régénération de mana et réduction des cooldowns.'),
                   ('🐾 Familier', 'Trois bonus possibles.')]},
        wave_short(7),
        {'k': 'text', 'lvl': lv(7, 'Les vagues, vite fait'), 'title': 'Pourquoi ça te concerne',
         'bullets': ['Une lane qui a installé un freeze : elle est prête à être gank.',
                     'Ta prio de lane décide de ton carapateur.']},
        reponse(8),
        {'k': 'text', 'lvl': lv(8, 'La carte et les ressources'), 'title': 'Laisser les ressources',
         'bullets': ['À un moment de la game, laisse les ressources à tes laners : ils doivent scale.',
                     'Sauf si tu es un jungler qui scale très fort.', 'Un laner a besoin d’un objet ? Laisse-lui le camp.',
                     'En équipe, il te demande : « je te prends ça ».']},
        no_facecheck(8, 'jungle'),
        check_fight(8),
        *mindset(9),
        *entrainement(9, 'jungle'),
        final('Boss final : ta checklist', ['Je connais ma classe : ganker ou farmeur, monocible ou AOE',
               'Mon départ : Blue en monocible, Red en AOE', 'Je regarde les prios avant le carapateur',
               'Je ganke la bonne lane', 'Je laisse les ressources au bon moment'], 'Jungler FIRE'),
    ])

# ---------- ADC ----------
ADC = dict(
    id='adc', cat='ADC', ico='🏹', pseudo='The World', role='ADC',
    titre='Le carnet de l’ADC', resume='Les notes du coach pour The World : les fondamentaux, les vagues, la botlane et le mental, en mode quête.',
    slides=[
        {'k': 'cover', 'title': 'Le carnet de l’ADC', 'who': 'The World', 'sub': 'Ta quête en 10 niveaux, avec les notes du coach.'},
        {'k': 'quest', 'levels': ['Le rôle', 'Les fondamentaux', 'Le placement', 'Le farm', 'Les trades', 'Les vagues', 'La botlane', 'Le back et le mid game', 'Les fights', 'Le mental et l’entraînement']},
        {'k': 'text', 'lvl': lv(1, 'Le rôle'), 'title': 'L’ADC', 'lead': 'Mettre des dégâts constants en teamfight, en restant en vie.',
         'bullets': ['La petite princesse : faible, on la protège.', 'En teamfight, on la protège.', 'En lane, elle a besoin de son support. Elle doit bien farmer.']},
        {'k': 'cards', 'lvl': lv(1, 'Le rôle'), 'title': 'Les 4 catégories d’ADC',
         'cards': [('💎 Hyper carry · Jinx', 'Faible early, fort late. FARMIIING !!'), ('🧰 Utilitaire · Ashe, Jhin', 'Combat long. Pas besoin d’être feed.'),
                   ('👊 Lane bully · Draven', 'Fort early, faible late. FIGHTIIING !!!'), ('🛡️ Front to back · Miss Fortune', 'Correct en lane. Excellent en teamfight.')]},
        {'k': 'text', 'lvl': lv(2, 'Les fondamentaux'), 'title': '1 · Savoir farmer', 'champ': 'Zeri',
         'bullets': ['Tu scales avec les golds. Les autres lanes scalent avec l’XP.',
                     'Swap lane vers 15 min, quand la 1re tour tombe, ou pour contest le Héraut.',
                     'Le mid est une lane courte : plus safe pour l’ADC fragile.',
                     'Swap aussi à d’autres moments : casse le rythme, surprends l’adversaire.']},
        {'k': 'text', 'lvl': lv(2, 'Les fondamentaux'), 'title': '2 · Identifier les menaces', 'champ': 'Fiddlesticks',
         'bullets': ['Un assassin pick : il est là pour l’ADC.', 'Fiddlesticks : attention aux escarmouches.',
                     'Tu te rapproches trop ? La R de Fiddlesticks te one-shot.']},
        {'k': 'text', 'lvl': lv(2, 'Les fondamentaux'), 'title': '3 · Anticiper, être parano', 'champ': "Kai'Sa",
         'bullets': ['Champions cheap comme Ezreal ou Kai’Sa : envoie ton Q (Ezreal) ou ton Z (Kai’Sa) pour checker.',
                     'Pas de face check : si tu dois faire le tour, fais le tour.',
                     'Pas d’info ? « Où sont les gens ? Je ne vois personne : attention. »']},
        {'k': 'text', 'lvl': lv(2, 'Les fondamentaux'), 'title': '4 · Être patient', 'champ': 'Amumu',
         'bullets': ['Avec ou sans R, avec ou sans flash : tu ne joues pas pareil.', 'Sans : joue safe et call-le, même en solo queue.',
                     'Tu prends une R ou une bandelette d’Amumu ? C’est ta faute.', 'Reste à range. Les outplays et les flashs, anticipe-les aussi.']},
        {'k': 'quiz', 'lvl': lv(2, 'Les fondamentaux'), 'q': 'Tu prends la R d’Amumu et tu meurs. La faute de qui ?',
         'choices': ['Ton support', 'Ta team', 'Toi'], 'ans': 2,
         'why': 'Un tank peut encaisser le stun. L’ADC carry qui se fait stun, c’est à lui d’être à range.'},
        {'k': 'text', 'lvl': lv(2, 'Les fondamentaux'), 'title': '5 · Matchups et responsabilités',
         'bullets': ['Connais les forces et les faiblesses de chaque matchup.', 'Feed ? Crée du jeu.',
                     '10-0 en early : on ne doit pas arriver au late game.', 'Sinon, c’est entre guillemets ta faute : tu avais tout pour snowball.']},
        objectif_cs(2),
        {'k': 'text', 'lvl': lv(3, 'Le placement'), 'title': 'Se placer selon les menaces', 'champ': 'Fiddlesticks',
         'bullets': ['Fiddlesticks vu au top ? Au mid, joue vers le bas de la lane.', 'Fiddlesticks côté jungle bot ? Joue vers le haut.',
                     'Deux menaces des deux côtés ? Recule, ou bait et donne le call.']},
        {'k': 'big', 'lvl': lv(3, 'Le placement'), 'text': 'Trop loin : zéro dégât. Trop près : mort.',
         'sub': 'Le placement, c’est ce qui rend l’ADC difficile : à la limite, en regardant les menaces.'},
        {'k': 'quiz', 'lvl': lv(3, 'Le placement'), 'q': 'Fiddlesticks a été vu au top. Tu es au mid. Tu joues…',
         'choices': ['Vers le haut de la lane', 'Vers le bas de la lane', 'Au milieu, sans changer'], 'ans': 1,
         'why': 'Tu restes au mid, mais tu joues loin du côté où il peut arriver.'},
        no_facecheck(3, 'adc'),
        objectif_pos(3),
        farm_tour(4),
        {'k': 'text', 'lvl': lv(4, 'Le farm'), 'title': 'Lane ratée ? Pas grave',
         'bullets': ['Pas une bonne phase de lane ? Rattrape-toi en farm.', 'Ne reste pas bloqué.',
                     'Pas matrixé par les CS : en teamfight, on a besoin de toi, tu es le DPS.']},
        *trades(5, bot=True),
        wave_intro(6),
        *wave_cards(6, adc=True),
        *bot_types(7),
        bot_lane_rules(7),
        recall(8),
        {'k': 'quiz', 'lvl': lv(8, 'Le back et le mid game'), 'q': 'Tu veux back. Tu fais quoi de ta wave ?',
         'choices': ['Tu la laisses', 'Tu la crash, sur une wave canon si possible', 'Tu la freezes'], 'ans': 1,
         'why': 'Toujours crash la wave avant de back. Fast push seulement si tu peux la crash, sinon back instant.'},
        midgame(8, 'adc'),
        fog(8),
        reponse(8),
        check_fight(9),
        front_to_back(9),
        {'k': 'text', 'lvl': lv(9, 'Les fights'), 'title': 'Le call vient de toi',
         'bullets': ['Si possible, c’est l’ADC qui call l’engage.', 'Aller au mid, prendre les objectifs, contrôler le centre de la carte.',
                     'Ne push jamais seul : toujours avec un shadow.']},
        *mindset(10),
        *entrainement(10, 'adc'),
        final('Boss final : ta checklist', ['Je farme : 7 CS par minute', 'Je repère les menaces avant d’avancer',
               'Je ne face check jamais', 'Je check les R et les flashs avant chaque fight', 'Ma wave a toujours un but'], 'ADC FIRE'),
    ])

# ---------- TOP ----------
TOP = dict(
    id='top', cat='TOP LANE', ico='🛡️', pseudo='lebrésilien', role='Top',
    titre='Le carnet du top', resume='Les notes du coach pour lebrésilien : les vagues, les trades, le farm et le mental, en mode quête.',
    slides=[
        {'k': 'cover', 'title': 'Le carnet du top', 'who': 'lebrésilien', 'sub': 'Ta quête en 8 niveaux, avec les notes du coach.'},
        {'k': 'quest', 'levels': ['Le rôle', 'Les vagues', 'Le farm', 'Les trades', 'Survivre', 'Le back et le mid game', 'Les fights', 'Le mental et l’entraînement']},
        {'k': 'text', 'lvl': lv(1, 'Le rôle'), 'title': 'Le top', 'lead': 'Tenir la lane du haut, souvent en 1 contre 1, et peser dans les fights.',
         'bullets': ['Ta prio compte aussi pour ton jungler : carapateur top = prio mid + prio top.', 'Tu scales avec l’XP.']},
        wave_intro(2),
        *wave_cards(2),
        farm_tour(3),
        objectif_cs(3),
        *trades(4),
        no_facecheck(5, 'top'),
        reponse(5),
        recall(6),
        midgame(6, 'top'),
        fog(6),
        check_fight(7),
        front_to_back(7),
        objectif_pos(7),
        *mindset(8),
        *entrainement(8, 'top'),
        final('Boss final : ta checklist', ['Ma wave a toujours un but', 'Je freeze devant ma tour quand il faut',
               'Je trade quand il va chercher un sbire', 'Je crash ma wave avant de back', 'Je check les R et les flashs avant chaque fight'], 'Top FIRE'),
    ])

# ---------- MID ----------
MID = dict(
    id='mid', cat='MID LANE', ico='✨', pseudo='xena', role='Mid',
    titre='Le carnet du mid', resume='Les notes du coach pour xena : les vagues, les trades, le farm et le mental, en mode quête.',
    slides=[
        {'k': 'cover', 'title': 'Le carnet du mid', 'who': 'xena', 'sub': 'Ta quête en 8 niveaux, avec les notes du coach.'},
        {'k': 'quest', 'levels': ['Le rôle', 'Les vagues', 'Le farm', 'Les trades', 'Survivre', 'Le back et le mid game', 'Les fights', 'Le mental et l’entraînement']},
        {'k': 'text', 'lvl': lv(1, 'Le rôle'), 'title': 'Le mid', 'lead': 'Tenir la lane du centre, et aider les autres lanes et ton jungler.',
         'bullets': ['Ta prio aide ton jungler : il pousse le carapateur vers toi pour que tu décales.',
                     'Vers 15 min, ton ADC peut venir au mid : c’est le swap lane.',
                     'Un objectif avec ton jungler ? Ton ADC peut prendre des camps.']},
        wave_intro(2),
        *wave_cards(2),
        farm_tour(3),
        objectif_cs(3),
        *trades(4),
        no_facecheck(5, 'mid'),
        reponse(5),
        recall(6),
        midgame(6, 'mid'),
        fog(6),
        check_fight(7),
        front_to_back(7),
        objectif_pos(7),
        *mindset(8),
        *entrainement(8, 'mid'),
        final('Boss final : ta checklist', ['Ma wave a toujours un but', 'Je décale vers mon jungler quand j’ai la prio',
               'Pas de face check en mage', 'Je crash ma wave avant de back', 'Je check les R et les flashs avant chaque fight'], 'Mid FIRE'),
    ])

# ---------- SUPPORT ----------
SUPPORT = dict(
    id='support', cat='SUPPORT', ico='💞', pseudo='TheM3talDrakonar', role='Support',
    titre='Le carnet du support', resume='Les notes du coach pour TheM3talDrakonar : protéger ton ADC, la botlane, les trades et le mental, en mode quête.',
    slides=[
        {'k': 'cover', 'title': 'Le carnet du support', 'who': 'TheM3talDrakonar', 'sub': 'Ta quête en 8 niveaux, avec les notes du coach.'},
        {'k': 'quest', 'levels': ['Le rôle', 'La botlane', 'Les trades', 'Les vagues, vite fait', 'Survivre', 'Le back et la vision', 'Les fights', 'Le mental et l’entraînement']},
        {'k': 'text', 'lvl': lv(1, 'Le rôle'), 'title': 'Le support', 'lead': 'Aider ton ADC en lane, et le protéger en teamfight.',
         'bullets': ['Ton ADC est la petite princesse : faible, on la protège.', 'Freeze agressif : tu zones la botlane adverse pendant que ton ADC farme.']},
        *bot_types(2),
        bot_lane_rules(2),
        *trades(3, bot=True),
        wave_short(4),
        {'k': 'text', 'lvl': lv(4, 'Les vagues, vite fait'), 'title': 'Ce qui te concerne',
         'bullets': ['Freeze agressif : c’est toi qui zones, en restant avec ton ADC s’il y a un engage.',
                     'Slow push : dive avec ton ADC, l’adversaire perd XP et golds.',
                     'Fast push seulement si on peut crash la wave. Sinon : back instant.']},
        no_facecheck(5, 'support'),
        reponse(5),
        {'k': 'text', 'lvl': lv(6, 'Le back et la vision'), 'title': 'Les timings de wave canon',
         'bullets': ['Crash la wave avant de back, sur une wave canon si possible.', 'Timing de wave canon : va ward, aide un objectif.',
                     'Un gros composant à acheter ? Ne reste pas avec tes golds.']},
        fog(6),
        check_fight(7),
        front_to_back(7),
        objectif_pos(7),
        *mindset(8),
        *entrainement(8, 'support'),
        final('Boss final : ta checklist', ['Je protège mon ADC en lane et en fight', 'Je reconnais le type de botlane',
               'Je check les R et les flashs avant chaque fight', 'Je profite des waves canon pour ward', 'Je donne les infos à l’équipe'], 'Support FIRE'),
    ])

DECKS = {'jungle': JUNGLE, 'adc': ADC, 'top': TOP, 'mid': MID, 'support': SUPPORT}
