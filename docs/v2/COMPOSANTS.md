# FIRE V2 — système final, lot 3

Ce fichier, fire-v2.css et icons.json constituent la référence normative. Les images illustrent le style ; elles ne fournissent pas les données et ne remplacent pas le code. Cette édition remplace les arbitrages et fiches du lot 2. Aucun changement n’est appliqué à l’application FIRE dans ce lot.

## A. Arbitrages définitifs

1. **Groupes de navigation** : ÉQUIPE, JEU, APPRENDRE, SOCIAL, Inter 12/16, graisse 600, espacement .08em, texte secondaire. Uniquement ces petits labels en capitales espacées. Treize destinations conservées, Patch notes et Paramètres en bas. Contenu central défilant ; navigation et son pied restent accessibles, avec défilement propre si la hauteur manque.
2. **Onglets** : boutons arrondis rectangulaires de rayon 8, bordure 1 px. Inactif surface 1, bordure discrète et texte secondaire ; actif bordure FIRE, fond FIRE teinté à 12 %, texte principal. Aucun soulignement ni fond or plein. Ce choix reprend la famille visuelle des images validées, tout en distinguant l’onglet de l’action primaire pleine. L’activation ne change pas la taille.
3. **Discussion** : réduite 208×48 px dans la barre latérale 240, à gauche 16 / bas 16. Entre 1280 et 1599 : 192×48 dans une barre 224. Sous 1280 : bouton 40×48 dans le rail 72, nom accessible et infobulle. Ouverte : 352 px de large, toujours gauche 16 / bas 16 ; en-tête 48, historique max 432 avec défilement. Elle recouvre volontairement le bord droit de la navigation et la gauche du contenu, sans reflow de la page. Z-index 30, au-dessus de la navigation 10 ; un panneau modal et son voile la recouvrent et la rendent inerte. Réserver 80 px au pied de la navigation pour ne pas masquer Paramètres. Réduire referme le panneau sans effacer la conversation.
4. **Courant** : aujourd’hui, Ta lane, mon créneau, moi. Fond surface 2, bordure 1 px texte secondaire, texte principal ; badge Inter 12/16/600, fond surface 2, texte et bordure secondaires. Pas d’or. Cet état décrit un contexte et ne prétend pas être une sélection. Si courant et sélectionné coexistent : conserver le badge et la bordure neutres, ajouter un contour extérieur or de 2 px. Les états réussite/erreur gardent leurs indicateurs vert/rouge.
5. **Rôles** : icônes neutres en currentColor partout. Aucune couleur propre par rôle. Le même Shield, Trees, Sparkles, Target ou HeartHandshake est utilisé sur cartes, planning, draft et appel. Les six couleurs de bandeaux sont la seule exception de catégorie.
6. **Or** : sélection, action primaire, progression en cours et focus clavier uniquement. Cote et VOS CHOIX = texte principal ; titres de jour = texte principal, y compris aujourd’hui. Côté bleu = bleu de draft ; côté rouge = rouge de draft. Ring pourcentage vert à partir de 50 %, rouge en dessous ; objectif atteint vert. Liens et labels neutres. Un interrupteur activé utilise l’or car il représente une option sélectionnée, pas un résultat réussi. Le sélecteur de thème montre les teintes qu’il permet réellement de sélectionner. Pas de lignes, titres ou icônes décoratifs en or.

## B. Tokens, thèmes, données, fenêtres et mouvement

### Typographie et palette

Inter pour toute l’interface ; Cinzel seulement le titre de page 32/40/600. Un titre de panneau ou de modale est en Inter 20/28/600. Section 20/28/600, carte 16/24/600, corps 14/24/400, petit texte 12/16/400, petit label 12/16/600, chiffre clé 40/48/700. Pseudos sans text-transform ni petites capitales. Nombres tabulaires. Jamais de texte essentiel inférieur à 12 px.

Texte principal #F2F4F7 ; secondaire #A2ADBC ; FIRE #F5A524 ; victoire #39C58A ; défaite #EF6670 ; attention #E8C56A ; côté bleu #579DFF ; côté rouge #EF6670. Bandeaux : pilier #EF6A9D, acharné #FF9D3D, chef #F5A524, étoile #579DFF, progression #39C58A, OTP Irelia #63D8D5. Ces six teintes sont des références V2, non une mesure des pixels V1 ; elles restent limitées à la bande de titre.

