"""Contenu des carnets : uniquement les notes du coach (et ses captures). Chaque bloc renvoie une liste de slides."""

B = '<b style="color:#ffb347">'
b_ = '</b>'


def bold(t):
    return f'{B}{t}{b_}'


# ---------------------------------------------------------------- Rôles
ROLES = {
 'jungle': ("Farmer et ganker", f"Tu fais tes camps et tu {bold('ganks les lanes')}. C'est toi qui donnes le rythme.",
            ['🌲 4 camps + Red + Blue', '🦀 + le Carapateur (à personne)', '⚔️ Smite']),
 'adc': ("La petite princesse", f"Tu dois {bold('mettre des dégâts constants en teamfight')} en restant en vie. "
         "Tu es fragile : l'équipe te protège en fight, ton support t'aide en lane, toi tu farmes.",
         ['💰 Tu scales avec les golds', '🛡️ À protéger', '🎯 Dégâts constants']),
 'top': ("Seul sur ta lane", f"Tu tiens la lane du haut, {bold('souvent en 1 contre 1')}, et tu pèses dans les fights de l'équipe.",
         ['🗻 Lane longue', '📈 Tu scales avec l’XP', '⚔️ 1 contre 1']),
 'mid': ("Au centre de tout", f"Tu tiens la lane du milieu et tu {bold('aides ton jungler et les autres lanes')}.",
         ['✨ Lane courte', '📈 Tu scales avec l’XP', '🧭 Au centre de la carte']),
 'support': ("Le garde du corps", f"Tu {bold('aides ton ADC en lane')} et tu {bold('le protèges en teamfight')}.",
             ['🛡️ Protège l’ADC', '👁️ Vision', '🤝 Duo bot']),
}


def role(lane, niv, champ=None):
    t, p, c = ROLES[lane]
    return [dict(kind='std', niv=niv, champ=champ, kick='Le rôle', title=t, para=p, chips=c)]


# ---------------------------------------------------------------- Vagues (laners : détaillé)
def waves_full(lane, niv):
    adc = lane == 'adc'
    s = []
    s.append(dict(kind='std', niv=niv, kick='Les vagues · le principe', title='La wave est un outil',
        bullets=[f"Le bon outil au bon moment : {bold('on n’enfonce pas un clou avec une scie')}.",
                 f"Deux groupes de sbires s'affrontent : {bold('le plus nombreux gagne et pousse')}.",
                 "Comme un fight à 10 contre 10 : un mort, c'est 10 contre 9… puis 8 contre 6.",
                 f"Chaque gestion de wave a {bold('un but')} : dive, reset, objectif. Sinon, ça ne sert à rien.",
                 "Plus la game avance, plus les sbires sont forts (comme les camps de jungle)."]))
    fz = ["Tu farmes en sécurité près de ta tour."]
    if adc:
        fz.append("Freeze agressif : ton support zone la bot adverse pendant que tu farmes.")
    s.append(dict(kind='wave', niv=niv, term='Le freeze', emo='🧊', color='#5aa9ff',
        defn="La wave ne bouge plus.",
        forces=fz + ["Freeze défensif : quand tu es en retard ou que le jungler adverse rôde."],
        faibl=["Tu perds la prio.", "Mal tenu : la wave bounce."]))
    s.append(dict(kind='std', niv=niv, kick='Le freeze', title='Comment freeze devant la tour ?',
        bigs=[('3 casters full PV', 'à laisser vivre en face'), ('3 casters + 1 mêlée', 'quand c’est une wave canon')],
        bullets=["Tu last hit seulement : la wave reste devant ta tour.",
                 "Si tu en tues trop, elle pousse ou elle bounce."]))
    av = [f"{bold('Au mid game')} : rends-toi disponible sur la carte, push plutôt.",
          f"{bold('Pas de wave ?')} Ne force pas : laisse-la crash et farme sous ta tour."]
    if adc:
        av.append(f"{bold('Tristana')} freeze très mal. Contre une {bold('Sivir')}, c'est dur de freeze.")
    s.append(dict(kind='std', niv=niv, kick='Le freeze', title='Quand éviter de freeze ?', bullets=av))
    dive = 'avec ton support ou ton jungler' if adc else 'avec ton jungler'
    s.append(dict(kind='wave', niv=niv, term='Le slow push', emo='🐢', color='#5fd39a',
        defn="Tu amènes la wave lentement : elle grossit.",
        forces=[f"{bold('Reset')} : slow push la 1re, stack la 2e, fast push la 3e, puis back.",
                f"{bold('Dive')} {dive} : il perd beaucoup d'XP et de golds.",
                "Il casse ton slow push ? Sois agressif : tu as plus de sbires, tu gagnes les longs fights."],
        faibl=["Ta wave est loin de ta tour : attention aux ganks.", "Reste près de tes sbires pour qu'ils t'aident."]))
    s.append(dict(kind='wave', niv=niv, term='Le fast push', emo='⚡', color='#ffb347',
        defn="Tu pousses la wave le plus vite possible.",
        forces=[f"{bold('SEULEMENT si tu peux crash la wave')}.", "Sinon : back direct pour acheter tes objets.",
                "Finit un slow push pour reset."],
        faibl=["Crash au mauvais moment : la wave bounce vers toi… puis repart."]))
    s.append(dict(kind='wave', niv=niv, term='Le bounce', emo='↩️', color='#b48cff',
        defn="La wave crash puis revient naturellement de l'autre côté.",
        forces=["Ils ont crash la wave sous ta tour ? Il y a un bounce : la suivante repart vers eux.",
                "Les sbires se regroupent et tapent ensemble, comme une seule personne : deux casters sur le même mêlée."],
        faibl=[f"{bold('Le niveau 3 et demi')} : tu as trop crash, la wave revient, il prend l'XP vite pendant que tu es sous ta tour."]))
    s.append(dict(kind='wave', niv=niv, term='Le reset', emo='🔄', color='#ff6b6b',
        defn="Tu annules tout : la wave revient au milieu.",
        forces=["Il a pris sa wave, il reste 2 sbires, la suivante n'est pas arrivée.",
                "Tu prends les 2 derniers et tu back en même temps que lui."],
        faibl=["Il faut le bon timing : avant que la wave suivante arrive."]))
    s.append(dict(kind='quiz', niv=niv, q="Tu as mieux farmé, mais il passe niveau 3 avant toi. Pourquoi ?",
        ch=["Il a eu de la chance", "Ta wave a bounce : tu l'avais trop crash", "Il a pris un camp de jungle"], good=1,
        why="Le bounce : ses sbires et sa wave tuent vite, il prend l'XP pendant que toi tu es encore sous ta tour."))
    return s


