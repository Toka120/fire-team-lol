# Contenu de la rubrique « Lanes et principes » (FIRE LoL).
# Chaque thème a la même forme qu'une fiche du coach : titre, accroche, sections, à retenir, exercice.
# "schema" renvoie au nom d'un dessin de schemas.py, avec sa légende.

THEMES = [
  {
    'id': 'bases', 'ico': '🧭', 'titre': 'Les bases de LoL', 'pour': 'tous',
    'accroche': "Les idées qui reviennent dans toutes les autres rubriques. Si tu ne lis qu'une page, lis celle-là.",
    'sections': [
      {'titre': 'Le but : détruire le Nexus, pas faire des kills',
       'texte': "Une game se gagne avec des **tours**, des **dragons** et des **Barons**. Les kills ne servent qu'à prendre ces objectifs plus facilement.\n\nAprès chaque kill, pour ton équipe ou contre elle, pose-toi une question : **qu'est-ce qu'on peut prendre maintenant ?** Une tour, des plates, un dragon, la jungle adverse, ou simplement une wave.",
       'schema': ('carte_timers', "La carte simplifiée : ta base en bas à gauche, les deux fosses d'objectifs dans la rivière.")},
      {'titre': 'Les golds et l’XP, tes deux ressources',
       'texte': "Tu gagnes des golds et de l'XP surtout en **farmant** : les sbires et les monstres rapportent plus, sur une game, que les kills.\n\n- Chaque sbire raté, ce sont des golds perdus.\n- Pour gagner l'XP, il suffit d'être **près des sbires quand ils meurent**, même sans les tuer.\n- Un niveau d'avance pèse lourd en lane, surtout aux niveaux **2, 3 et 6** (ultime)."},
      {'titre': 'Mourir coûte plus cher que tu crois',
       'texte': "Quand tu meurs, l'adversaire gagne des golds, mais ce n'est pas tout :\n\n- tu perds les sbires qui arrivent pendant que tu es mort ;\n- ta tour prend des dégâts et peut perdre des plates ;\n- ton équipe joue à 4 et peut perdre un objectif.\n\nSouvent, **reculer à temps vaut plus qu'un kill**."},
      {'titre': 'La minimap, toutes les 5 secondes',
       'texte': "Prends l'habitude de **regarder la minimap après chaque last-hit**. Tu y vois où sont les adversaires, et surtout lesquels ont disparu.\n\nSi un adversaire n'est plus visible (il est « MIA »), préviens avec un ping et joue plus prudemment jusqu'à ce qu'il réapparaisse."},
      {'titre': 'Les timers de la saison 2026',
       'texte': "- **0:30** : arrivée des premiers sbires (35 secondes plus tôt qu'avant 2026, comme les camps de jungle).\n- **5:00** : premier dragon, dans la fosse du bas.\n- **8:00** : les larves du Néant, dans la fosse du haut, **une seule fois** par game.\n- **15:00** : le Héraut de la Faille, une seule fois.\n- **20:00** : le Baron Nashor. Il revient 6 minutes après chaque Baron tué.\n\nUne équipe qui obtient l'âme du dragon (4 dragons) fait apparaître le **Dragon ancestral**. Atakhan n'existe plus depuis le début de la saison 2026."},
      {'titre': 'Communiquer simplement',
       'texte': "- Annonce ce que tu vas faire : « je back », « je viens drake », « je pousse et je roam ».\n- Préviens quand un adversaire n'a plus son **Flash** ou son ultime.\n- Utilise les pings plutôt que de longs messages.\n- Pas de reproches pendant la game : ça ne fait jamais gagner, et ça fait perdre la concentration de tout le monde."}
    ],
    'a_retenir': ["Un kill sert à prendre quelque chose", "Ne pas mourir vaut souvent plus qu'un kill", "Regarde la minimap après chaque last-hit", "Dragon 5:00, larves 8:00, Héraut 15:00, Baron 20:00"],
    'exercice': "Pendant ta prochaine game, après chaque kill (pour ou contre vous), dis à voix haute ce que l'équipe peut prendre juste après."
  },
  {
    'id': 'wave', 'ico': '🌊', 'titre': 'Gérer sa wave', 'pour': 'tous',
    'accroche': "Savoir où va ta wave, c'est choisir quand trade, quand back et quand roam. C'est la base de toutes les lanes.",
    'sections': [
      {'titre': 'Lire la wave',
       'texte': "Avant de faire quoi que ce soit, regarde trois choses :\n\n- **combien de sbires** il y a de chaque côté ;\n- **où les deux waves vont se rencontrer** ;\n- **quand arrive la prochaine wave**.\n\nLe camp qui a le plus de sbires avance vers la tour adverse. C'est ce qui décide où se passe la lane.",
       'schema': ('etats_wave', "Les trois façons de jouer : slow push, fast push (crash) et freeze.")},
      {'titre': 'Le slow push',
       'texte': "Tu ne tues les sbires qu'en last-hit, en commençant par **tuer en priorité les sbires à distance adverses**. Ta wave garde plus de sbires que la sienne et grossit à chaque nouvelle vague.\n\nAu bout de 2 ou 3 waves, une grosse wave arrive sous sa tour. **Utile** : juste avant de back, avant un dragon ou les larves, ou pour préparer une plongée avec ton jungler."},
      {'titre': 'Le fast push (crash)',
       'texte': "Tu tapes tous les sbires le plus vite possible pour envoyer ta wave **s'écraser sous sa tour**.\n\n**Utile** pour back sans perdre de sbires, pour roam, pour aider sur un objectif ou pour prendre des plates. Après le crash, tu as le temps d'un aller-retour avant que la wave suivante n'arrive chez toi."},
      {'titre': 'Le freeze',
       'texte': "Tu gardes la wave **juste devant ta tour, hors de sa portée**. Pour ça, la wave adverse doit avoir un peu plus de sbires que la tienne, et tu ne tues que les sbires sur le point de mourir.\n\nL'adversaire doit alors venir près de ta tour, loin de la sienne, pour farmer : c'est dangereux pour lui et idéal pour un gank. **Quand le faire** : quand tu es plus fort que ton adversaire ou qu'il est en retard.\n\nPour **casser un freeze** adverse : pousse avec l'aide de ton jungler, ou back et reviens.",
       'schema': ('freeze', "Le freeze : l'adversaire doit s'avancer dans la zone rouge, près de ton jungler.")},
      {'titre': 'Back au bon moment',
       'texte': "Le meilleur moment pour back, c'est **juste après avoir crashé ta wave** sous sa tour : ses sbires meurent sous la tour et la wave revient lentement vers le milieu. Tu ne perds presque rien.\n\n**Ne back jamais quand une grosse wave adverse arrive sous ta tour** : tu perds tous ces sbires, et ta tour prend des dégâts."},
      {'titre': 'Les erreurs fréquentes',
       'texte': "- Pousser sans raison alors que le jungler adverse n'a pas été vu.\n- Taper la wave n'importe comment, sans savoir ce que tu veux faire.\n- Back en laissant une grosse wave arriver chez toi.\n- Suivre la wave jusqu'à sa tour sans ward devant toi."}
    ],
    'a_retenir': ["Slow push : tue ses sbires à distance en premier", "Crash ta wave avant de back ou de roam", "Freeze devant ta tour quand tu es plus fort", "Jamais de back avec une grosse wave qui arrive chez toi"],
    'exercice': "Avant chaque back de ta prochaine game, demande-toi : « ma wave va-t-elle s'écraser chez lui ? » Si la réponse est non, pousse d'abord."
  },
  {
    'id': 'top', 'ico': '🛡️', 'titre': 'Lane top', 'pour': 'top',
    'accroche': "La lane la plus isolée de la carte : ton matchup, ta wave et ta Téléportation font une grande partie de ta game.",
    'sections': [
      {'titre': 'Connaître son matchup',
       'texte': "Avant la game, demande-toi qui gagne la lane **au niveau 1, au niveau 3, puis au niveau 6**, et qui devient plus fort plus tard.\n\n- Si ton champion est fort tôt (comme **Renekton**), joue agressif jusqu'au niveau 6 et cherche à prendre de l'avance.\n- Si ton champion devient fort plus tard (comme **Gwen**), ton but est de farmer et de ne pas mourir. Tu gagneras plus tard."},
      {'titre': 'Trade quand il last-hit',
       'texte': "Quand ton adversaire s'avance pour tuer un sbire, il ne peut pas te répondre correctement : **c'est le moment de taper**.\n\n- Fais des échanges **courts** : ton combo, puis tu recules.\n- S'il rate son sort principal, tu as une fenêtre de quelques secondes.\n- Attention aux sbires : si tu tapes un champion au milieu de sa wave, ses sbires te tapent aussi."},
      {'titre': 'La wave en top',
       'texte': "La lane top est longue : le **freeze** y est très fort. Si tu es devant, garde la wave près de ta tour pour que ton adversaire doive s'exposer pour farmer.\n\nSi tu es derrière et que tu dois back, **crash d'abord ta wave**. Si tu as la Téléportation, back au bon moment pour revenir sans perdre de sbires."},
      {'titre': 'Surveiller le jungler adverse',
       'texte': "Après son premier tour de jungle, à partir de la 3e minute environ, le jungler adverse peut venir. **Ward la rivière ou le buisson de la rivière** à ce moment-là.\n\nSi ton équipe voit le jungler adverse en bas, tu peux jouer plus agressif. S'il n'a pas été vu, ne pousse pas jusqu'à sa tour sans ward."},
      {'titre': 'Bien utiliser la Téléportation',
       'texte': "- Pour **revenir en lane** après un back, sans perdre de sbires.\n- Pour **rejoindre un fight** ou un dragon en bas.\n\nRègle : tu ne TP sur un fight que si **ta wave est poussée** vers sa tour, sinon tu perds tes sbires et ta tour. Et annonce-le avant : « TP prêt pour le drake »."},
      {'titre': 'Larves et Héraut : ta prio compte',
       'texte': "Les **larves du Néant (8:00)** et le **Héraut (15:00)** apparaissent dans la fosse du haut, à côté de ta lane. Si ta wave est poussée et que ton adversaire est sous sa tour, tu peux aider ton jungler et faire la différence.\n\nPousse ta wave **30 secondes avant** l'objectif, puis rejoins ton jungler."},
      {'titre': 'Le side lane, après la phase de lane',
       'texte': "Quand les premières tours sont tombées, le top va souvent **pousser une lane de côté** pendant que l'équipe fait pression ailleurs. Ça oblige l'adversaire à envoyer quelqu'un te défendre.\n\n- Garde une **ward devant toi**.\n- Si deux adversaires disparaissent de la carte, **recule**.\n- Ne meurs pas pendant que ton équipe ne prend rien ailleurs.",
       'schema': ('split', "Le split push : le top pousse sa lane, les 4 autres restent ensemble près du prochain objectif.")}
    ],
    'a_retenir': ["Connais ton matchup aux niveaux 1, 3 et 6", "Trade quand il va chercher un sbire", "TP sur un fight seulement si ta wave est poussée", "En side lane : ward devant toi, recule si 2 adversaires disparaissent"],
    'exercice': "Dans ta prochaine game, compte combien de fois tu fais un échange pendant que ton adversaire last-hit. Essaie d'en faire au moins 5 avant 10 minutes."
  },
  {
    'id': 'jungle', 'ico': '🌲', 'titre': 'Gérer sa jungle', 'pour': 'jungle',
    'accroche': "Le jungler donne le rythme de la game : son chemin, ses ganks et ses objectifs. Bien jungler, c'est être au bon endroit au bon moment.",
    'sections': [
      {'titre': 'Préparer son chemin',
       'texte': "Avant la game, regarde les lanes : **laquelle peut être gankée** (un adversaire sans moyen de fuir, un allié avec du contrôle) et de quel côté ton équipe veut jouer.\n\nCommence ta jungle **du côté opposé** à celui où tu veux finir : tu fais tous tes camps sans t'arrêter, et tu termines près de la lane à ganker ou de la scuttle.\n\nEn 2026, les camps apparaissent **35 secondes plus tôt** qu'avant : tout le début de partie est décalé.",
       'schema': ('chemin_jungle', "Un exemple de full clear : départ en haut, fin en bas vers le drake ou la lane bot.")},
      {'titre': 'Le tempo : toujours être utile',
       'texte': "À chaque moment, tu dois être en train de faire quelque chose : **farmer, ganker, poser des wards, préparer un objectif ou back**.\n\nSi un gank n'est pas bon, farme à la place. Un jungler qui farme bien et arrive au bon moment vaut plus qu'un jungler qui ganke partout et prend du retard en niveaux."},
      {'titre': 'Quand ganker',
       'texte': "**Bons signes :**\n- la wave est **près de la tour de ton allié** : l'adversaire s'est avancé loin de la sienne ;\n- l'adversaire n'a **pas de Flash** ou peu de vie ;\n- ton allié a du contrôle (stun, ralentissement) ou des dégâts ;\n- tu peux arriver **par derrière**, sans ward sur ton chemin.\n\n**Mauvais signes :** la wave est sous la tour adverse, ton allié n'a plus de vie, ou l'adversaire a plein de moyens de fuir.",
       'schema': ('gank', "Un bon gank : la wave est chez ton allié, tu coupes la fuite de l'adversaire.")},
      {'titre': 'Suivre le jungler adverse',
       'texte': "Note où le jungler adverse a commencé (un allié l'a peut-être vu au niveau 1). En général, il finit son premier tour **de l'autre côté de la carte** vers la 3e minute.\n\nS'il est vu en haut, joue en bas : dragon, gank bot, ou vol de ses camps. Et dis-le à ton équipe : « jungler ennemi top »."},
      {'titre': 'Scuttle et rivière',
       'texte': "Les crabes de la rivière donnent de la vision et de la vitesse. Va les contester **quand tes lanes proches ont la prio** (leurs waves sont poussées). Sinon, tu risques de te retrouver seul contre deux ou trois adversaires."},
      {'titre': 'Les objectifs',
       'texte': "Dragon à **5:00**, larves à **8:00** (une seule fois), Héraut à **15:00**, Baron à **20:00**.\n\n- **Une minute avant**, demande aux lanes de pousser leur wave et pose des wards autour de la fosse.\n- Garde ton **Smite** pour la fin de l'objectif.\n- Ne commence pas un objectif si le jungler adverse est vivant juste à côté et que tes lanes n'ont pas la prio."},
      {'titre': 'Voler la jungle adverse',
       'texte': "Tu peux voler des camps adverses quand tu sais que **le jungler adverse est de l'autre côté** de la carte, ou quand tes lanes ont la prio et peuvent venir t'aider. Ne le fais jamais seul quand tes lanes perdent."},
      {'titre': 'Les erreurs fréquentes',
       'texte': "- Ganker alors que la wave est sous la tour adverse.\n- Oublier ses camps quand ils réapparaissent.\n- Faire un objectif sans vision.\n- Rester trop longtemps sur une lane perdue.\n- Back sans regarder les timers des objectifs."}
    ],
    'a_retenir': ["Commence du côté opposé à celui où tu veux finir", "Ganke quand la wave est chez ton allié", "Suis le jungler adverse et joue l'autre côté", "1 minute avant un objectif : lanes poussées et wards"],
    'exercice': "Dans ta prochaine game, avant chaque gank, vérifie les trois points : où est la wave, a-t-il son Flash, d'où j'arrive. Si deux points sont mauvais, farme à la place."
  },
  {
    'id': 'mid', 'ico': '✨', 'titre': 'Lane mid', 'pour': 'mid',
    'accroche': "Au centre de la carte : ta wave décide si tu peux bouger avant ton adversaire.",
    'sections': [
      {'titre': 'La prio, c’est tout',
       'texte': "Avoir la **prio**, c'est avoir ta wave qui pousse vers sa tour : ton adversaire doit rester farmer, toi tu es libre de bouger. Tu peux aider ton jungler sur la scuttle, aller sur un dragon ou roam.\n\nAvec un mage, tu peux souvent pousser vite avec tes sorts. Pousse au bon moment, pas en permanence."},
      {'titre': 'Des wards des deux côtés',
       'texte': "Le mid peut être gank des deux côtés. Pose ta ward **du côté où se trouve le jungler adverse** (ou le plus dangereux), et place-toi de ce côté de la lane. Sans ward, ne t'avance pas plus loin que le milieu de la lane."},
      {'titre': 'Roam intelligemment',
       'texte': "Avant de partir, **crash ta wave** sous sa tour, sinon tu perds tes sbires et ta tour prend des dégâts.\n\nVa là où il y a un vrai gain : une lane dont la wave est chez elle, un adversaire avec peu de vie, un objectif. Si ça ne marche pas, rentre vite ou fais quelque chose d'utile en chemin (ward, camp).",
       'schema': ('roam_mid', "Pousser puis bouger : la wave arrive sous sa tour, et tu pars par la rivière.")},
      {'titre': 'Suivre les roams adverses',
       'texte': "Si ton adversaire disparaît, **ping « MIA » tout de suite**. Ensuite, deux choix :\n\n- **le suivre**, si ta wave est poussée ;\n- **le punir**, en prenant sa wave, des plates ou sa tour pendant qu'il n'est pas là."},
      {'titre': 'Trades et temps de recharge',
       'texte': "Avec des mages comme **Hwei, Oriana ou Syndra**, profite de ta portée pour toucher l'adversaire quand il va chercher un sbire.\n\nTrade quand **son sort important est en recharge**, et garde ton sort de contrôle pour te défendre s'il s'engage sur toi."},
      {'titre': 'Après la phase de lane',
       'texte': "Le mid suit son jungler sur les objectifs et reste **avec l'équipe** pour les fights.\n\nPousse la wave mid **avant chaque objectif**, et ne pars pas seul sur un côté de la carte sans vision."}
    ],
    'a_retenir': ["Prio = ta wave pousse, tu peux bouger", "Ward le côté du jungler adverse", "Crash ta wave avant de roam", "Ping MIA dès que ton adversaire disparaît"],
    'exercice': "Dans ta prochaine game, essaie de faire 2 roams réussis avant 14 minutes, à chaque fois après avoir crashé ta wave."
  },
  {
    'id': 'bot', 'ico': '🏹', 'titre': 'Lane bot (ADC et support)', 'pour': 'adc support',
    'accroche': "La lane à deux : les niveaux, la wave et les dragons se jouent ensemble.",
    'sections': [
      {'titre': 'Le niveau 2, la première course',
       'texte': "En bot, le **niveau 2** arrive après la **première wave complète, plus les 3 sbires de mêlée de la deuxième**. Le duo qui y arrive le premier peut engager tout de suite.\n\nTapez fort la première wave à deux. Quand l'adversaire passe niveau 2 avant vous, reculez un peu.",
       'schema': ('niveau2', "La course au niveau 2 : 6 sbires de la première wave, plus 3 sbires de mêlée de la deuxième.")},
      {'titre': 'ADC : farmer sans mourir',
       'texte': "Ton travail principal : **tuer chaque sbire** et garder ta vie.\n\n- Reste **derrière tes sbires**, pour ne pas prendre les sorts adverses.\n- Fais une ou deux attaques sur l'adversaire **quand il va chercher un sbire**.\n- Avec **Zeri, Miss Fortune ou Xayah**, ne prends pas d'échanges longs si tu perds des sbires à cause de ça."},
      {'titre': 'Support : vision et pression',
       'texte': "Pose des wards dans la **rivière** et le **buisson de la rivière**, et garde toujours une **pink**.\n\n- Avec **Nautilus** ou **Pyke**, cherche à engager quand l'adversaire est loin de sa tour ou mal placé.\n- Avec **Vel'Koz**, touche l'adversaire de loin et reste derrière tes sbires.\n\nTu n'as pas besoin de farmer : laisse les sbires à ton ADC."},
      {'titre': 'La wave à deux',
       'texte': "- **Back ensemble**, après avoir crashé votre wave.\n- **Slow push** avant le dragon, pour arriver les premiers.\n- **Freeze** quand vous êtes devant.\n\nNe laissez pas l'un des deux seul en lane contre deux adversaires."},
      {'titre': 'Le dragon, votre objectif',
       'texte': "Le dragon (5:00) est à côté de votre lane. Si votre wave est poussée, votre jungler peut le faire sans risque. Avant, poussez, posez des wards dans la rivière, et soyez prêts à venir."},
      {'titre': 'Les roams du support',
       'texte': "Quand votre wave est poussée ou après un back, le support peut aller poser des wards ou aider le mid et le jungler.\n\nPendant ce temps, l'**ADC joue prudent** : pas d'échange seul contre deux, et il farme sous sa tour si besoin."},
      {'titre': 'En fight : la place de l’ADC',
       'texte': "Reste **derrière ta frontline** et tape ce qui est à ta portée, souvent l'adversaire le plus proche. N'avance jamais pour chercher un kill.\n\nLe support protège l'ADC ou engage, selon son champion. Voir la rubrique **Gérer ses fights**."}
    ],
    'a_retenir': ["Niveau 2 = 1re wave + 3 sbires de mêlée", "ADC : derrière tes sbires, trade quand il last-hit", "Back ensemble, après un crash", "Dragon : wave poussée et wards avant"],
    'exercice': "Dans ta prochaine game, comptez à deux le moment du niveau 2 et annoncez-le (« niveau 2 dans 2 sbires ») pour engager ou reculer au bon moment."
  },
  {
    'id': 'fights', 'ico': '⚔️', 'titre': 'Gérer ses fights', 'pour': 'tous',
    'accroche': "Un fight se gagne surtout avant qu'il commence : le nombre, les positions et les sorts disponibles.",
    'sections': [
      {'titre': 'Avant de fight : compter',
       'texte': "Avant d'engager, vérifie :\n\n- le **nombre** : à 4 contre 5, on ne fight pas ;\n- les **niveaux et objets** des deux équipes ;\n- les **ultimes et Flash** disponibles ;\n- la **vision** autour de vous.\n\nSi deux adversaires ne sont pas visibles sur la carte, ne force rien."},
      {'titre': 'Chacun son rôle',
       'texte': "- **Engager** : les tanks et certains supports (Nautilus, Jarvan IV) lancent le fight.\n- **Faire les dégâts** : l'ADC et les mages tapent depuis l'arrière.\n- **Protéger** : quelqu'un garde ses sorts pour défendre les carrys.\n\nAvant le fight, sachez **qui engage**. Si personne ne le sait, personne n'y va au bon moment."},
      {'titre': 'Se placer',
       'texte': "Les tanks devant, les carrys derrière, **à portée**. Ne te place jamais seul devant sans vision : tu deviens la cible facile.\n\nL'ADC tape ce qui est le plus proche **sans prendre de risque**, même si c'est le tank.",
       'schema': ('fight', "Les positions en fight : frontline devant, carrys derrière, à portée.")},
      {'titre': 'Choisir sa cible',
       'texte': "Tue ce que tu peux atteindre **sans mourir**. Si toute l'équipe tape le même adversaire, il tombe beaucoup plus vite : utilisez les pings pour vous mettre d'accord.\n\nNe traverse pas tout le fight pour aller chercher le carry adverse si tu meurs en route."},
      {'titre': 'Les fights autour des objectifs',
       'texte': "L'équipe qui **arrive la première**, avec de la vision, gagne la plupart des fights d'objectif. Soyez placés **une minute avant** l'apparition.\n\nNe jamais arriver **un par un** : attends ton équipe, même si l'objectif est en train de tomber."},
      {'titre': 'Après le fight',
       'texte': "**Vous gagnez :** prenez tout de suite un objectif (tour, dragon, Baron) au lieu de poursuivre les adversaires dans leur jungle.\n\n**Vous perdez :** back, défendez, et ne revenez pas un par un."},
      {'titre': 'Les erreurs qui perdent les fights',
       'texte': "- Poursuivre un adversaire trop loin.\n- Utiliser son ultime sur un adversaire déjà presque mort.\n- Se battre dans la jungle sans vision.\n- Accepter un fight en infériorité numérique.\n- Engager alors que l'équipe n'est pas là."}
    ],
    'a_retenir': ["Compte avant d'engager : nombre, ultis, Flash, vision", "Sachez qui engage", "Carrys derrière la frontline, à portée", "Après un fight gagné, prends un objectif"],
    'exercice': "Dans ta prochaine game, avant chaque fight, compte à voix haute le nombre de joueurs de chaque côté. À 4 contre 5, recule."
  },
  {
    'id': 'conceder', 'ico': '🏳️', 'titre': 'Savoir concéder', 'pour': 'tous',
    'accroche': "Savoir lâcher quelque chose pour ne pas tout perdre : c'est souvent ce qui sépare les bonnes équipes des autres.",
    'sections': [
      {'titre': 'Pourquoi concéder',
       'texte': "Si un fight est perdu d'avance, y aller fait perdre **l'objectif, des morts et du temps**. Concéder, c'est ne perdre que l'objectif, et prendre autre chose à la place."},
      {'titre': 'Quand concéder',
       'texte': "Concède un objectif quand :\n\n- vous êtes **moins nombreux** ;\n- vos lanes **n'ont pas la prio** ;\n- l'adversaire est **plus fort** (niveaux, objets) ;\n- vous n'avez **pas de vision** autour ;\n- vos ultimes ou Flash ne sont pas prêts ;\n- l'objectif est déjà en train de tomber et vous arrivez de loin."},
      {'titre': 'Échanger de l’autre côté',
       'texte': "Quand l'adversaire fait un dragon à cinq, il n'est pas ailleurs. Profitez-en pour prendre **une tour, les larves, le Héraut, des plates ou sa jungle**.\n\nC'est un échange : ils ont quelque chose, vous aussi.",
       'schema': ('conceder', "Concéder le dragon, prendre quelque chose de l'autre côté de la carte.")},
      {'titre': 'Lâcher une wave ou une tour',
       'texte': "Mieux vaut perdre quelques sbires ou une plate que mourir. Si trois adversaires plongent sous ta tour, **recule** : une tour perdue coûte moins qu'une mort **plus** la tour."},
      {'titre': 'Quand on est en retard',
       'texte': "- Jouez prudent : farmez, défendez sous les tours.\n- Restez groupés et attendez une erreur de l'adversaire.\n- Évitez les actions désespérées en solo.\n\nEn 2026, les dragons et le Baron donnent **plus d'expérience de rattrapage** à l'équipe en retard : un bon objectif peut relancer la game."},
      {'titre': 'Le dire tôt',
       'texte': "Décidez **30 secondes avant** : « on lâche le drake, on prend top ». Une équipe qui hésite arrive à moitié, et perd les deux."}
    ],
    'a_retenir': ["Concéder un objectif coûte moins qu'un fight perdu", "Échange : prends quelque chose de l'autre côté", "Une tour perdue < une mort + la tour", "Décidez 30 secondes avant, et dites-le"],
    'exercice': "Dans ta prochaine game, à chaque objectif que l'adversaire prend, propose une chose à prendre en échange (une tour, des plates, sa jungle)."
  },
  {
    'id': 'vision', 'ico': '👁️', 'titre': 'La vision', 'pour': 'tous',
    'accroche': "Sans vision, tu joues à l'aveugle. Avec, tu sais où sont les dangers et où sont les occasions. Et chaque ward a un but : te protéger (défensive) ou suivre l'adversaire (offensive).",
    'sections': [
      {'titre': 'Wards et trinket',
       'texte': "Pose tes wards **là où le danger arrive** : la rivière, les buissons de la rivière, l'entrée de la jungle adverse.\n\nEn milieu de partie, le support et le jungler peuvent passer au **trinket de balayage** pour enlever les wards adverses. En 2026, les **Faelights** de la carte renforcent la vision des wards posées dessus."},
      {'titre': 'Les pinks',
       'texte': "Une **pink** (balise de contrôle) révèle et désactive les wards adverses. Achètes-en **une à chaque back**, et pose-la là où elle restera longtemps : un buisson de la rivière, près d'une fosse d'objectif."},
      {'titre': 'Vision avant un objectif',
       'texte': "**Une minute avant** un dragon ou un Baron, pose des wards autour de la fosse et à l'entrée de la jungle adverse, et enlève leurs wards.",
       'schema': ('vision_drake', "Préparer un dragon : wards autour de la fosse, une pink, lanes poussées.")},
      {'titre': 'Les wards défensives',
       'texte': "Elles se posent **dans ta moitié de carte** : les entrées de ta jungle, ton tri-bush (le buisson à trois entrées près de ta tour top ou bot), le buisson de la rivière de ton côté, près de tes buffs.\n\n**À quoi elles servent** : voir arriver un gank, une invasion de ta jungle ou un adversaire qui vient te couper en side lane.\n\n**Quand** : quand ton équipe est derrière, quand tu es seul en side lane, quand tu dois farmer tranquillement, ou en début de game contre un jungler qui aime ganker tôt.",
       'schema': ('wards_def_off', "Exemples d'emplacements : D chez toi pour te protéger, O chez l'adversaire pour le suivre.")},
      {'titre': 'Les wards offensives',
       'texte': "Elles se posent **dans la moitié adverse** : les entrées de sa jungle, ses buffs, son tri-bush, ses camps près de la rivière.\n\n**À quoi elles servent** : suivre le jungler adverse, préparer un gank ou une invasion, voir ses joueurs qui farment pour les piéger, préparer un objectif de son côté.\n\n**Quand** : quand ton équipe est devant, et surtout **quand tes lanes ont la prio**. Sinon, tu risques de mourir en allant la poser : vas-y en groupe ou avec ton jungler."},
      {'titre': 'Qui pose quoi',
       'texte': "- **Top** : la rivière ou ton tri-bush en défensif pendant la lane, une entrée de sa jungle quand tu pousses.\n- **Jungle** : ses buffs et ses entrées en offensif pour suivre son jungler, ta jungle en défensif quand tu es derrière.\n- **Mid** : la rivière des deux côtés, puis sa jungle quand tu as la prio.\n- **ADC** : ton tri-bush ou la rivière près du dragon, surtout quand ton support roam.\n- **Support** : les wards les plus profondes chez l'adversaire, avec le trinket de balayage pour enlever les siennes."},
      {'titre': 'Jouer avec la vision',
       'texte': "Ne rentre jamais seul dans un buisson que personne ne voit (le **facecheck**) : envoie un sort, une ward, ou laisse passer le tank devant.\n\nDans l'onglet stats de FIRE LoL, regarde ton **score de vision** et tes **pinks par game**."}
    ],
    'a_retenir': ["Défensives chez toi quand vous êtes derrière", "Offensives chez lui quand vous avez la prio", "Une pink à chaque back", "Vision une minute avant chaque objectif", "Pas de facecheck"],
    'exercice': "Dans ta prochaine game, achète une pink à chaque back et pose-la dans la minute. Vérifie ensuite ton nombre de pinks dans FIRE LoL."
  },
  {
    'id': 'objectifs', 'ico': '🐉', 'titre': 'Objectifs et macro', 'pour': 'tous',
    'accroche': "La macro, c'est savoir quoi faire quand personne ne se bat : où aller, quoi prendre, quand se regrouper.",
    'sections': [
      {'titre': 'La prio donne le droit de prendre',
       'texte': "Une équipe dont les lanes sont poussées peut aller sur un objectif **avant** l'autre. Avant chaque objectif, **les lanes proches poussent** leur wave."},
      {'titre': 'Ce que rapporte chaque objectif',
       'texte': "- **Dragons** (5:00) : un bonus permanent pour l'équipe, et l'**âme** au 4e dragon.\n- **Larves du Néant** (8:00, une fois) : des dégâts en plus contre les tours.\n- **Héraut** (15:00, une fois) : un œil qui permet de lancer le Héraut sur une tour.\n- **Baron** (20:00) : un gros bonus qui aide à pousser les lanes.\n- **Dragon ancestral** : après une âme, il donne un bonus qui achève les adversaires à peu de vie.\n- **Plates des tours** : des golds pour l'équipe qui les casse."},
      {'titre': 'Après un kill ou un ace',
       'texte': "Prends **l'objectif le plus proche** et une tour. Un kill sans rien derrière, c'est une occasion perdue."},
      {'titre': 'Les tours ouvrent la carte',
       'texte': "Une tour adverse détruite ouvre sa jungle à tes wards et à tes attaques. Une fois la première tour tombée, **déplace la pression** : groupez-vous mid, ou envoyez quelqu'un sur une lane de côté."},
      {'titre': 'Le Baron',
       'texte': "Lance le Baron **après avoir tué deux adversaires ou plus**, ou avec une vision complète autour de la fosse. Jamais à cinq contre cinq sans vision : le jungler adverse peut le voler avec son Smite."},
      {'titre': 'Milieu de partie : se regrouper',
       'texte': "Regroupez-vous **autour du prochain objectif**, pas au hasard. Une seule personne reste en side lane pour pousser, les quatre autres sont prêtes à fight."}
    ],
    'a_retenir': ["Pas d'objectif sans prio", "Après un kill : objectif ou tour", "Baron : après des kills ou avec vision", "Regroupez-vous autour du prochain objectif"],
    'exercice': "Dans ta prochaine game, après chaque kill de ton équipe, ping l'objectif ou la tour à prendre."
  },
  {
    'id': 'recall', 'ico': '💰', 'titre': 'Recall, golds et objets', 'pour': 'tous',
    'accroche': "Un back au bon moment, c'est une avance gratuite. Un back au mauvais moment, c'est une wave et des golds perdus.",
    'sections': [
      {'titre': 'Quand back',
       'texte': "- **Après avoir crashé ta wave** sous sa tour.\n- Quand tu as les golds pour **un objet ou un composant important**.\n- Quand tu n'as plus assez de vie ou de mana pour rester sans danger.\n\nJamais quand une grosse wave adverse arrive sous ta tour."},
      {'titre': 'Prévoir ses achats',
       'texte': "Pense à ce que tu veux acheter **avant** de back. Revenir avec trop peu de golds, c'est faire l'aller-retour pour presque rien."},
      {'titre': 'Back au bon moment avec l’équipe',
       'texte': "Back **avec ton duo** en bot, et préviens ton jungler. Avant un objectif, ne back pas tous en même temps au dernier moment : soyez prêts **ensemble**."},
      {'titre': 'À chaque back',
       'texte': "- Une **pink**.\n- Des potions si ta lane est difficile.\n- Puis retourne vite en lane pour ne pas rater la wave suivante."},
      {'titre': 'Partager les golds',
       'texte': "Ne prends pas les sbires d'une lane qui n'est pas la tienne si ton coéquipier est là, ni les camps du jungler sans le lui demander. Les golds doivent aller à ceux qui en ont le plus besoin pour faire gagner l'équipe."}
    ],
    'a_retenir': ["Crash, puis back", "Sache quoi acheter avant de back", "Back avec ton duo, prévenir le jungler", "Une pink à chaque back"],
    'exercice': "Dans ta prochaine game, avant chaque back, regarde tes golds et dis ce que tu vas acheter. Pas de back en dessous d'un composant utile, sauf si tu es en danger."
  },
  {
    'id': 'mental', 'ico': '🧠', 'titre': 'Mental et progression', 'pour': 'tous',
    'accroche': "Progresser, c'est surtout rester concentré et travailler une chose à la fois.",
    'sections': [
      {'titre': 'Une chose par game',
       'texte': "Choisis **un seul point** à travailler par game, par exemple « crash avant de back » ou « regarder la minimap ». C'est beaucoup plus efficace que de vouloir tout corriger d'un coup."},
      {'titre': 'Rester positif',
       'texte': "Coupe le chat si ça devient négatif, et garde les pings pour donner des informations. Une équipe qui se dispute joue moins bien, même si elle a raison."},
      {'titre': 'Après une défaite',
       'texte': "Regarde **un moment clé** dans le replay (deux minutes suffisent) : une mort, un objectif perdu. Comprendre une erreur vaut mieux qu'enchaîner les games."},
      {'titre': 'Faire des pauses',
       'texte': "Après **deux défaites de suite**, fais une pause de quelques minutes. Jouer énervé fait perdre plus de LP qu'une pause ne fait perdre de temps."},
      {'titre': 'Utiliser FIRE LoL',
       'texte': "Dans **📊 Stats des joueurs**, regarde surtout tes **morts par game**, ton **écart de golds à 15 minutes** et ta progression vers l'**objectif de games sur ton pool**. Ce sont les chiffres qui montrent le plus vite si tu progresses."}
    ],
    'a_retenir': ["Un seul point de travail par game", "Pings utiles, pas de reproches", "Un moment clé du replay après une défaite", "Pause après deux défaites de suite"],
    'exercice': "Avant ta prochaine game, écris le point que tu veux travailler. Après la game, note si tu l'as fait."
  }
]