Grille 8 px : 8, 16, 24, 32, 48 ; rayons 8/16 uniquement. Ombre unique des surfaces flottantes : 0 8px 24px noir 24 %. Cartes ordinaires sans ombre. Voile modal noir 64 % ; illustrations réelles avec voile sombre seulement pour la lisibilité.

### Sept thèmes conservés

Le réglage existant change seulement bg, surface-1, surface-2, border. Texte, accent, sens, côtés draft, bandeaux, médias réels et états restent fixes. FIRE est la valeur par défaut pour une nouvelle installation ; ne jamais écraser le choix existant. Le stockage actuel sur cet ordinateur est conservé. Les swatches affichent la couleur bg réelle, pas un dégradé décoratif.

| Thème | Fond | Surface 1 | Surface 2 | Bordure |
|---|---|---|---|---|
| FIRE | #0B0D10 | #12161C | #1A2029 | #2A323D |
| Bleu | #0A101A | #111B2A | #1A293D | #30445F |
| Rouge | #150D10 | #21151A | #302027 | #49313B |
| Vert | #0B1310 | #121F1A | #1C2D26 | #30473C |
| Jaune | #141209 | #201D12 | #302B1C | #49412B |
| Noir | #050607 | #0D0F12 | #171A1F | #292E36 |
| Gris | #16181C | #20242A | #2B3038 | #414955 |

### Emojis : système et contenus humains

- Libellés système structurés (rubriques, rôles, bandeaux, tags, titres de jeux, catégories de patch) : icône canonique Lucide et texte sans l’emoji de présentation. La donnée stockée reste intacte. Faire le remplacement par identifiant connu et préfixe attendu, jamais en supprimant tous les emojis avec une expression régulière.
- Notes du coach, messages, titres et corps de fiches rédigés par des personnes, corps des patch notes : conserver intégralement le texte Unicode, emojis compris. Aucun emoji ajouté par le design.
- Catégories système des patch notes Nouveau/Amélioré/Corrigé/Contenu : Lucide ; le texte libre de l’entrée est intact.
- Jeu Emoji : les emojis constituent l’indice du jeu et restent visibles ; seule l’icône de navigation du jeu devient Smile. Pseudos avec symboles conservés tels quels. Un export ou une copie utilise le texte source, non une version appauvrie.

### Points de rupture — largeur intérieure de fenêtre en CSS px

| Largeur | Barre latérale | Marges page | Joueurs | Lanes | Créneaux | Games |
|---|---:|---:|---:|---:|---:|---:|
| ≥ 1800 | 240 | 32 | 5 | 5 | 6 | 3 |
| 1600–1799 | 240 | 32 | 4 | 4 | 5 | 3 |
| 1280–1599 | 224 | 24 | 3 | 3 | 4 | 2 |
| 1024–1279 | rail 72 | 24 | 3 | 3 | 4 | 2 |
| 768–1023 | rail 72 | 16 | 2 | 2 | 3 | 2 |
| < 768 | rail 72 | 16 | 1 | 1 | 2 | 1 |

À 1280, les 13 libellés restent visibles. En rail, ils sont masqués visuellement mais chaque entrée conserve son nom accessible, une infobulle au survol/focus et sa destination cliquable. Séparateurs de groupes et badges conservés ; aucune destination supprimée. Le profil conserve son avatar et un nom accessible. Les contenus passent à la ligne, aucune ellipse ni réduction de police. Tags et onglets se replient sur plusieurs lignes ; tableaux larges défilent horizontalement dans leur propre conteneur, avec toutes les colonnes. Une rangée incomplète conserve la même largeur de carte que les autres. Réorganiser les colonnes ne change pas l’ordre des données. Sous 1280, les autres salons passent sous la grille d’appel. Le panneau vocal reste 440 px, au maximum la largeur disponible ; sur une fenêtre étroite il couvre la page plutôt que réduire les champs. Aucune option déplacée sous un menu inventé.

### Mouvement