def waves_short(lane, niv):
    extra = ("Une lane qui freeze devant sa tour : le gank est possible." if lane == 'jungle'
             else "Freeze agressif : c'est toi qui zones la bot adverse pendant que ton ADC farme.")
    return [dict(kind='std', niv=niv, kick='Les vagues · vite fait', title='Les 5 mots des vagues',
        bullets=[('🧊', f"{bold('Freeze')} : la wave ne bouge plus, près d'une tour."),
                 ('🐢', f"{bold('Slow push')} : la wave avance lentement et grossit (pour dive ou reset)."),
                 ('⚡', f"{bold('Fast push')} : on pousse vite, seulement si on peut crash."),
                 ('↩️', f"{bold('Bounce')} : la wave crash puis revient de l'autre côté."),
                 ('🔄', f"{bold('Reset')} : on annule tout, la wave revient au milieu."),
                 ('💡', extra)], size=36)]


# ---------------------------------------------------------------- Farm et trading
def farm_tour(niv):
    return [dict(kind='std', niv=niv, kick='Le farm', title='Farmer sous ta tour',
        bullets=[f"La tour tape d'abord {bold('le canon')}, ou le premier sbire qu'elle voit.",
                 "Un ennemi te tape ? Elle change de cible et tape l'ennemi.",
                 f"Caster : {bold('une auto, un coup de tour, une auto')}.",
                 "Avec plus d'AD, une seule auto suffit : tu l'apprends en jouant ton champion.",
                 "Un sbire entamé arrive sous ta tour ? Prépare-le pour le last hit, en restant safe.",
                 f"{bold('Utilise tes sorts pour farmer')}."], size=35)]


def trading(lane, niv):
    s = [dict(kind='std', niv=niv, kick='Le trading', title='Taper en farmant',
        bullets=["Mets des dégâts sans rater tes sbires.",
                 f"C'est un {bold('jeu d’échange')} : quand il farme, tu tapes. Quand tu farmes, il peut taper.",
                 "Identifie ses sorts les plus dangereux. Punis ses erreurs.",
                 f"Trade gagnant ? {bold('Ne prends pas la confiance')} : ne ruine pas ta lane en le poursuivant.",
                 f"{bold('Il y a toujours une réponse')} : après votre play, ils jouent ailleurs (gank plus tard, à l'opposé, des camps)."]),
         dict(kind='cards', niv=niv, kick='Le trading', title='Ce qui décide un échange', cols=3,
        cards=[('⚡ Court trade', '#ffb347', ["Tu tapes vite et tu recules avant sa réponse."]),
               ('🗡️ Long trade', '#ff6b6b', ["Tu restes dans l'échange : plus de sbires et de PV, tu gagnes."]),
               ('🔮 Les runes', '#b48cff', ["Ta rune te dit si tu joues court ou long."]),
               ('🎯 Punir les last hits', '#5fd39a', ["Il va chercher un sbire : c'est le moment de taper."]),
               ('🌊 L’état de la wave', '#5aa9ff', ["Plus de sbires de ton côté : l'échange est pour toi."]),
               ('⏱️ Les cooldowns', '#d4ab4f', ["Son sort dangereux est lancé ? Fenêtre pour trade."])],
        foot="Les trading patterns : repère quand et comment il attaque, et réponds.")]
    if lane in ('adc', 'support'):
        s.append(dict(kind='std', niv=niv, kick='Le trading', title='Les petits plus de la bot',
            bullets=[f"{bold('Toujours contester le niveau 2')} si possible.",
                     "Respecte le timing de ton jungler, en général pendant le carapateur ou avant.",
                     "Bot all-in contre bot poke au niveau 1 : garde tes PV, sinon tu ne pourras plus all-in."]))
    return s


def cs_defi(lane, niv):
    return [dict(kind='defi', niv=niv, title='Le défi CS',
        big='7 CS / min', sub='à 10 min · et encore à 20 min = 140 CS',
        items=["Un objectif à chaque game, et toujours s'améliorer",
               "Objectif tenu (7-8 CS/min) ? Passe au suivant : les teamfights…",
               "Lane ratée ? Pas grave : tu te rattrapes en farm",
               "Mais pas matrixé par les CS : en fight, on a besoin de toi"])]


