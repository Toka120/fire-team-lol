# FIRE V2 — décisions finales avant implémentation

Complète fire-v2.css, icons.json et COMPOSANTS.md (lot 3), qui restent la référence. En cas de conflit, ce document prime sur eux. Les images ne servent que de référence de style.

## 1. Corrections du CSS

| Point | Décision |
|---|---|
| Thèmes | Sélecteurs sur les vrais identifiants de FIRE : pas d'attribut = FIRE, puis `bleu`, `rouge`, `vert`, `jaune`, `noir`, `gris`. Le choix déjà enregistré sur chaque PC est conservé. Valeurs hex du lot 3. |
| Liens visités | `a:visited` limité aux liens texte (mêmes exclusions que la règle des liens). Un bouton reste un bouton, même s'il est fait avec un lien. |
| Bouton Quitter | Fond rouge et **icône seule** (comme l'image). S'il porte un texte : texte couleur fond (#0B0D10), car le contraste de #F2F4F7 sur rouge est insuffisant. |
| Contour de parole | `box-shadow: inset 0 0 0 2px var(--success)` à la place d'une bordure de 2 px : pas de décalage de la vidéo. |
| Badge EN DIRECT | Hérite de `.badge` (hauteur, marges, rayon), en rouge. |
| Barres de défilement | Seules les propriétés standard (`scrollbar-width`, `scrollbar-color`) sont gardées : Electron 45 ignore les règles `::-webkit-scrollbar` quand elles sont présentes. |

## 2. Bandeaux des joueurs (données → style)

Le style suit le champ `bandeau.theme` de joueurs.json, pas le texte.

| Thème (données) | Ruban V2 | Icône |
|---|---|---|
| ruby | pilier #EF6A9D | Columns3 |
| fire | acharné #FF9D3D | Flame |
| gold | chef #F5A524 | Crown |
| star | étoile #579DFF | Star |
| emerald | progression #39C58A | TrendingUp |
| blade | irelia #63D8D5 | Gem |
| inconnu (futur bandeau) | neutre : surface 2, texte principal | Award |

Texte affiché = texte des données sans l'emoji de tête (retrait du seul premier emoji suivi d'une espace, jamais d'une regex globale). Les données restent intactes.

## 3. Indicateurs « en direct »

Tout ce qui est en cours en temps réel est **rouge** (`--danger` + fond teinté 12 %), jamais or : badge LIVE / EN JEU de Draft, EN DIRECT du vocal, compteur et lueur du bouton Vocal, bandeau global « en vocal ». Le point animé actuel devient un point fixe : aucune animation infinie.

## 4. Vocal

- **Petite barre d'appel** (en appel, sur une autre page) : en haut de la zone de contenu, sous la barre d'état, pleine largeur, hauteur 48 : salon, durée, micro, casque, Retour au salon, Quitter. Plus rien en bas à droite.
- **Toasts** : bas droite 24, seuls dans ce coin.
- **Bandeau global EN DIRECT** (coéquipiers en vocal) : même emplacement que la petite barre d'appel, quand on n'est pas en appel ; badge rouge + noms + bouton Rejoindre (secondaire).
- **Mode « un en grand »** : la source choisie occupe toute la largeur (16:9), les autres en rangée de vignettes de 160 px de large en dessous ; clic pour échanger. Mode grille = `.call-grid` (2 colonnes, 3 à partir de 5 sources).
- **Caméra en incrustation** (option existante) : coin bas droit de la source en grand, 20 % de sa largeur, rayon 8, bordure 1 px.
- **Contour vert du partage quand son propriétaire parle** (option existante, désactivée par défaut) : même contour intérieur vert 2 px que la parole.
- **Indicateur de qualité sur la vidéo** : badge neutre en haut à gauche (ex. « 1080p · 60 i/s »), Inter 12/16.
- **Menu clic droit** sur personne et sur stream : composant `.context-menu`, curseur de volume intégré au format `.slider`.

## 5. Planning

- **Grille de saisie** (0h–23h × 7 jours) : cellules hauteur 24, rayon 8, surface 2 ; cochée = or (c'est une sélection) ; jour courant = en-tête courant neutre ; heures de nuit (0h–7h) avec icône Moon dans l'en-tête de ligne, sans couleur.
- **Dispos des coachs** : mêmes créneaux que la fiche Créneau ; « demandé » ambre, « accepté » vert, « refusé » rouge ; plusieurs joueurs acceptés listés dans le créneau.
- **Note du jour** : badge ambre (c'est une consigne), texte en Inter 16/24/600.

## 6. Graphiques et petits éléments de stats

- **Série V/D** : pastilles 24×24, rayon 8, lettre V ou D en Inter 12/16/600 ; V vert, D rouge (fond teinté + texte de la couleur).
- **Barres de champions** : partie victoires verte, défaites rouge, piste surface 2, hauteur 16, rayon 8.
- **Anneaux de pourcentage** : 96 px (cartes d'équipe), 128 px (en-tête de profil) ; épaisseur 8 ; vert ≥ 50 %, rouge sinon ; chiffre Inter 20/28/700 au centre.
- **Compteur −10 / −1 / valeur / +1 / +10** : boutons secondaires de 40 ; moins en rouge, plus en vert (texte seulement) ; valeur Inter 16/24/700.

## 7. Détente

Cases d'indices du jeu Classique : pareil vert, en partie **ambre** (#E8C56A), différent rouge ; flèches ↑↓ en texte principal. Les emojis du jeu Emoji restent.

## 8. Écrans et éléments globaux

- **Écran du code d'équipe** : vrai logo 120 px, titre « FIRE LoL » en Cinzel, champ et bouton primaire ; carte centrée de 400 px.
- **Barre de mise à jour** : `.notice` en haut, niveau information (bord or si une action « Installer » est proposée, car c'est une action) ; jamais de date inventée.
- **Période** : à droite de l'en-tête de page des Stats (sélecteur `.select`), là où elle existe aujourd'hui.
- **« ← Équipe »** (et retours équivalents) : bouton discret avec ChevronLeft, au-dessus du titre de page.
- **Signaler un bug** : modale (480 max) avec zone de texte, captures collées en vignettes 112×64, bouton primaire Envoyer.
- **Contenus intégrés** (jeu Micro, carte du Lore) : carte sans padding, rayon 16, ratio 16:9, barre d'actions au-dessus (Recharger, Plein écran, Navigateur).
- **Patchs LoL** : deux colonnes, liste 320 px à gauche (cartes de patch), article à droite en Inter 14/24, images en rayon 16.
- **Détail de match e-sport** : côté bleu / rouge avec les couleurs de draft ; barres d'objectifs (tours, dragons…) bleu contre rouge.

## 9. Polices et icônes dans l'app

- Inter (400, 600, 700) et Cinzel (600) intégrées en fichiers locaux woff2 (licence OFL), aucun chargement en ligne.
- Icônes Lucide (version 1.72.0, vérifiée : les 149 noms existent) intégrées en SVG, résolues via icons.json et ses alias.

## 10. Déploiement

1. Aperçu V2 activable dans Paramètres (« Interface V2 — aperçu »), désactivé par défaut, réservé à toi au début.
2. Pages migrées par lots, une version par lot, avec vérification que tout élément de la V1 est présent.
3. Bascule par défaut pour l'équipe après ta validation ; l'ancienne interface reste désactivable quelque temps.