Survol/pressé/changement de couleur 120 ms ; ouverture et fermeture de panneau 180 ms (translation de 16 px maximum) ; apparition de page 160 ms en opacité seule ; pop-up/toast/menu/modale 160 ms, translation verticale 8 px maximum. Courbe unique cubic-bezier(.2,0,0,1). Pas de zoom, rebond, pulsation ni animation infinie décorative. Le contour de parole est instantané et ne pulse pas. Le code retire une surface après sa sortie et utilise le même délai pour l’entrée et la sortie ; les classes CSS fournissent les entrées, les transitions de sortie restent pilotées par le cycle de vie du composant.

Windows Réduire les animations est respecté via prefers-reduced-motion: reduce. Si le runtime expose la préférence native séparément, la répercuter sur data-reduce-motion=true. Désactiver animations, transitions et défilement fluide, sans supprimer l’indication de chargement textuelle ni changer la lecture normale des vidéos/sons. Aucun délai artificiel sur une action clavier ou le focus.

## C. États et fiches de composants

**États communs** : normal surface 1, texte principal ; survol d’un élément interactif surface 2 ; pressé contour intérieur sans déplacement ; sélection or ; courant neutre ; focus 2 px or à 2 px ; désactivé 40 %, visible, aucune activation ; erreur rouge avec texte et icône ; réussite vert avec texte et icône ; attente ambre. Les couleurs de sens priment sur la sélection pour le résultat, le focus reste un contour distinct. Les surfaces non interactives n’ont pas de faux survol. Les données absentes ne deviennent pas des zéros fictifs.