# ---------------------------------------------------------------- Back, mid game, fog
def back_mid(lane, niv):
    s = [dict(kind='std', niv=niv, kick='Le back', title='Back au bon moment',
        bullets=[f"{bold('Toujours crash ta wave')} avant de back.",
                 f"Back {bold('sur une wave canon')} si possible.",
                 "Timing de wave canon : va ward, aide un objectif.",
                 f"Un gros composant ou un objet à acheter ? {bold('Ne reste pas avec tes golds')}."]),
         dict(kind='std', niv=niv, kick='Le mid game', title='Push mid, puis fight',
        bullets=["Évite de freeze : rends-toi disponible sur la carte.",
                 f"{bold('Ne va jamais chercher une wave seul')} : fais-toi shadow, et dis-le.",
                 "Pas de shadow ? Attends la wave en sécurité. À 5 pour une wave, c'est bien aussi.",
                 "Ton jungler est à l'opposé, ou fait un objectif ? Prends des camps (demande-lui).",
                 f"{bold('Le fog')} : ne donne pas d'infos (où tu es, tes objets). Ils te croient à 1 objet, tu en as 2."])]
    if lane in ('adc', 'mid'):
        who = ("Toi tu viens au mid, ton mid va bot." if lane == 'adc' else "Ton ADC vient au mid, toi tu vas bot.")
        s.append(dict(kind='std', niv=niv, kick='Le swap lane', title='Le swap mid / bot',
            bullets=[f"Vers {bold('15 min')}, quand la première tour tombe, ou pour contester le Héraut.",
                     who,
                     "Pourquoi le mid : lane courte, l'ADC fragile y est plus safe que sur une lane longue.",
                     f"{bold('Casse le rythme')} : swap aussi à d'autres moments pour surprendre."]))
    return s


# ---------------------------------------------------------------- Fights
def fights(lane, niv):
    sq = {'adc': "Surtout l'ADC : mourir au début du fight, c'est catastrophique.",
          'support': "Tu joues Nautilus ? Tu peux face check. Vel'Koz ? Reste derrière.",
          'mid': "Un mage ou un pick comme TF : jamais de face check.",
          'top': "Tank ? Tu peux face check. Pas tank ? Laisse les tanks passer devant.",
          'jungle': "Tank ? Tu peux face check. Squishy ? Reste derrière."}[lane]
    s = [dict(kind='std', niv=niv, kick='Le placement', title='Jamais de face check',
        bullets=["Pas d'info ? Doute de tout : « où sont-ils ? Je ne vois personne, je fais attention. »",
                 f"{bold('Les tanks avancent et checkent')}, les plus squishy restent derrière.",
                 sq,
                 "Sous une R de zone, ne te regroupe jamais.",
                 f"{bold('Rapproche-toi de tes alliés')} : kite vers eux, bait vers eux."]),
         dict(kind='defi', niv=niv, title='Avant chaque fight', big='Le check', sub='R et flash, chez nous et chez eux',
        items=["Mes R et mes flashs, et ceux de mes alliés", "Leurs R et leurs flashs",
               "Sans R ou sans flash : je joue safe et je le call",
               "Un ennemi sans flash ? On joue sur lui", "Ma team prend un fight : est-ce un bon fight ?"]),
         dict(kind='std', niv=niv, kick='Le teamfight', title='Jouer front to back',
        bullets=[f"Tape {bold('ce que tu vois')}, pas l'ADC au fond.",
                 "Pas de tunnel vision : s'il est trop loin, il ne fait pas de dégâts, laisse-le.",
                 "Envoie tes sorts, recule un peu pour les récupérer, puis reviens.",
                 "Un objectif commence ? Anticipe qu'ils arrivent : ils viennent par le haut, place-toi à l'opposé."])]
    return s


# ---------------------------------------------------------------- Mindset
def mindset(lane, niv, jungle=False):
    s = [dict(kind='cards', niv=niv, kick='Le mindset', title='Solo queue et équipe : complémentaires', cols=2,
        cards=[('🎧 La solo queue construit ta base', '#5aa9ff', [
                    "Ton champion, tes matchups, tes mécaniques, ton farm, tes trades, tes décisions.",
                    "Concentre-toi sur ton jeu : tes erreurs, tes placements, c'est ça qui compte.",
                    "« Comment je gagne cette game ? » avant, pendant la draft, pendant la game.",
                    "Ce que tu apprends en solo queue sert directement en équipe."]),
               ('🔥 L’équipe t’apprend à l’utiliser à plusieurs', '#ffb347', [
                    "Coordination, préparation, plan collectif, rotations organisées.",
                    "Call : « pas de flash », « pas de R », « je ne veux pas fight ».",
                    "Donne les infos : « je sens le danger », « ils veulent m'engage ». Chacun fait ce travail.",
                    "Un bon niveau solo ne garantit pas un bon niveau en équipe : ça s'apprend aussi."])],
        foot="La solo queue construit une base individuelle solide. Le jeu en équipe apprend à l'utiliser collectivement."),
         dict(kind='std', niv=niv, kick='Le mental', title='Tu ne contrôles que toi',
        bullets=["Tes alliés, ta team : tu ne les contrôles pas.",
                 "Même s'il se passe des dingueries : reste positif. Ton moment de gloire va arriver.",
                 f"{bold('Crée-toi des scénarios')} : « s'il y a leur jungler, j'ai mon flash ? Non : je garde la wave de mon côté. »",
                 "Tu l'as imaginé avant ? Tu n'es pas surpris, tu sais quoi répondre.",
                 "Pense aussi comme l'ennemi : nos conseils valent pour lui."])]
    if jungle:
        s.append(dict(kind='std', niv=niv, kick='En équipe', title='Laisse les ressources',
            bullets=["À un moment de la game, laisse les camps aux laners : ils doivent scale.",
                     "Sauf si ton jungler scale très fort : ça dépend.",
                     "Un laner a besoin d'un objet ? Laisse-lui le camp.",
                     "C'est un peu triste… mais tu as fait ton taf."]))
    return s


