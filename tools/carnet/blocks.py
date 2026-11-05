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
    s = [dict(kind='cards', niv=niv, kick='Le mindset', title='Solo queue ≠ en équipe', cols=2,
        cards=[('🎧 En solo queue', '#5aa9ff', [
                    "Concentre-toi sur ton jeu, pas sur celui des autres.",
                    "Mode 1v9 : tu es une machine. Tes erreurs, tes placements : c'est ça qui compte.",
                    "« Comment je gagne cette game ? » avant la draft, pendant la draft, pendant la game.",
                    "Respecte ton plan."]),
               ('🔥 En équipe (FIRE)', '#ffb347', [
                    "Call : « pas de flash », « pas de R », « je ne veux pas fight ».",
                    "Donne les infos : « là, je sens le danger », « ils veulent m'engage ».",
                    "Chacun fait ce travail d'info.",
                    "Demande les ressources : « je te prends ça »."])]),
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