| Composant | Dimensions / espacements | Couleurs, typo, états |
|---|---|---|
| Carte | Largeur de colonne ; padding 24, gap 16/24, rayon 16 ; hauteur automatique. | Surface 1, bordure 1 ; titre Inter 16/24/600, corps 14/24. Survol/selection si interactive seulement ; courant neutre possible. |
| Carte de stat | Min 128 haut, min 160 large, padding 24, gap 8. | Label 12/16, chiffre 40/48/700 neutre ; ring vert ≥50 %, rouge sinon. Pas de survol pour la mesure statique. |
| Onglet | Min 40 haut, padding 8/16, gap 8, rayon 8. | Inter 14/24/600, icône 20 ; actif bordure or/fond or 12 %/texte principal. Jamais souligné ni rempli d’or pur. Focus/désactivé communs. |
| Bouton | Min 40 haut ; icône seul 40×40 ; padding 8/16, gap 8. | Inter 14/24/600. Primaire or/texte fond ; secondaire surface 2 ; discret transparent. Primaire survol voile clair 8 %. Quitter/refuser rouge si action sémantique. |
| Badge | Min 24 haut, padding 4/8, gap 8, rayon 8. | Inter 12/16/600 ; neutre ou vert/rouge/ambre selon sens. Badge courant neutre bordé. Couleur seule jamais suffisante. |
| Progression | Piste 8 haut, rayon 8, labels à 8 px ; largeur disponible. | Piste surface 2 ; or en cours, vert atteint. Valeurs et objectifs réels. Pas de faux survol. |
| Tableau | 100 %, cellule padding 16, ligne min 48 ; wrapper horizontal si besoin. | Inter 14/24 ; en-tête 12/16/600 ; chiffres tabulaires à droite ; séparateurs discrets ; ligne interactive survol surface 2 ; tous les champs conservés. |
| Carte joueur | Colonnes selon tableau ; bandeau min 32 haut ; corps padding 24, gap 16. | Skin réel assombri, bandeau seul teinté selon statut ; pseudo Inter 16/24/600, casse exacte. Progression et quatre boutons −10/−1/+1/+10 conservés. |
| Carte game | Min 248 haut, padding 24, gap 16 ; champion 40. | Bord gauche 2 vert/rouge, badge résultat ; score Inter 20/28/600, mesures 14/24. Chaque repère Check vert ou X rouge selon donnée. Courant neutre si moi. |
| Créneau | Min 40 haut libre, min 96 avec action ; padding 8/16, gap 8, rayon 8. | Heure Inter 14/24/600, état 12/16 ; libre neutre, demandé ambre, accepté vert/refusé rouge si ces états existent ; mon créneau courant neutre ; sélection or distincte. |
| Choix puzzle | Quatre cartes 2×2 ; min 128 haut, padding 24, gap 8 ; deux portraits 40. | Noms Inter 14/24/600 ; sélection or, correct vert/incorrect rouge ; éliminé 40 % et visible. Côtés bleu/rouge séparés des choix neutres. |
| Discussion | Réduite 208×48, ouverte 352, gauche/bas 16 ; voir arbitrage responsive. | Surface 1, bordure, ombre unique ; Inter 14/24 ; réduit/ouvert/non lus/envoi/échec. Aucun historique inventé. |
| Avatar / champion | 40×40 ou 64×64, rayon 8, image contenue dans cadre. | Assets source ; indicateurs réels uniquement. Profil absent : état vide existant, pas de pseudo inventé. |
| État vide | Padding 48/24, gap 16 ; contenu centré. | Inbox 20, Inter 14/24, texte secondaire et action existante seulement. |
| Champ texte | 100 %, min 40 haut, padding 8/16, rayon 8 ; label et aide séparés de 8. | Surface 2, bordure discrète, Inter 14/24 ; placeholder secondaire ; survol bordure secondaire ; focus or ; erreur bordure/aide rouges ; lecture seule surface 1 ; désactivé 40 %. |
| Zone de texte | Même champ, min 120 haut, redimensionnement vertical ; label/aide 8. | Même états ; texte libre et emojis préservés, retour ligne naturel. Pas de hauteur fixe qui coupe une note. |
| Sélecteur | Min 40 haut, padding 8/16, réserve 40 à droite pour ChevronDown 20. | Inter 14/24, surface 2 ; même états champ. Liste flottante surface 1, options min 40, actif or, scroll si nécessaire. Clavier, recherche ou groupes seulement si déjà prévus dans l’app. |
| Case à cocher | Contrôle 24×24 dans ligne cliquable min 40 ; rayon 8 ; gap label 8. | Fond surface 2, coché or avec Check couleur fond ; indéterminé Minus ; hover bordure secondaire ; erreur rouge ; focus/désactivé communs. Label associé. |
| Interrupteur | 48×24, thumb 18×18, padding 2/bordure 1 ; translation 24 ; ligne min 40. | Inactif surface 2/curseur secondaire ; actif or/curseur fond. Inter 14/24 label et 12/16 aide. role switch, aria-checked ; état réel conservé. |
| Curseur volume | Hitbox min 24 haut, piste 8, thumb 16 ; gap valeur 16 ; sortie min 48 large. | Remplissage or car valeur réglable, piste surface 2 ; valeur tabulaire 14/24 avec % ou dB source. Min/max/pas existants conservés (ex. 130 % n’est pas ramené à 100). Utiliser une sortie liée au range ; clavier Flèches/Home/End et valeurs accessibles. Une mesure audio seule est verte et n’est pas ce contrôle. |
| Sélecteur date | Champ 40 ; popover 320 large, padding 16 ; calendrier 7 colonnes, jours min 40. | Inter 14/24 ; aujourd’hui contour neutre, date sélectionnée contour or/fond teinté ; dates impossibles désactivées. Format français et fuseau de l’app conservés ; ne pas inventer des restrictions. |
| Pastille participant | Min 32 haut, padding 4/8, gap 8 ; multiligne si pseudo long. | Ordre statut + rôle + pseudo. Rôle neutre, seul statut vert/ambre/rouge/secondaire ; nom texte principal. Moi = courant neutre ; sélection distincte. Jamais raccourcir le pseudo stocké. |
| Tag lane | Min 32 haut, padding 4/8, rayon 8. | Surface 2, icône neutre + Inter 12/16 ; sélection or si filtre activable ; survol seulement si lien/commande. Ordre source conservé. |
| Tag Obligatoire / Maîtrisé | Même 32, padding 4/8. | Neutre : CircleDot + Obligatoire ou Badge + Maîtrisé. Pas de nouvelle couleur de catégorie ; les illustrations de champions restent réelles. |
| Infobulle | Max 320 large, padding 8/16, rayon 8. | Surface 2, Inter 12/16, ombre unique ; apparition après 400 ms au survol, immédiate au focus ; fermeture Escape/quitter la cible. Aucune action indispensable à l’intérieur, contenu accessible par description. |
| Notification haute | Top 16, gauche sidebar+32, droite 32 ; padding 16, gaps 16, rayon 16. | Surface 1, titre 16/24, texte 14/24 ; croix 40, Ouvrir → conservé. Sens via icône/bord gauche 2 ; pas de fermeture automatique si action attendue. Sur petit écran marges 16. |
| Toast | Bas droite 24, largeur max 384 ; pile gap 8 ; padding 16, rayon 16. | Surface 1, Inter 14/24, sens par icône/bord gauche. Routine 5 s, suspendre au survol/focus ; erreur/action persiste jusqu’à fermeture. Une seule annonce live polie, erreur urgente seulement si nécessaire. Aucun toast fictif dans les maquettes. |
| Modale Qui es-tu ? | Largeur 480 max fenêtre−32 ; max hauteur fenêtre−64, padding 24, gap 24. | Surface 1, titre Inter 20/28 ; voile noir 64 %, ombre ; close 40, actions gap 8. Focus capturé, arrière-plan inerte, retour au déclencheur ; Escape selon possibilité réelle d’annulation. |
| Panneau voix/vidéo | À droite 440 max100vw, toute hauteur ; en-tête min72 padding16/24 ; corps24, gap24, sections gap16. | Surface 1, bord gauche discret, titre Inter 20/28 ; scroll propre, en-tête fixe, fermeture X. Aucun réglage retiré sous le cadrage : défilement. Voile, focus capturé, Escape, retour au déclencheur. |
| Visionneuse | Plein écran ; toolbar64, scène flexible padding24, miniatures104 avec padding16/24, gap8. | Fond thème, texte Inter ; miniatures112×64 rayon8, sélection bord or. Ratio du média conservé. Précédent/suivant, plein écran/retour, fermeture, compteur réels ; navigation clavier, zoom seulement s’il existe. |
| Menu clic droit | 248 large, padding8, items min40, icône20, gap8, rayon8 ; position bornée à16 du bord. | Surface 1, Inter14/24, survol surface2 ; sélection effective or ; commandes indisponibles visibles à40 %. Ouvrable aussi par clavier/menu ⋯ existant ; flèches, Enter, Escape, retour focus. |
| Barre d’état globale | Min40, padding horizontal page, gap16 ; texte flexible et refresh40. | Inter12/16 secondaire ; date/heure exactes de la source. Chargement sans valeur fictive, erreur rouge textuelle et actualisation accessible. Seulement sur les écrans où elle existe. |
| Groupe nav / notification | Groupe titre12/16/600, marge bas8 ; entrées min40 ; badge min24×24 padding4/8 rayon8. | Label secondaire .08em ; badge rouge et compte/exclamation source. Rail : badge16×16 à droitehaut, nom accessible complet ; pas d’indication numérique inventée. |
| Défilement | Scrollbars8, thumb rayon8 ; zones séparées page/panneau/liste. | Piste surface1, thumb bordure, hover secondaire. Respecter le défilement natif et clavier ; ne pas masquer les barres pour l’esthétique. |
| Lien | Zone cliquable adaptée au contexte, texte Inter14/24 ; soulignement décalé3. | Texte principal, hover secondaire, focus or ; visité neutre. Pas d’or hors action primaire/sélection. URL/destination et libellé source conservés. |