def training(lane, niv):
    what = {'jungle': 'ton clear de jungle', 'support': 'poser tes wards avec tes sorts'}.get(lane, 'ton farm')
    return [dict(kind='defi', niv=niv, title='Avant la game', big='Échauffement', sub='5 à 10 min, selon ton temps',
        items=[f"Outil d'entraînement : {what}",
               "Shadow laning : imagine ta lane de A à Z, comme le shadow boxing",
               "Ça marche aussi pour le roam : « jouer sans jouer »",
               "Un objectif pour la game (par exemple : tes CS)"])]


# ================================================================ Notions communes à tous les rôles (prompt TOPLANE)
EX = {  # exemples adaptés à chaque rôle
 'top': dict(trade="Il s'avance pour last hit : tu le punis avec ton combo.", combo='Renekton',
             cover="Tu veux crash ta wave et back : ton jungler reste à côté pour couvrir.",
             tempo="Waves, back, TP et side lane.", vision="La ward de rivière top et le tri-buisson."),
 'mid': dict(trade="Il avance pour un caster : ton sort de poke le touche avant qu'il recule.", combo='Syndra',
             cover="Tu veux roam : ton jungler couvre ta wave ou t'accompagne.",
             tempo="Prio, roams et rotations.", vision="Les deux côtés de la rivière : tu es au centre."),
 'adc': dict(trade="Son ADC va chercher un sbire : toi et ton support le punissez.", combo='Caitlyn',
             cover="Tu veux back avec une wave crash : ton jungler couvre le bot.",
             tempo="Ressources, backs et swaps de lanes.", vision="Le tri-buisson et la rivière bot."),
 'support': dict(trade="Leur ADC va last hit : tu le zones ou tu l'engages.", combo='Nautilus',
             cover="Tu roam au mid : ton ADC reste en sécurité, ton jungler couvre le bot.",
             tempo="Vision, roams et objectifs.", vision="Les entrées de jungle et la rivière avant un objectif."),
 'jungle': dict(trade="Un laner adverse s'avance trop : c'est une fenêtre de gank.", combo='Lee Sin',
             cover="Tu restes près d'une lane pour couvrir son crash, sans forcément chercher un kill.",
             tempo="Camps, déplacements et objectifs.", vision="Les entrées de ta jungle et celles de l'adversaire."),
}


def patterns(lane, niv):
    e = EX[lane]
    return [dict(kind='cards', niv=niv, kick='Les patterns', title='À quel moment j’utilise mon combo, et pourquoi ?', cols=3, champ=e['combo'],
        cards=[('⚡ Trade court', '#ffb347', ["Un ou deux sorts, puis tu recules.", "Tu gardes une menace pour la suite."]),
               ('🗡️ Trade prolongé', '#ff6b6b', ["Tu restes dans l'échange.", "Il faut plus de sbires et plus de PV."]),
               ('💥 All-in', '#b48cff', ["Tout ton combo pour le kill.", "Seulement si les infos disent que ça passe."]),
               ('🔍 Un sort, puis observer', '#5aa9ff', ["Commence par un sort, regarde sa réponse, puis décide."]),
               ('🛡️ Le sort gardé', '#5fd39a', ["Garder un sort important pour répondre ou menacer."]),
               ('⏱️ La fenêtre de faiblesse', '#d4ab4f', ["Ses sorts sont lancés : il est vulnérable quelques secondes."])],
        foot=e['trade'])]


def deny(lane, niv):
    s = [dict(kind='cards', niv=niv, kick='Gold et expérience', title='Priver l’adversaire de ressources', cols=2,
        cards=[('💰 Empêcher le last hit', '#ffb347', ["Il perd le gold du sbire.",
                                                     "Mais s'il est assez proche, il prend quand même l'XP."]),
               ('📈 Empêcher l’accès à l’XP', '#5aa9ff', ["Il doit rester trop loin pour recevoir l'XP du sbire.",
                                                        "Ça peut créer un très gros avantage, surtout au top (duels, niveaux)."])],
        foot="Ne t'expose pas pour autant : ne perds pas tes propres ressources, et pense au jungler adverse."),
         dict(kind='std', niv=niv, kick='Gold ou XP ?', title='Le meilleur compromis',
        bullets=["Parfois, il vaut mieux garder l'XP et renoncer à quelques last hits, plutôt que perdre les deux.",
                 f"Dans l'ordre : {bold('ta survie')}, ton XP, ton gold, la position de la wave, les risques.",
                 "Le gold reste important : ne le néglige jamais.",
                 f"{bold('Cherche le meilleur compromis')} selon la situation."]
                + (["Au bot, le support peut zoner pendant que l'ADC prend les ressources."] if lane in ('adc', 'support') else [])
                + (["Au mid, les roams et les déplacements rendent le zoning plus difficile à tenir."] if lane == 'mid' else []))]
    if lane in ('top', 'mid', 'adc'):
        s.append(dict(kind='std', niv=niv, kick='Le repère du coach', title='15 CS, c’est (à peu près) un kill',
            bigs=[('15 CS', '≈ 250 à 300 golds selon les sbires'), ('1 kill', '≈ 300 golds, + la pression')],
            bullets=["C'est un ordre de grandeur, pas une égalité exacte : ça dépend des sbires, des canons et du moment.",
                     "Un kill apporte aussi de la pression et fait perdre des ressources à l'adversaire.",
                     f"Le message : {bold('tu peux gagner ta lane sans tuer ton adversaire')}."]))
    return s


