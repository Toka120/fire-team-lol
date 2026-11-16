// FIRE — Parcours : l'arbre des compétences de macro. 5 thèmes × 4 niveaux (Facile → Pro).
// Chaque étape : une courte leçon, puis des puzzles. Il faut en réussir au moins 3 sur 4 pour débloquer le niveau suivant du thème.
// g = index de la bonne réponse.
(function () {
  'use strict';
  const THEMES = [
    ['eco', '💰', 'Économie'], ['vision', '👁️', 'Vision'], ['move', '🧭', 'Déplacements'], ['combat', '⚔️', 'Combat'], ['state', '📈', 'État de la partie'],
  ];
  const LEVELS = [['Facile', '#3ddc84'], ['Moyen', '#ffc24b'], ['Difficile', '#ff8a3d'], ['Pro', '#ff4d5e']];
  const N = [
    // ---------------- Économie ----------------
    { id: 'eco1', th: 'eco', lv: 0, ico: '🏠', t: 'Les timings de back',
      l: ['Back quand ta wave vient de partir sous la tour adverse : tu ne perds ni sbires ni XP.', 'Back avec assez d’or pour un composant important (pas 150 golds de trop au-dessus).', 'Un back au bon moment vaut mieux que 2 sbires de plus avec 20 % de vie.'],
      q: [
        { q: 'Tu as 1 300 golds, ta wave est sur le point d’arriver sous ta tour. Que fais-tu ?', o: ['Je back tout de suite', 'Je push la wave puis je back', 'Je reste jusqu’à 2 000 golds'], g: 1, e: 'Push d’abord : la wave part chez l’adversaire pendant ton back, tu ne perds rien.' },
        { q: 'Quel est le pire moment pour back ?', o: ['Juste après avoir push la wave', 'Quand une grosse wave arrive sous ta tour', 'Quand l’adversaire vient de back'], g: 1, e: 'Une grosse wave qui s’écrase sous ta tour pendant ton absence = sbires et XP perdus.' },
        { q: 'Tu as 30 % de vie et 400 golds, l’adversaire a l’avantage de vie. Mieux vaut…', o: ['Rester pour farmer', 'Push et back pour revenir en forme', 'Aller dans la jungle adverse'], g: 1, e: 'Rester bas en vie, c’est risquer de mourir ou de perdre la wave entière : back proprement.' },
        { q: 'Pourquoi viser un composant précis au back ?', o: ['Pour la couleur des items', 'Pour transformer l’or en vraie puissance tout de suite', 'Ça ne sert à rien'], g: 1, e: 'L’or dans la poche ne fait pas de dégâts : un composant clé te rend plus fort dès le retour.' }] },
    { id: 'eco2', th: 'eco', lv: 1, ico: '🌊', t: 'Gestion des waves',
      l: ['Slow push : tu tues seulement les sbires mêlée adverses ; ta wave grossit lentement.', 'Fast push : tu tues toute la wave vite pour la crash sous la tour adverse.', 'Freeze : tu gardes la wave juste devant ta tour, l’adversaire doit s’avancer pour farmer.'],
      q: [
        { q: 'Tu veux back dans 30 s avec l’avantage de wave. Tu fais…', o: ['Un slow push puis un crash', 'Un freeze', 'Rien de spécial'], g: 0, e: 'Le slow push construit une grosse wave qui reste chez l’adversaire pendant ton back.' },
        { q: 'Ton adversaire a son jungler au-dessus de lui. Quelle wave veux-tu ?', o: ['Une wave qui push chez lui', 'Un freeze près de ta tour', 'Une wave au milieu'], g: 1, e: 'Le freeze près de ta tour le force à venir dans ton côté, où ton jungler peut punir.' },
        { q: 'Quand casser un freeze adverse ?', o: ['Jamais', 'Quand tu peux tuer la wave vite ou avec ton jungler', 'Quand tu es bas en vie'], g: 1, e: 'Un freeze se casse avec de la pression : ton jungler, ou des dégâts de zone suffisants.' },
        { q: 'Combien de sbires mêlée adverses faut-il tuer pour un slow push ?', o: ['Tous', 'Seulement les mêlée, en laissant les distance', 'Aucun'], g: 1, e: 'Garder l’avantage de nombre fait grossir ta wave petit à petit.' }] },
    { id: 'eco3', th: 'eco', lv: 2, ico: '🌾', t: 'Le farm en mid-game',
      l: ['Après 14 min, les waves des side lanes rapportent plus que traîner au mid à 5.', 'Prends les camps de ta jungle qui sont sur ton chemin, sans voler le jungler à chaque fois.', 'Règle : un objectif dans 60 s = farm du côté de l’objectif, pas à l’opposé.'],
      q: [
        { q: 'Drake dans 50 s, une wave arrive top et une bot. Tu es mid. Tu vas…', o: ['Top', 'Bot', 'Rester mid à attendre'], g: 1, e: 'Bot est du côté du drake : tu farm et tu es déjà en place.' },
        { q: 'Ton équipe est groupée mid sans rien faire depuis 1 min. Mieux vaut…', o: ['Rester groupés', 'Envoyer quelqu’un attraper les waves sur les côtés', 'Back tous'], g: 1, e: 'Les waves qui s’écrasent sous tes tours sont de l’or et de l’XP perdus.' },
        { q: 'Le jungler allié est absent, ses camps sont prêts et toi tu n’as rien à faire. Tu…', o: ['Les laisses', 'En prends un sur ton chemin et préviens-le', 'Prends toute sa jungle'], g: 1, e: 'Un camp sur ton chemin, oui ; vider sa jungle sans prévenir le retarde.' },
        { q: 'Quelle source d’or est la plus fiable en mid-game ?', o: ['Les kills', 'Les waves de sbires', 'Les assists'], g: 1, e: 'Une wave vaut environ un kill et elle revient toutes les 30 secondes.' }] },
    { id: 'eco4', th: 'eco', lv: 3, ico: '🧮', t: 'Optimisation de l’économie',
      l: ['Pense en « tempo » : chaque déplacement doit ramasser de l’or ou créer une pression.', 'Proxy farm : farmer entre les tours adverses, possible seulement si tu connais la position des ennemis.', 'Avant de forcer un objectif, compare le prix de ce que tu perds (waves, camps) à ce que tu gagnes.'],
      q: [
        { q: 'Tu as 1 100 golds et ton spike (2e item) coûte 1 200. Drake dans 40 s. Tu…', o: ['Back maintenant', 'Farms 1 wave puis back et reviens pour le drake', 'Ignores le drake'], g: 1, e: 'Une wave te donne le spike ; tu reviens au drake plus fort.' },
        { q: 'Quand le proxy farm est-il une bonne idée ?', o: ['Quand les 5 adversaires sont visibles de l’autre côté', 'Toujours', 'Quand tu es bas en vie'], g: 0, e: 'Sans info, le proxy farm est une mort assurée. Avec 5 ennemis visibles, c’est de l’or gratuit.' },
        { q: 'Échanger un drake contre une tour + 2 waves, c’est…', o: ['Toujours perdant', 'Souvent rentable selon le drake et le moment', 'Interdit'], g: 1, e: 'Une tour et des waves peuvent valoir plus qu’un drake qui n’est pas la soul.' },
        { q: 'En fin de partie (35 min+), le plus important est…', o: ['Farmer tous les camps', 'Ne pas mourir seul et jouer les objectifs', 'Prendre des kills'], g: 1, e: 'Les morts sont très longues : une mort isolée coûte souvent le Nashor ou la partie.' }] },
    // ---------------- Vision ----------------
    { id: 'vis1', th: 'vision', lv: 0, ico: '🔦', t: 'La vision early',
      l: ['Pose ta première ward avant 3 min, au moment où le jungler adverse peut arriver.', 'Le trinket se recharge : utilise-le, ne le garde pas plein.', 'Une ward dans la rivière protège mieux qu’une ward dans ton bush de lane.'],
      q: [
        { q: 'À quel moment la première ward de lane est la plus utile ?', o: ['À 1 min', 'Vers 2:45–3:15, quand le jungler a fini son premier tour', 'À 10 min'], g: 1, e: 'Le premier gank arrive souvent juste après le premier tour de jungle.' },
        { q: 'Ton trinket est à 2 charges. Que fais-tu ?', o: ['Tu le gardes pour plus tard', 'Tu en poses une maintenant', 'Tu le vends'], g: 1, e: 'Une charge pleine ne se recharge plus : chaque seconde à 2 charges est de la vision perdue.' },
        { q: 'Où ward pour voir le jungler arriver en bot lane ?', o: ['Dans ta fontaine', 'Dans la rivière ou le tri-bush', 'Dans ton propre bush de lane'], g: 1, e: 'La rivière et le tri-bush montrent le jungler avant qu’il soit sur toi.' },
        { q: 'Une Pink ward (pink ward) sert à…', o: ['Voir et désactiver les wards adverses', 'Soigner', 'Accélérer'], g: 0, e: 'Elle révèle et désactive les wards ennemies autour d’elle.' }] },
    { id: 'vis2', th: 'vision', lv: 1, ico: '🗺️', t: 'Placement de la vision',
      l: ['Ward là où l’ennemi va passer, pas là où il est déjà.', 'Côté gagnant : wards profondes dans la jungle adverse. Côté perdant : wards défensives près de tes tours.', 'Avant un objectif, la vision se pose 60 à 90 s avant.'],
      q: [
        { q: 'Tu es en avance et tu domines ta lane. Tes wards vont…', o: ['Près de ta tour', 'Plus profond dans la jungle adverse', 'Dans ta base'], g: 1, e: 'En avance, tu cherches l’info offensive : où est le jungler adverse.' },
        { q: 'Combien de temps avant un drake faut-il poser la vision ?', o: ['5 s avant', '60 à 90 s avant', 'Après le drake'], g: 1, e: 'La vision qu’on pose trop tard se fait chasser ou ne sert pas.' },
        { q: 'Tu es derrière en lane. Où ward ?', o: ['Dans la jungle adverse profonde', 'Près de ta tour et sur les chemins vers toi', 'Nulle part'], g: 1, e: 'Derrière, tu te protèges : vision défensive sur les chemins de gank.' },
        { q: 'Une bonne ward, c’est surtout…', o: ['Une ward dans un endroit original', 'Une ward là où l’ennemi va passer bientôt', 'Une ward bien cachée dans ta base'], g: 1, e: 'La vision sert à prévoir, pas à constater.' }] },
    { id: 'vis3', th: 'vision', lv: 2, ico: '🕳️', t: 'Contester la vision',
      l: ['Avant un objectif, nettoie les wards adverses avec Pink et Oracle (trinket rouge).', 'Entre en groupe dans la zone sombre : seul, tu te fais attraper.', 'Le contrôle de vision gagne les objectifs avant même le fight.'],
      q: [
        { q: 'Nashor dans 1 min, l’ennemi a de la vision autour. Que faire en premier ?', o: ['Taper le Nashor', 'Nettoyer la vision à plusieurs, Pink et Oracle', 'Rentrer'], g: 1, e: 'Sans leur vision, ils ne savent pas quand vous commencez le Nashor.' },
        { q: 'Pourquoi ne pas aller nettoyer seul ?', o: ['C’est long', 'Les zones sans vision sont là où l’ennemi attend', 'Ça ne rapporte rien'], g: 1, e: 'Un support seul dans le noir = pick-off gratuit pour l’ennemi.' },
        { q: 'L’item ou le trinket pour détruire les wards en zone, c’est…', o: ['Ward de contrôle et Oracle', 'Lame de Doran', 'Bottes'], g: 0, e: 'Pink ward + Oracle (trinket rouge) révèlent et détruisent les wards.' },
        { q: 'Ton équipe a 3 wards autour du drake, eux 0. Le fight au drake est…', o: ['Égal', 'Favorable pour toi', 'Défavorable'], g: 1, e: 'Tu les vois arriver, eux non : tu choisis le moment.' }] },
    { id: 'vis4', th: 'vision', lv: 3, ico: '🧿', t: 'Vision profonde et pièges',
      l: ['Une ward profonde dans la jungle adverse annonce leurs rotations 10 s à l’avance.', 'Piège de vision : laisser une zone volontairement sombre où ton équipe attend.', 'Au niveau pro, la vision se joue en waves : « on prend ce quadrant, puis le suivant ».'],
      q: [
        { q: 'Tu veux surprendre l’ennemi qui va au Herald. Tu…', o: ['Mets 5 wards au Herald', 'Retires ta vision visible et attends dans un bush sombre', 'Rentres'], g: 1, e: 'Le piège marche quand l’ennemi croit être seul.' },
        { q: 'Ward profonde au buff adverse : à quoi sert-elle surtout ?', o: ['À voler le buff', 'À savoir où le jungler adverse commence et passe', 'À rien'], g: 1, e: 'Elle te donne son chemin et donc où il ne peut pas être.' },
        { q: 'En pro, « avancer la vision » veut dire…', o: ['Poser toutes les wards au même endroit', 'Prendre un quadrant de la carte à la fois, en groupe', 'Ne plus ward'], g: 1, e: 'On sécurise une zone, on la ward, puis on avance.' },
        { q: 'Ton support a 4 min de jeu sans poser de ward. C’est…', o: ['Normal', 'Une perte d’info importante', 'Mieux pour économiser'], g: 1, e: 'Le trinket et les charges de l’item support doivent toujours tourner.' }] },
    // ---------------- Déplacements ----------------
    { id: 'mov1', th: 'move', lv: 0, ico: '🧭', t: 'Lire la mini-carte',
      l: ['Regarde la mini-carte toutes les 3 à 5 secondes.', 'Un ennemi qui disparaît de sa lane est une menace : préviens (ping « disparu »).', 'Compte les ennemis visibles : 5 visibles = tu peux jouer agressif ailleurs.'],
      q: [
        { q: 'Le mid adverse disparaît. Que fais-tu en bot ?', o: ['Rien', 'Je recule et je ping', 'Je push sous sa tour'], g: 1, e: 'Il peut venir te voir : recule et préviens.' },
        { q: 'Les 5 adversaires sont visibles en top. Tu es bot, tu peux…', o: ['Jouer agressif ou prendre une tour', 'Rester sous ta tour', 'Aller top seul'], g: 0, e: 'Personne ne peut venir : c’est le moment d’en profiter.' },
        { q: 'À quelle fréquence regarder la mini-carte ?', o: ['Une fois par minute', 'Toutes les 3 à 5 s', 'Jamais pendant un fight'], g: 1, e: 'Plus tu la regardes, moins tu te fais surprendre.' },
        { q: 'Le ping « Disparu » sert à…', o: ['Insulter', 'Prévenir qu’un ennemi n’est plus visible', 'Demander de l’aide'], g: 1, e: 'Il évite des morts : ton coéquipier sait qu’il doit faire attention.' }] },
    { id: 'mov2', th: 'move', lv: 1, ico: '🔁', t: 'Roams et rotations',
      l: ['Avant de roam, push ta wave : sinon tu perds tes sbires et ta tour prend des dégâts.', 'Un roam réussi = kill, flash, objectif ou vision. Sinon, retourne vite en lane.', 'Le meilleur roam suit la vision : va où l’ennemi est visible et faible.'],
      q: [
        { q: 'Tu veux roam bot depuis le mid. Première étape ?', o: ['Partir tout de suite', 'Push ta wave', 'Acheter des wards'], g: 1, e: 'Wave push = tu ne perds rien pendant ton absence.' },
        { q: 'Ton roam rate : pas de kill. Tu…', o: ['Restes bot quand même', 'Prends un avantage (vision, drake ?) ou back en lane', 'Vas top'], g: 1, e: 'Un roam sans résultat ne doit pas coûter une 2e wave.' },
        { q: 'Le jungler allié est top. Ton roam idéal est…', o: ['Du même côté pour jouer à 2', 'De l’autre côté seul', 'Aucun'], g: 0, e: 'Jouer à 2 du même côté crée un vrai avantage numérique.' },
        { q: 'Quand NE PAS roam ?', o: ['Quand ta wave est sous ta tour et va s’écraser', 'Quand ta wave push chez l’adversaire', 'Quand le jungler allié t’appelle'], g: 0, e: 'Tu perdrais une wave entière et des PV de tour.' }] },
    { id: 'mov3', th: 'move', lv: 2, ico: '↔️', t: 'Crossmap et splitpush',
      l: ['Crossmap : si l’ennemi joue un objectif d’un côté, prends quelque chose de l’autre.', 'Splitpush : un joueur fort en 1v1 push un côté pendant que l’équipe tient le milieu.', 'Le splitpusher doit toujours savoir où sont les 5 ennemis.'],
      q: [
        { q: 'L’ennemi commence le drake, vous ne pouvez pas le contester. Vous…', o: ['Allez quand même au drake', 'Prenez le Herald, une tour ou des camps de l’autre côté', 'Restez base'], g: 1, e: 'Le crossmap transforme une perte en échange.' },
        { q: 'Qui doit splitpush ?', o: ['Le support', 'Un champion fort en 1v1 qui push vite', 'Le moins bien stuff'], g: 1, e: 'Il doit gagner ou survivre au 1v1 et forcer l’ennemi à répondre.' },
        { q: 'Tu splitpush top, 3 ennemis manquent de la carte. Tu…', o: ['Continues sous leur tour', 'Recules : ils viennent sûrement pour toi', 'Vas au Nashor seul'], g: 1, e: '3 ennemis invisibles = danger immédiat pour le splitpusher.' },
        { q: 'Pendant le split, que fait le reste de l’équipe ?', o: ['Force un 4v5 au milieu', 'Tient le milieu sans combattre à désavantage', 'Back en base'], g: 1, e: 'Ils créent de la pression sans prendre un fight perdant.' }] },
    { id: 'mov4', th: 'move', lv: 3, ico: '⏱️', t: 'Le tempo',
      l: ['Le tempo, c’est avoir l’avance de temps : arriver avant l’ennemi sur la prochaine action.', 'Après un fight gagné, enchaîne : objectif, tour, ou vision profonde, puis back ensemble.', 'Chaque déplacement doit préparer le suivant (wave → objectif → back).'],
      q: [
        { q: 'Vous gagnez un fight 3 contre 0 au mid à 22 min. Meilleure suite ?', o: ['Back tout de suite', 'Nashor ou tour avant que les ennemis respawn', 'Farmer chacun de son côté'], g: 1, e: 'Les morts ennemies sont ton temps d’avance : convertis-le en objectif.' },
        { q: 'Avoir le tempo, c’est…', o: ['Avoir plus de kills', 'Être en place avant l’ennemi pour la prochaine action', 'Jouer vite des mains'], g: 1, e: 'Arriver en premier = choisir où et quand on se bat.' },
        { q: 'Drake dans 90 s. Ordre idéal ?', o: ['Back, puis wave bot, puis vision au drake', 'Vision au drake tout de suite sans back', 'Attendre au drake 90 s'], g: 0, e: 'Tu arrives plein, avec ta wave push et la vision au bon moment.' },
        { q: 'Un pro perd rarement du tempo parce qu’il…', o: ['Back toujours au bon moment', 'Ne back jamais', 'Joue seul'], g: 0, e: 'Les backs synchronisés avec les waves et les objectifs gardent l’avance.' }] },
    // ---------------- Combat ----------------
    { id: 'cmb1', th: 'combat', lv: 0, ico: '🗡️', t: 'Les trades',
      l: ['Trade quand l’adversaire tape un sbire ou que ses sorts clés sont en recharge.', 'Un bon trade : tu fais plus de dégâts que tu en prends, puis tu recules.', 'Attention à la wave : trade quand TA wave est plus grosse.'],
      q: [
        { q: 'Le meilleur moment pour taper l’adversaire en lane ?', o: ['Quand il last-hit un sbire', 'Quand il est plein de vie et attentif', 'Quand sa wave est plus grosse'], g: 0, e: 'Il ne peut pas faire les deux : last-hit ou te répondre.' },
        { q: 'Son sort d’engage est en recharge (10 s). Tu…', o: ['Recules', 'Trade maintenant', 'Rentres'], g: 1, e: 'Sans son sort clé, il ne peut pas te punir correctement.' },
        { q: 'Sa wave est 2 fois plus grosse que la tienne. Trader est…', o: ['Une bonne idée', 'Risqué : ses sbires te tapent', 'Sans importance'], g: 1, e: 'Les sbires font beaucoup de dégâts en début de partie.' },
        { q: 'Après un trade gagnant, tu…', o: ['Restes au contact', 'Recules et laisses ta passive/régen jouer', 'Pousses sous sa tour'], g: 1, e: 'Un trade court et propre ; le all-in se décide à part.' }] },
    { id: 'cmb2', th: 'combat', lv: 1, ico: '🎯', t: 'Priorité des cibles',
      l: ['Tape la cible la plus proche que tu peux tuer sans te mettre en danger.', 'Les carrys (ADC, mages) font les dégâts : ils sont la priorité si tu peux y arriver en sécurité.', 'Un ADC tape ce qui est à portée : rester en vie compte plus que dive sur leur ADC.'],
      q: [
        { q: 'Tu es ADC. Le tank ennemi est devant, leur ADC derrière. Tu…', o: ['Plonges sur leur ADC', 'Tapes le plus proche en restant en sécurité', 'Recules sans taper'], g: 1, e: 'Un ADC mort ne fait aucun dégât : tape ce qui est à portée.' },
        { q: 'Tu es assassin. Ta cible idéale ?', o: ['Le tank', 'Leur carry isolé ou mal placé', 'Le premier qui passe'], g: 1, e: 'Ton rôle : retirer un carry du fight.' },
        { q: 'Un ennemi est à 10 % de vie mais derrière 3 alliés à lui. Tu…', o: ['Le poursuis', 'Restes avec ton équipe et tapes ce qui est proche', 'Utilises tout sur lui'], g: 1, e: 'Le chasser à travers son équipe, c’est mourir pour un kill.' },
        { q: 'Pourquoi focus la même cible à plusieurs ?', o: ['Pour la tuer vite et jouer en surnombre', 'Ça n’a pas d’intérêt', 'Pour partager l’or'], g: 0, e: 'Un 5v4 rapide gagne presque toujours le fight.' }] },
    { id: 'cmb3', th: 'combat', lv: 2, ico: '🛡️', t: 'Le teamfight',
      l: ['Avant le fight : qui engage ? sur qui ? Les ults sont-ils prêts ?', 'Les frontlines entrent, les carrys suivent à leur portée maximale.', 'Ne pas commencer un fight sans vision ou en sous-nombre.'],
      q: [
        { q: 'Votre engage (Malphite) n’a pas son ult. Vous…', o: ['Forcez quand même', 'Attendez qu’il revienne ou jouez autour d’une autre menace', 'Abandonnez la partie'], g: 1, e: 'Sans votre engage, vous perdez votre plan de fight principal.' },
        { q: 'Où se place un carry pendant un teamfight ?', o: ['Devant le tank', 'À sa portée maximale, derrière la frontline', 'Loin, hors du fight'], g: 1, e: 'Assez proche pour taper, assez loin pour ne pas se faire engager.' },
        { q: 'Un allié meurt avant le fight (5v4 contre vous). Vous…', o: ['Engagez quand même', 'Reculez et cédez l’objectif si besoin', 'Allez au Nashor'], g: 1, e: 'Combattre en sous-nombre est presque toujours perdant.' },
        { q: 'Qui doit engager le fight ?', o: ['N’importe qui', 'Le champion fait pour ça, au moment convenu', 'Toujours le support'], g: 1, e: 'Un engage préparé met toute l’équipe dans le fight en même temps.' }] },
    { id: 'cmb4', th: 'combat', lv: 3, ico: '🔥', t: 'Forcer un fight',
      l: ['On force un fight quand on a un avantage concret : surnombre, spike d’item, ults en plus, vision.', 'Compte les sorts invocateurs adverses : sans Flash, un carry est une cible.', 'Les pros forcent autour d’un objectif pour obliger l’adversaire à venir.'],
      q: [
        { q: 'Leur ADC n’a pas Flash pendant 3 min. Vous…', o: ['L’ignorez', 'Cherchez un engage sur lui', 'Attendez qu’il revienne'], g: 1, e: 'Sans Flash, il ne peut pas esquiver votre engage.' },
        { q: 'Votre équipe vient de finir 2 items clés, eux non. Bon moment pour…', o: ['Jouer passif', 'Forcer un objectif et le fight qui va avec', 'Farmer seul'], g: 1, e: 'Un spike d’items est un avantage temporaire : utilise-le.' },
        { q: 'Comment obliger l’ennemi à se battre là où tu veux ?', o: ['En commençant un objectif qu’il ne peut pas laisser', 'En restant en base', 'En splitpush à 5'], g: 0, e: 'L’objectif est l’appât : l’ennemi doit venir sur ton terrain.' },
        { q: 'Avant de forcer, tu vérifies d’abord…', o: ['Ton nombre de kills', 'Ults, sorts invocateurs et vision', 'L’heure'], g: 1, e: 'Ce sont eux qui décident vraiment du fight.' }] },
    // ---------------- État de la partie ----------------
    { id: 'st1', th: 'state', lv: 0, ico: '📊', t: 'Qui est en avance ?',
      l: ['Regarde l’or (Tab), pas seulement les kills.', 'Les tours, drakes et le Herald comptent autant que les kills.', 'Sache si tu es en avance ou en retard avant de choisir quoi faire.'],
      q: [
        { q: 'Le meilleur indicateur d’avance, c’est…', o: ['Le nombre de kills', 'La différence d’or et d’objectifs', 'Le nombre de morts du support'], g: 1, e: 'L’or traduit tout : sbires, tours, kills, objectifs.' },
        { q: 'Vous avez 3 kills de retard mais 2 tours et 2 drakes d’avance. Vous êtes…', o: ['Derrière', 'Probablement devant', 'À égalité'], g: 1, e: 'Les tours et drakes valent souvent plus que quelques kills.' },
        { q: 'Pourquoi savoir qui est en avance ?', o: ['Pour flame', 'Pour choisir de jouer agressif ou prudent', 'Ça ne sert à rien'], g: 1, e: 'Le plan change selon que tu es devant ou derrière.' },
        { q: 'Où voir rapidement l’état de la partie ?', o: ['Dans le tableau (Tab)', 'Dans la boutique', 'Dans le chat'], g: 0, e: 'Tab montre les items, les KDA et, avec l’habitude, la différence d’or.' }] },
    { id: 'st2', th: 'state', lv: 1, ico: '⚡', t: 'Les power spikes',
      l: ['Niveau 6 (ult), 2 items, niveau 11 et 16 : des moments où un champion devient bien plus fort.', 'Joue agressif quand tu atteins ton spike avant l’adversaire.', 'Respecte le spike adverse : un niveau 6 ennemi change la lane.'],
      q: [
        { q: 'Tu passes niveau 6 avant ton adversaire. Tu…', o: ['Joues prudent', 'Cherches à utiliser cet avantage', 'Rentres'], g: 1, e: 'Ton ult contre lui sans le sien : c’est ta fenêtre.' },
        { q: 'L’adversaire vient de finir son 2e item. Tu…', o: ['Le respectes plus', 'L’engages tout de suite', 'Ignores'], g: 0, e: 'Il vient de gagner beaucoup de puissance d’un coup.' },
        { q: 'Les grands spikes de niveaux sont…', o: ['3, 7, 12', '6, 11, 16', '2, 4, 8'], g: 1, e: 'Les rangs de l’ult arrivent aux niveaux 6, 11 et 16.' },
        { q: 'Ton équipe est « late game » contre une équipe « early ». Ton plan ?', o: ['Forcer des fights tôt', 'Survivre, farmer et prendre ce qui est gratuit', 'Abandonner'], g: 1, e: 'Le temps joue pour toi : évite les fights qui les arrangent.' }] },
    { id: 'st3', th: 'state', lv: 2, ico: '🏆', t: 'Les conditions de victoire',
      l: ['Chaque composition a une manière de gagner : teamfight 5v5, pick, siège, splitpush, scaling.', 'Identifie la tienne ET celle de l’adversaire dès l’écran de chargement.', 'Joue pour ta condition, empêche la leur.'],
      q: [
        { q: 'Vous avez Jinx, Orianna, Malphite : votre condition de victoire est…', o: ['Le splitpush', 'Le teamfight 5v5', 'Les picks seuls'], g: 1, e: 'Engage de zone + dégâts de zone : vous voulez des fights groupés.' },
        { q: 'L’adversaire a un Fiora très forte en 1v1. Vous…', o: ['La laissez split librement', 'Gardez une réponse à elle et forcez des fights à 5', 'Allez tous la chercher'], g: 1, e: 'Empêcher leur condition (split) tout en jouant la vôtre (5v5).' },
        { q: 'Une compo « scaling » doit en early…', o: ['Forcer tous les fights', 'Éviter de prendre trop de retard', 'Rien faire'], g: 1, e: 'Elle gagne plus tard si elle ne s’est pas fait écraser tôt.' },
        { q: 'Quand réfléchir à la condition de victoire ?', o: ['À 30 min', 'Dès l’écran de chargement', 'Jamais'], g: 1, e: 'Plus tôt tu as le plan, plus tes décisions sont cohérentes.' }] },
    { id: 'st4', th: 'state', lv: 3, ico: '👑', t: 'Fermer une partie',
      l: ['Avec un gros avantage, ne cours pas après les kills : prends tours, inhibs, Nashor.', 'Un inhib tombé = super-sbires qui push pour toi pendant que tu fais autre chose.', 'Les parties se perdent en fin de partie par des morts inutiles : joue groupé et avec vision.'],
      q: [
        { q: 'Vous avez 8 000 golds d’avance. Meilleure suite ?', o: ['Chercher des kills dans leur jungle', 'Nashor puis siège d’une lane avec la vision', 'Farmer'], g: 1, e: 'Le Nashor convertit l’avance en tours ; les kills ne cassent pas le nexus.' },
        { q: 'Pourquoi prendre un inhib avant de dive le nexus ?', o: ['Pour les points', 'Les super-sbires mettent une pression constante', 'Ça ne sert à rien'], g: 1, e: 'Les super-sbires forcent l’ennemi à défendre pendant que vous gérez le reste.' },
        { q: 'À 40 min, un allié se fait attraper seul. Résultat probable ?', o: ['Rien de grave', 'Nashor ou Ancien pour l’ennemi, voire la partie', 'Un kill pour l’ennemi seulement'], g: 1, e: 'Les morts durent plus de 50 s : tout un objectif majeur se joue sans lui.' },
        { q: 'Comment un pro ferme une partie ?', o: ['En forçant à 5 au hasard', 'Pas à pas : vision, objectif, tour, back, recommencer', 'En splitpush à 5'], g: 1, e: 'Méthodique : chaque étape sécurisée avant la suivante.' }] },
  ];
  window.FIRE_PARCOURS = { THEMES, LEVELS, NODES: N };
})();