## Interactions et intégration

Le CSS fournit le style ; le code fournit les données, attributs, SVG, événements et comportements accessibles. Il faut charger réellement Inter/Cinzel et Lucide, sans se fier aux formes approximatives des PNG. Résoudre les aliases de icons.json vers leurs entrées canoniques ; pour un même sens, toujours le même SVG. Les analogies Lucide pour Dragons, Barons ou Héraut sont des pictogrammes de catégorie, pas des illustrations officielles de monstres.

Composants contrôlés : calculer --slider-fill = (valeur−min)/(max−min)×100 %, conserver les bornes métier ; lier label, aide, erreur et contrôle ; ne pas activer un bouton aria-disabled ; placer le focus et maintenir l’ordre DOM. Checkbox : SVG Check ou Minus dans le wrapper .check-control. Sélecteur natif possible si adapté ; si custom, liste et gestion clavier complètes. Date native possible, popover custom si le calendrier doit suivre exactement cette charte.

Panneaux, modales et visionneuse : un gestionnaire de couches commun rend inertes les couches inférieures et conserve le focus. Z-index : sidebar10, discussion30, voile40, drawer50, modale60, viewer70, menu80, tooltip90, notification/toast100. Un seul overlay bloquant à la fois ; menu/infobulle d’un panneau se montent dans sa couche active. Une notification globale visible au-dessus d’un modal ne doit pas permettre de sortir de son focus sans fermeture du modal.