def after_kill(lane, niv):
    return [dict(kind='std', niv=niv, kick='Après un kill', title='Deux questions, tout de suite',
        bigs=[('1', 'Qu’est-ce que je fais avec ma wave ?'), ('2', 'Où est le jungler adverse ?')],
        bullets=["Pousser, crash, garder la wave, la laisser évoluer, back, prendre plus de ressources, demander de l'aide.",
                 "Ça dépend : position et taille de la wave, tes PV, son temps de retour, le jungler, le risque de perdre des waves.",
                 f"{bold('Prépare tes options avant')} que la situation arrive : tu décides vite."],
        size=32),
         dict(kind='quiz', niv=niv, q="Tu viens de le tuer, ta wave est grosse et avance. Le jungler adverse a été vu de l'autre côté. Tu fais quoi ?",
        ch=["Je back tout de suite", "Je crash la wave sous sa tour, puis je back", "Je reste à côté de sa tour sans rien faire"], good=1,
        why="Il est mort et son jungler est loin : crash la wave fait perdre de l'XP et des golds à l'adversaire, puis tu back tranquille.")]


def tracking(lane, niv):
    side = {'top': 'au top', 'mid': 'au mid', 'adc': 'au bot', 'support': 'au bot', 'jungle': 'dans ta jungle'}[lane]
    s = [dict(kind='std', niv=niv, kick='Le jungle tracking', title='Où est son jungler ?',
        bullets=["Où a-t-il commencé ? Quels mouvements sont possibles ? De quel côté est-il sûrement ?",
                 f"Quand peut-il arriver {side} ? Ce qui a été vu, et ce qui reste inconnu.",
                 "Risque de gank ? Adapte ton placement, pose une ward, baisse ton agressivité, demande une couverture, prépare un crash.",
                 f"{bold('Une position supposée n’est pas une certitude')}."]
                + (["Toi, tu connais tout le pathing : les laners, eux, ont besoin des infos utiles pour leur lane."] if lane == 'jungle' else []),
        size=33),
         dict(kind='map', niv=niv, kick='Le jungle tracking', title='Vu, supposé, dangereux',
        maps=[dict(marks=[(80, 30, '👁️', 'vu à 1:30', '#5aa9ff'), (60, 22, '❔', 'peut-être ici', '#d4ab4f'),
                          (22, 22, '⚠️', 'zone à risque', '#ff6b6b')],
                   arrows=[(78, 34, 62, 26, '#d4ab4f', True), (58, 24, 28, 24, '#ff6b6b', True)])],
        bullets=["👁️ Ce qui a été vu : une certitude, mais à un instant.",
                 "❔ Ce qu'on suppose : des chemins possibles.",
                 "⚠️ Les zones dangereuses : là où il peut arriver.",
                 "Le tracking sert à mieux décider, pas à deviner exactement."], size=28)]
    return s


def vision(lane, niv):
    e = EX[lane]
    return [dict(kind='std', niv=niv, kick='La vision', title='Lire la vision, pas seulement poser des wards',
        bullets=["Les wards alliées, les wards adverses connues, les zones surveillées, les zones sans vision.",
                 f"{bold('Tu veux flank ?')} Pense à leurs wards : s'ils t'ont vu arriver, la surprise disparaît.",
                 "Ne révèle pas tes intentions pour rien : utilise le fog of war.",
                 f"Chez toi : {e['vision']}"], size=34)]


def sides(lane, niv):
    sp = {'top': "Weakside au top : absorbe la pression, garde ton XP, ne meurs pas pour rien.",
          'mid': "Le mid est rarement oublié, mais il peut jouer weakside pour libérer le jungler ailleurs.",
          'adc': "Weakside au bot : farme en sécurité, garde tes PV et ton XP, tu scales.",
          'support': "Weakside au bot : protège ton ADC, ward, et donne les infos.",
          'jungle': "C'est souvent toi qui décides où vont les ressources : explique-le à tes laners."}[lane]
    return [dict(kind='cards', niv=niv, kick='Weakside et strongside', title='Où l’équipe met ses ressources', cols=2,
        cards=[('💪 Strongside', '#ffb347', ["L'équipe y met plus de ressources, de présence, d'aide.",
                                            "Selon : plan de jeu, draft, pathing, matchups, objectifs, dives.",
                                            "Strongside ne veut pas dire gagner automatiquement."]),
               ('🛡️ Weakside', '#5aa9ff', ["Moins d'aide : joue plus prudent, limite tes pertes, garde ton XP.",
                                         "Évite les morts inutiles, accepte certains désavantages, communique.",
                                         "Weakside ne veut pas dire abandonné, ni forcément plus de ganks."])],
        foot=sp),
         dict(kind='map', niv=niv, kick='Weakside et strongside', title='Deux plans de jeu possibles',
        maps=[dict(title='Plan bot', marks=[(18, 82, '🌲', 'jungler', '#5fd39a'), (82, 88, '💪', 'strongside', '#ffb347'), (9, 18, '🛡️', 'weakside', '#5aa9ff')],
                   arrows=[(22, 80, 70, 86, '#5fd39a', True)]),
              dict(title='Plan top', marks=[(18, 30, '🌲', 'jungler', '#5fd39a'), (12, 12, '💪', 'strongside', '#ffb347'), (88, 90, '🛡️', 'weakside', '#5aa9ff')],
                   arrows=[(20, 34, 12, 20, '#5fd39a', True)])],
        foot="En équipe : dites quelle lane reçoit les ressources, pourquoi, et quoi faire si le plan ne marche pas.")]