# ---------- Catégories par lane : les thèmes utiles à chaque rôle, avec des conseils propres à la lane ----------
# Chaque entrée : (id du thème, phrase « focus », [conseils pour cette lane])
CATEGORIES = [
  {
    'id': 'top', 'ico': '🛡️', 'titre': 'TOP LANE', 'roles': ['top'],
    'intro': "La lane la plus isolée : ta wave, ton matchup et ta Téléportation font ta game.",
    'themes': [
      ('top', "Le cœur de ta lane : matchup, trades, TP et side lane.", []),
      ('wave', "En top, la lane est longue : le freeze est ton arme.", [
        "Devant : freeze près de ta tour pour obliger ton adversaire à s'avancer.",
        "Derrière : ne va pas chercher la wave sous sa tour, attends-la près de la tienne.",
        "Crash ta wave avant chaque back, surtout si tu as la TP."]),
      ('fights', "Tu es souvent la frontline, ou celui qui arrive en TP.", [
        "Ta TP peut créer un 4 contre 3 : annonce-la avant le fight.",
        "Tank : engage ou protège. Combattant : tape ce que tu atteins sans mourir.",
        "Pas de TP sur un fight si ta wave n'est pas poussée."]),
      ('vision', "Une ward dans la rivière te protège des ganks.", [
        "Vers 3:00, ward la rivière ou ton tri-bush.",
        "En side lane, garde toujours une ward devant toi.",
        "Une pink dans le buisson de la rivière du haut dure longtemps."]),
      ('objectifs', "Les larves (8:00) et le Héraut (15:00) sont de ton côté.", [
        "Pousse ta wave 30 secondes avant les larves ou le Héraut.",
        "Après la phase de lane, ta pression en side oblige l'adversaire à envoyer quelqu'un.",
        "Une tour top prise donne de la place à ton jungler."]),
      ('recall', "Ton back suit ta wave et ta TP.", [
        "Crash puis back : tu ne perds aucun sbire.",
        "Avec la TP prête, back puis TP pour revenir sans perdre de wave.",
        "Pas de back quand une grosse wave arrive sous ta tour."]),
      ('conceder', "Seul en top, savoir lâcher une tour te garde en vie.", [
        "Si son jungler et ton adversaire plongent ensemble, recule.",
        "Si ton équipe perd un fight en bas, prends des plates en top.",
        "Ne TP pas sur un fight déjà perdu."]),
      ('bases', "Les bases valent pour toutes les lanes.", [
        "Regarde la minimap à chaque last-hit : le jungler adverse vient souvent en top tôt."]),
      ('mental', "Un matchup perdu arrive : reste calme et farme.", [
        "Une lane perdue n'est pas une game perdue : ton champion peut revenir plus tard."]),
    ]
  },
  {
    'id': 'jungle', 'ico': '🌲', 'titre': 'JUNGLE', 'roles': ['jungle'],
    'intro': "Tu donnes le rythme de la game : ton chemin, tes ganks et les objectifs.",
    'themes': [
      ('jungle', "Ton cœur de métier : chemin, ganks, objectifs.", []),
      ('objectifs', "C'est toi qui appelles les objectifs.", [
        "Regarde les timers après chaque back.",
        "Demande aux lanes de pousser 1 minute avant.",
        "Garde ton Smite pour la fin de l'objectif."]),
      ('vision', "Tu poses et enlèves la vision de la jungle.", [
        "Ward la jungle adverse pour suivre son jungler.",
        "En milieu de partie, passe au trinket de balayage.",
        "Une pink près de la fosse avant chaque dragon."]),
      ('wave', "Tu ne gères pas de wave, mais tu dois les lire.", [
        "Ganke quand la wave est près de la tour de ton allié.",
        "Une wave qui pousse vers sa tour à lui rend le gank difficile.",
        "Après un gank réussi, aide ton allié à pousser pour prendre des plates."]),
      ('fights', "Tu engages ou tu protèges, et tu restes près de l'objectif.", [
        "Avec un champion d'engage (Jarvan IV par exemple), lance le fight quand l'équipe est prête.",
        "Reste près de l'objectif pour le Smite.",
        "Ne poursuis pas un adversaire au lieu de prendre le dragon."]),
      ('recall', "Ton back se cale sur les timers.", [
        "Back après un full clear ou un objectif.",
        "Ne back pas 30 secondes avant un dragon.",
        "Prends tes camps sur le chemin du retour."]),
      ('conceder', "Tu décides souvent de lâcher ou d'échanger.", [
        "Son jungler fait le dragon ? Prends les larves, le Héraut ou sa jungle.",
        "Ne conteste pas sans la prio de tes lanes.",
        "Annonce ton choix 30 secondes avant."]),
      ('bases', "Les bases valent pour toutes les lanes.", [
        "Les timers des objectifs sont ton outil principal : apprends-les par cœur."]),
      ('mental', "Tout le monde te demande des ganks : reste sur ton plan.", [
        "Un gank refusé parce qu'il est mauvais, c'est une bonne décision."]),
    ]
  },
  {
    'id': 'mid', 'ico': '✨', 'titre': 'MID LANE', 'roles': ['mid'],
    'intro': "Au centre de la carte : ta prio te permet de bouger avant tout le monde.",
    'themes': [
      ('mid', "Le cœur de ta lane : prio, roams, trades.", []),
      ('wave', "Pousser vite pour bouger en premier.", [
        "Crash ta wave avant de roam.",
        "Avec un mage, tue d'abord ses sbires à distance avec tes sorts.",
        "Ne laisse pas une grosse wave s'écraser sous ta tour pendant un roam."]),
      ('vision', "Le mid peut être gank des deux côtés.", [
        "Ward le côté où se trouve le jungler adverse.",
        "Place-toi du côté que tu vois.",
        "Ward la rivière avant de roam."]),
      ('fights', "Tu es souvent la grosse source de dégâts ou de contrôle.", [
        "Reste derrière ta frontline, à portée de tes sorts.",
        "Garde ton sort de contrôle pour la bonne cible.",
        "Garde ton ultime pour le moment où il touche le plus d'adversaires ou finit la cible."]),
      ('objectifs', "Ta prio mid permet d'aller sur les deux fosses.", [
        "Pousse ta wave avant chaque objectif.",
        "Va avec ton jungler sur la scuttle et les objectifs.",
        "Après une tour mid prise, regroupez-vous."]),
      ('recall', "Back après un crash, avant un objectif.", [
        "Synchronise ton back avec ton jungler.",
        "Achète une pink à chaque back pour la rivière.",
        "Pas de back si ta wave va s'écraser sous ta tour."]),
      ('conceder', "Ne va pas seul contester ce que l'équipe ne peut pas prendre.", [
        "Si le jungler et le mid adverses montent, ne conteste pas seul.",
        "Prends la wave et les plates à la place.",
        "Ping tôt ce que l'équipe lâche."]),
      ('bases', "Les bases valent pour toutes les lanes.", [
        "Au mid, la minimap compte double : tu vois venir les roams des deux côtés."]),
      ('mental', "Un roam raté arrive : rentre vite et farme.", [
        "Un roam qui ne marche pas n'est pas une erreur si ta wave était poussée."]),
    ]
  },
  {
    'id': 'adc', 'ico': '🏹', 'titre': 'ADC', 'roles': ['adc'],
    'diapo': {"titre": "L’ADC en 13 slides", "resume": "L'essentiel du rôle d'ADC, avec les skins. Le détail de chaque point est dans les thèmes juste en dessous.", "base": "https://toka120.github.io/fire-team-lol/diapos/adc/", "slides": [{"img": "slide-01.jpg?v=2", "titre": "L’ADC"}, {"img": "slide-02.jpg?v=2", "titre": "Sommaire"}, {"img": "slide-03.jpg?v=2", "titre": "Les dégâts de l’équipe"}, {"img": "slide-04.jpg?v=2", "titre": "Trois façons de jouer"}, {"img": "slide-05.jpg?v=2", "titre": "Farmer avant tout"}, {"img": "slide-06.jpg?v=2", "titre": "Vivant, l’ADC gagne le fight"}, {"img": "slide-07.jpg?v=2", "titre": "Back au bon moment"}, {"img": "slide-08.jpg?v=2", "titre": "Voir avant d’avancer"}, {"img": "slide-09.jpg?v=2", "titre": "Une botlane mieux protégée"}, {"img": "slide-10.jpg?v=2", "titre": "Cinq réflexes à prendre"}, {"img": "slide-11.jpg?v=2", "titre": "Farmer. Survivre. Frapper."}, {"img": "slide-12.jpg?v=2", "titre": "Le détail est dans FIRE LoL"}, {"img": "slide-13.jpg?v=2", "titre": "Merci !"}]},
    'intro': "Farmer, rester en vie, faire les dégâts : la lane bot avec ton support.",
    'themes': [
      ('bot', "Ta lane à deux avec ton support.", []),
      ('wave', "Farmer chaque sbire, c'est ta priorité.", [
        "Last-hit chaque sbire : tes objets font tes dégâts.",
        "Poussez et backez avec ton support.",
        "Avant un dragon, slow push pour arriver les premiers."]),
      ('fights', "Rester en vie et taper ce qui est à portée.", [
        "Reste derrière ta frontline.",
        "Tape le plus proche si c'est sans risque, même si c'est le tank.",
        "Une attaque, un pas en arrière : ne reste jamais immobile."]),
      ('recall', "Tes objets font tes dégâts : back au bon moment.", [
        "Back quand tu as les golds pour un composant important.",
        "Back en même temps que ton support.",
        "Achète des potions si la lane est difficile."]),
      ('vision', "Ton support s'occupe surtout de la vision, mais pas tout seul.", [
        "Ward ton tri-bush quand ton support roam.",
        "Ne t'avance pas sans vision quand le jungler adverse a disparu.",
        "Garde une pink sur toi."]),
      ('objectifs', "Le dragon est à côté de ta lane.", [
        "Poussez votre wave avant le dragon.",
        "Prends les plates de la tour bot quand vous avez la prio.",
        "Avec le Baron, pousse en restant derrière tes sbires."]),
      ('conceder', "Seul, lâche quelques sbires plutôt que mourir.", [
        "Si ton support roam, joue sous ta tour.",
        "À 1 contre 2, recule et farme sous ta tour.",
        "Ne rejoins pas un fight où tu arrives seul."]),
      ('bases', "Les bases valent pour toutes les lanes.", [
        "Une mort d'ADC coûte cher : tes golds sont ton arme."]),
      ('mental', "Une lane à deux, un mental à deux.", [
        "Félicite ton support après un bon engage : la lane va mieux quand vous parlez."]),
    ]
  },
  {
    'id': 'support', 'ico': '💞', 'titre': 'SUPPORT', 'roles': ['support'],
    'intro': "La vision, l'engage et la protection : tu prépares tout pour ton équipe.",
    'themes': [
      ('bot', "Ta lane à deux avec ton ADC.", []),
      ('vision', "La vision est ton travail principal.", [
        "Une pink à chaque back.",
        "Ward rivière et tri-bush, puis la jungle adverse quand vous avez la prio.",
        "En milieu de partie, passe au trinket de balayage."]),
      ('fights', "Tu engages ou tu protèges.", [
        "Nautilus ou Pyke : engage quand l'équipe peut suivre.",
        "Vel'Koz : touche de loin et reste derrière ta frontline.",
        "Protège ton ADC s'il se fait attaquer."]),
      ('wave', "Tu ne farmes pas, mais tu aides à pousser au bon moment.", [
        "Laisse les sbires à ton ADC.",
        "Aide à pousser la 1re wave pour le niveau 2.",
        "Pousse avec ton ADC avant un back ou un dragon."]),
      ('objectifs', "Tu prépares la vision des objectifs.", [
        "Éclaire la fosse du dragon 1 minute avant.",
        "Accompagne ton jungler dans la rivière.",
        "Avant le Baron, enlève les wards adverses."]),
      ('recall', "Ton back suit celui de ton ADC.", [
        "Back avec ton ADC.",
        "Achète une pink à chaque back.",
        "Après un back, tu peux aller poser des wards ou aider le mid."]),
      ('conceder', "Ne lance pas un fight perdu d'avance.", [
        "Pas d'engage à 4 contre 5.",
        "Ping tôt quand il faut lâcher le dragon.",
        "Va poser de la vision de l'autre côté pendant l'échange."]),
      ('bases', "Les bases valent pour toutes les lanes.", [
        "Tu as le plus de temps pour regarder la minimap : préviens ton équipe."]),
      ('mental', "Tu donnes le ton de l'équipe.", [
        "Les pings positifs viennent souvent du support : l'équipe joue mieux avec."]),
    ]
  },
]