Les réordonnancements responsive ne retirent aucune donnée ni fonction. Conserver toutes les cases de Paramètres et toutes les commandes vocales, y compris hors des captures. N’appliquer les states disabled, current ou selected qu’à partir des données réelles. Boutons de thème : groupe radio accessible, label explicite, swatch bg, sélection or ; aucune nouvelle permission demandée pour changer un thème local.

### Vocal en appel — composition sans inventer de contenu

Grille caméras et partages côte à côte, ou source principale et autres sources conservées. Chaque tuile est liée à un utilisateur réel ; nom et états viennent de la session. Speaking = bord vert 2 px, seulement lorsque l’activité reçue l’indique ; ne jamais afficher simultanément speaking et micro coupé pour une même source. EN DIRECT rouge + texte. Commandes existantes seulement : micro, casque, caméra, partage, réglages, ⋯ inviter, quitter. Liste des salons avec occupants réels. Menu stream : Arrêter de regarder, Couper le son, Volume, Petite fenêtre, Atténuation, Demander le son. Un partage peut avoir du son même si le micro de son propriétaire est coupé : distinguer les états du stream et du micro.

Sans capture d’appel ni liste de participants fournie, la référence visuelle utilise seulement l’identité Toks42o déjà visible dans les captures et deux surfaces vidéo vides. Cette disposition démontre des composants, pas une vraie session. Les occupants des autres salons et le contenu vidéo ne sont pas inventés. Le code affichera leurs vraies données. Si un aspect de l’image contredit cette règle, cette spécification prévaut.

## D. Dictionnaire d’icônes

icons.json contient les 13 rubriques, 5 rôles, 6 bandeaux, 15 jeux Détente, 9 Micro, 5 séances, 7 objectifs/liens E-sport, commandes d’appel, catégories patch notes, 7 blocs Paramètres, contrôles et aliases. Tous les SVG utilisent strokeWidth1.75, taille20, fill none. Les données écrites librement et le jeu Emoji gardent leurs emojis ; cette règle ne s’applique pas aux assets de contenu.

Doublons de sens levés : Draft=Swords ; KDA=Ratio ; Gérer ses fights=ShieldAlert ; L’acharné=Flame ; Série=Repeat2 ; E-sport=Trophy ; Win rate=ChartPie. Un même sens réutilisé (par ex. micro actif et tester le micro) référence l’entrée canonique, il n’est pas un nouveau sens qui recevrait une autre icône. Annulation d’écho=Repeat, distinct de Listen=AudioLines.

## E. Références du lot 3 et limites

- 25 : panneau droit des réglages visibles, contexte vocal assombri. Les réglages vidéo et la suite du panneau hors capture ne sont pas reconstruits ; ils restent accessibles par défilement dans le code.
- 18 : deux rangées de jeux, série/records, carte Classique, champ et deux actions ; aucun résultat inventé.
- 38-1 : profil, version et sept thèmes ; Noir sélectionné comme la source. Les captures 38-2 et 38-3 ne sont pas fusionnées dans cette image.
- Vocal en appel : composition des seuls éléments listés ; surfaces vides et occupants inconnus non renseignés.

Les PNG sont générés avec imagegen, pas rendus depuis ce CSS. Logo exact, glyphes Lucide, polices, casse, tailles, hex et dimensions peuvent diverger ; les réserves détaillées sont livrées sous chaque image. Les corrections structurantes du lot 3 ont priorité sur les apparences encore imparfaites des références.

Rappels de données : 5C5 ; #Ionia ; −10 du coach ; maîtrisés ; Golds @15 de Rell = −141. Ne jamais reprendre des chiffres erronés d’un bitmap. Aucun élément du contenu métier n’est supprimé par la charte.