def cover(lane, niv):
    e = EX[lane]
    return [dict(kind='cards', niv=niv, kick='Le jungler n’est pas là que pour tuer', title='Gank, cover, countergank, aide au crash', cols=2,
        cards=[('⚔️ Gank', '#ff6b6b', ["Le jungler vient pour tuer ou faire flash."]),
               ('🛡️ Cover', '#5aa9ff', ["Il reste à côté pour sécuriser ton action.", e['cover']]),
               ('🔁 Countergank', '#b48cff', ["Il anticipe un gank adverse et se place pour y répondre."]),
               ('🌊 Aide au crash', '#5fd39a', ["Il t'aide à pousser ta wave pour débloquer la situation et back."])],
        foot="« On n'est pas obligé d'appeler le jungler uniquement pour obtenir un gank. »")]


def tempo(lane, niv):
    e = EX[lane]
    return [dict(kind='std', niv=niv, kick='La tempo', title='La tempo, c’est quoi ?',
        para="Les moments où toi ou ton équipe pouvez agir, bouger ou préparer une action dans de bonnes conditions, "
             "selon vos ressources, vos waves, vos positions et ce que peut faire l'adversaire.",
        bullets=["Back au bon moment, revenir avant l'adversaire, poser la vision, aider le jungler, préparer un objectif, prendre une tour.",
                 "Les cooldowns (R, flash) comptent, mais ils ne font pas toute la tempo.",
                 f"Pour toi : {e['tempo']}"], size=32),
         dict(kind='path', niv=niv, kick='La tempo', title='Une bonne wave crée du temps',
        steps=['🌊 Wave', '💥 Crash', '🏠 Back ou déplacement', '🎯 Action', '🔁 Retour sur la carte'],
        bullets=["Tu crash : la wave pousse chez eux, tu as du temps pour faire autre chose.",
                 "Tu ne crash pas : tu perds des sbires dès que tu pars.",
                 f"{bold('Compare toujours')} ce que rapporte le déplacement et ce qu'il te coûte."]),
         dict(kind='cards', niv=niv, kick='La tempo', title='Ta fenêtre, ou la leur ?', cols=2,
        cards=[('🔥 Votre fenêtre', '#ffb347', ["Vous avez vos R, vos flashs, vos PV, des waves qui poussent.",
                                              "C'est le moment de préparer ou de lancer une action."]),
               ('🧊 Leur fenêtre', '#5aa9ff', ["Vous venez de tout utiliser, vous devez back.",
                                             "L'initiative peut passer chez eux : ralentissez, évitez l'engage."])],
        foot="Ce n'est jamais automatique : ça dépend aussi des waves, des objectifs, des champions et des infos."),
         dict(kind='std', niv=niv, kick='La tempo', title='Punir une erreur de tempo',
        bullets=["Une équipe a tout utilisé et continue d'avancer sans les moyens de se battre : c'est le moment de la punir.",
                 "À l'inverse, une équipe en avance garde sa capacité à engager : respecte-la.",
                 f"Le but n'est pas de fight {bold('à chaque R adverse indisponible')}, mais de reconnaître les vraies bonnes occasions."])]


def intentions(lane, niv):
    return [dict(kind='cards', niv=niv, kick='Dans la tête de l’adversaire', title='« Il faut être dans la tête de son adversaire »', cols=2,
        cards=[('🔎 Lire ses intentions', '#5aa9ff', ["Quel est son objectif ? Quelle wave veut-il ?",
                                                     "Pourquoi avance-t-il, pourquoi recule-t-il ?",
                                                     "Cherche-t-il un trade ? Attend-il son jungler ?",
                                                     "Veut-il back, roam, ou te piéger ?"]),
               ('🎭 Ne pas être un livre ouvert', '#ffb347', ["Varie tes timings et tes positions.",
                                                            "Utilise le fog, garde des menaces crédibles.",
                                                            "Adapte tes trades, contrôle les infos que tu donnes.",
                                                            "Varier, oui, mais avec un plan logique, pas au hasard."])])]


def first_self(lane, niv):
    return [dict(kind='std', niv=niv, kick='Le mindset', title='D’abord ton propre jeu',
        bullets=["Comprendre ton champion, tes matchups, tes trades, ta wave, tes backs, tes erreurs.",
                 "Tes alliés te demandent beaucoup : ne sacrifie pas ta lane à chaque demande.",
                 f"{bold('Ne pas pouvoir aider à un moment')} ne veut pas dire mal jouer.",
                 "Mais ce n'est pas une excuse pour ignorer l'équipe : reconnais les actions vraiment utiles.",
                 "Le but : une bonne maîtrise perso, et une bonne disponibilité pour l'équipe."], size=34)]


def structures(lane, niv):
    return [dict(kind='std', niv=niv, kick='Les objectifs', title='« Les tours sont aussi des objectifs »',
        bullets=["League ne se résume pas aux dragons et au Baron : les tours et les inhibiteurs mènent au Nexus.",
                 "Un fight trop dangereux sur un objectif ? Prenez des ressources ou une tour ailleurs.",
                 f"Un échange n'est pas gratuit : {bold('compare ce que vous prenez et ce que vous laissez')}.",
                 "Toutes les tours ne valent pas plus que tous les objectifs : ça se décide à chaque fois."], size=34)]


# ---------------------------------------------------------------- Notions communes (prompt SUPPORT)
# Définitions identiques pour tous les rôles, exemples adaptés à chaque lane.
EX2 = {
 'top': dict(count="4 au bot et 1 au mid ? Ton jungler et toi pouvez jouer les grubs, une plaque ou un dive.",
             ward="La ward de rivière top et le tri-buisson : tu cherches le jungler qui vient sur toi.",
             anti="Wave poussée, jungler adverse pas vu depuis 40 s : il peut arriver par la rivière.",
             obj="Les grubs et le Héraut se jouent près de toi : ta wave et ta TP décident si tu peux venir.",
             tgt="Ton duel est gagné, mais traverser 3 champions pour leur ADC n'est pas une bonne idée."),
 'mid': dict(count="2 au top, 2 au bot, leur mid visible : tu sais qui peut venir t'aider ou te punir si tu roam.",
             ward="Les deux côtés de la rivière : tu cherches les ganks et les roams vers ta lane.",
             anti="Leur mid perd sa wave et disparaît : il roam peut-être. Ping et préviens.",
             obj="Ta prio au mid permet à ton jungler et à ton support d'arriver les premiers à l'objectif.",
             tgt="Ton combo sur la cible accessible vaut mieux qu'un sort lancé dans le vide sur leur ADC."),
 'adc': dict(count="Leur support et leur jungler disparaissent : le 2v2 devient un 2v3 possible.",
             ward="Le tri-buisson et la rivière bot : tu cherches le jungler et le roam de leur support.",
             anti="Leur support n'est plus visible et la wave pousse chez toi : recule avant de le voir arriver.",
             obj="Ta wave poussée et ton back au bon moment permettent d'être là au dragon.",
             tgt="Tape ce que tu peux taper en sécurité : la cible la plus proche est souvent la bonne."),
 'support': dict(count="Tu as souvent un peu plus de temps pour regarder la carte : compte, et partage.",
             ward="Les entrées de jungle et la rivière : tu prépares les déplacements et les objectifs.",
             anti="Leur jungler a été vu en haut : c'est peut-être le moment de pousser ou de poser une ward profonde.",
             obj="Tu prépares la vision et les accès, tu accompagnes ton jungler.",
             tgt="Ton engage sur la cible que l'équipe peut vraiment suivre."),
 'jungle': dict(count="Tu vois 4 adversaires au top : leur jungler est sûrement là, le dragon est peut-être libre.",
             ward="Les entrées de ta jungle, celles de la sienne : tu suis son pathing.",
             anti="Tu l'as vu au top à 3:20 : il peut être au carapateur bot vers 3:50.",
             obj="C'est souvent toi qui lances l'objectif : vérifie la prio de tes lanes avant.",
             tgt="Avant un objectif, leur jungler est souvent une bonne cible, s'il est attrapable."),
}


def counting(lane, niv):
    e = EX2[lane]
    return [dict(kind='map', niv=niv, kick='Compter les adversaires', title='Où sont les 5 ?',
        maps=[dict(title='2 top · 1 mid · 2 bot', marks=[(8, 10, '🔴', '', '#ff6b6b'), (17, 6, '🔴', '', '#ff6b6b'), (50, 50, '🔴', '', '#ff6b6b'),
                                                       (84, 92, '🔴', '', '#ff6b6b'), (93, 84, '🔴', '', '#ff6b6b')]),
              dict(title='4 top · 1 mid', marks=[(7, 8, '🔴', '', '#ff6b6b'), (16, 5, '🔴', '', '#ff6b6b'), (6, 19, '🔴', '', '#ff6b6b'),
                                               (19, 15, '🔴', '4 au top', '#ff6b6b'), (52, 48, '🔴', '1 au mid', '#ff6b6b'),
                                               (40, 64, '🔵', 'vous', '#5aa9ff')],
                   arrows=[(44, 60, 60, 66, '#5aa9ff', True)])],
        bullets=["Les 5 sont visibles : vous savez où ils sont, à cet instant.",
                 "4 au top, 1 au mid : à plusieurs au mid, vous avez le nombre, ou une autre action ailleurs.",
                 "Mais n'abandonnez pas vos alliés du top sans comparer : valeur de l'action, risque pour eux, temps, waves.",
                 e['count']], size=25, bw=600, msize=480),
         dict(kind='cards', niv=niv, kick='Compter les adversaires', title='Vu ou supposé ?', cols=2,
        cards=[('👁️ Vu', '#5aa9ff', ["Il est sur la carte, maintenant.", "C'est une certitude, mais seulement à cet instant."]),
               ('❔ Supposé', '#ffb347', ["Il a disparu : il n'est pas forcément là où tu penses.",
                                        "Raisonne avec ce que tu sais : dernière position, temps écoulé, chemins possibles."])],
        foot="Compter change tout : les trades, les ganks, les roams, les objectifs, les rotations, les fights, les actions cross-map.")]


def ward_why(lane, niv):
    e = EX2[lane]
    return [dict(kind='std', niv=niv, kick='La vision', title='« Pourquoi je pose cette ward ? »',
        bullets=["Une ward a un but : quelle information tu cherches, et ce que tu vas en faire.",
                 "Si l'adversaire peut la retirer tout de suite sans risque, demande-toi si l'emplacement est bon.",
                 "Pose-la hors de sa vue quand tu peux : s'il te voit la poser, il sait où elle est.",
                 "Une ward sacrifiée pour une info importante n'est pas une ward perdue.",
                 f"Chez toi : {e['ward']}"], size=32)]


def anticip_comms(lane, niv):
    e = EX2[lane]
    return [dict(kind='cards', niv=niv, kick='Anticiper et communiquer', title='Anticiper sans supposer', cols=2,
        cards=[('🔮 Anticiper', '#b48cff', ["Pense aux scénarios possibles : jungler, roams, countergank, réponses, objectifs.",
                                          "Tu ne connais pas sa décision : tu raisonnes avec les infos que tu as.",
                                          e['anti']]),
               ('📣 Communiquer', '#5fd39a', ["« Si tu vois quelque chose, les autres ne l'ont pas forcément vu. »",
                                            "Une info utile, simple, au bon moment : disparition, jungler vu, objectif, zone sans vision.",
                                            "En équipe : à la voix. En solo queue : des pings clairs, pas en boucle."])])]


def obj_prep(lane, niv):
    e = EX2[lane]
    return [dict(kind='std', niv=niv, kick='Les objectifs', title='Un objectif se prépare avant de le taper',
        bullets=["Achats faits, retour sur la carte, waves poussées, vision posée, vision adverse retirée, accès contrôlés.",
                 "L'équipe n'est pas obligée de le commencer tout de suite : mieux se placer, attendre une erreur, un catch.",
                 "Échanger ou abandonner un objectif peut aussi être la bonne décision.",
                 f"Ta part : {e['obj']}"], size=33)]


def targets(lane, niv):
    e = EX2[lane]
    return [dict(kind='cards', niv=niv, kick='Les cibles', title='Cible prioritaire, pas tunnel vision', cols=2,
        cards=[('🎯 Une priorité', '#ffb347', ["La meilleure cible : celle que l'équipe peut vraiment atteindre,",
                                             "et dont la mort apporte un vrai avantage, risques compris."]),
               ('🚫 La tunnel vision', '#ff6b6b', ["S'acharner sur une cible sans regarder la situation.",
                                                 "Traverser toute leur équipe pour leur ADC, tout lancer sur un tank."])],
        foot=e['tgt'] + " Identifier une priorité ne doit pas t'empêcher d'adapter ta décision.")]


def triangle(lane, niv):
    """Le positionnement en triangle : 2v2 au bot (ADC et SUPPORT)."""
    sup = lane == 'support'
    me, ally = ('🛡️', '🏹') if sup else ('🏹', '🛡️')
    return [dict(kind='lane', niv=niv, kick='Le triangle', title='Deux contre un, pendant un instant',
        minions=[(38, 5, '#5aa9ff'), (54, 5, '#ff6b6b')],
        champs=[(30, 'top', me, 'toi', '#5aa9ff'), (30, 'bot', ally, 'ton allié', '#5aa9ff'),
                (52, 'bot', '🎯', 'trop avancé', '#ff6b6b'), (88, 'top', '⚔️', 'son allié, loin', '#ff6b6b')],
        arrows=[(34, 26, 48, 76, '#ffb347'), (36, 84, 46, 84, '#ffb347')],
        bullets=["Un adversaire s'avance trop loin de son partenaire.",
                 "Vous pouvez l'atteindre à deux, son allié est trop loin pour réagir à temps : un triangle.",
                 "Trade, engage ou punition… mais pas automatiquement :",
                 "sorts, PV, portée, waves, dégâts, position du 2e adversaire, jungler, porte de sortie."], size=27),
         dict(kind='lane', niv=niv, kick='Le triangle', title='Pris en triangle, ou bait ?',
        bushes=[(30, True)],
        minions=[(40, 4, '#5aa9ff'), (56, 4, '#ff6b6b')],
        champs=[(52, 'mid', me, 'toi : avancé ?', '#5aa9ff'), (30, 'top', ally, 'allié caché', '#5aa9ff'),
                (70, 'top', '⚔️', 'eux', '#ff6b6b'), (70, 'bot', '⚔️', 'eux', '#ff6b6b')],
        arrows=[(66, 22, 57, 28, '#ff6b6b'), (34, 27, 47, 32, '#5fd39a')],
        bullets=["Défense : tu es avancé entre deux adversaires ? Reviens vers ton allié.",
                 "Se réaligner, ce n'est pas se coller : contre les sorts de zone, garde une distance qui permet l'entraide.",
                 f"{bold('Le bait')} : tu as l'air mal placé, ils engagent… et ton allié ou ton sort retourne la situation.",
                 "Le triangle : une opportunité, un danger, une situation à créer, ou un piège."], size=26,
        foot="Schéma simplifié. En teamfight aussi : un champion avancé entre plusieurs menaces est une cible.")]


def coop_adc(lane, niv):
    """Ce que l'ADC doit savoir du support (objet, canons, plaques, farm sous tour)."""
    return [dict(kind='cards', niv=niv, kick='ADC et support', title='Ce que ton support peut faire pour toi', cols=2,
        cards=[('🗺️ Son objet support', '#5fd39a', ["Il achève un sbire avec une charge : tu touches le gold du sbire.",
                                                 "Sur un canon : le gold du canon pour toi."]),
               ('🗼 Sous ta tour', '#5aa9ff', ["Il abîme un sbire avant le tir de tour : tu le last hit.",
                                             "À coordonner, sinon il te le vole."]),
               ('🪙 Les plaques', '#ffb347', ["L'or est partagé entre les champions proches.",
                                            "Il peut s'écarter pour que tu en touches plus."]),
               ('🤝 Et toi ?', '#b48cff', ["Dis-lui ce que tu veux faire de la wave.",
                                         "Comprends ses besoins : charges, wards, roams."])])]
