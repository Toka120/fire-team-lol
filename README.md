# 🔥 FIRE LoL

L'application de l'équipe FIRE LoL : les stats de chaque joueur, relevées sur [dpm.lol](https://dpm.lol). Les stats se consultent uniquement dans l'application, avec le code d'équipe.

Page de téléchargement : **https://toka120.github.io/fire-team-lol/**

## L'application FIRE LoL (Windows)

**[⬇ Télécharger FIRE LoL](https://github.com/Toka120/fire-team-lol/releases/latest/download/FIRE-LoL-Setup.exe)** (installation + raccourci sur le Bureau), ou la **[version portable](https://github.com/Toka120/fire-team-lol/releases/latest/download/FIRE-LoL-Portable.exe)** (sans installation).

- Au premier lancement, l'écran **ENTRER LE CODE** demande le code d'équipe donné par le coach. Il n'est demandé qu'une fois par ordinateur.
- À chaque ouverture, puis toutes les 10 minutes, l'application relit les stats de chaque joueur sur dpm.lol (classé Solo/Duo).
- Accueil : une carte par joueur avec son win rate et sa progression vers l'objectif du coach (games sur le pool imposé).
- Page joueur : résumé avec repères, points forts et points à travailler, jour par jour avec chaque game en détail, champions et objectif, lexique.
- **📚 Lanes et principes** : 12 thèmes (bases, wave, lanes top/mid/bot, jungle, fights, concéder, vision avec wards défensives et offensives, objectifs, recall, mental), avec des schémas. Le contenu est dans [`guides.json`](guides.json), relu à chaque lancement ; il est généré par `python3 tools/build_guides.py` à partir de `tools/contenu.py` et `tools/schemas.py`.
- **🧙 POOL** : chaque semaine, une tierlist par joueur en deux lignes : **🎯 OBLIGATOIRE** (les seuls champions comptés pour l'objectif de la semaine) et **⭐ MAÎTRISÉS** (un champion peut être dans les deux). Le coach crée les semaines (date, objectif, consigne) ; chaque joueur peut modifier sa propre tierlist (Paramètres → « Je suis »). L'application analyse chaque champion (obligatoires, maîtrisés, autres joués), montre les changements d'une semaine à l'autre et des alertes visuelles. Les tierlists sont chiffrées dans le dépôt de données `data_repo` (Toka120/fire-lol-data), où les joueurs écrivent avec un jeton d'équipe limité à ce dépôt (publié chiffré par le coach dans `coach/acces.json`).
- **📣 Parole du coach** : le coach (code coach à part) écrit un sujet, l'application cherche sur le web avec l'API Claude, rédige une fiche avec des schémas, puis la publie pour l'équipe. Il peut aussi publier un message simple, et ranger une fiche dans un thème des « Lanes et principes ».
  - Les fiches sont chiffrées (AES-256-GCM, clé tirée du code d'équipe) dans le dossier [`coach/`](coach) : seuls ceux qui ont le code peuvent les lire.
  - Les clés du coach (API Claude, jeton GitHub limité à ce dépôt avec Contents en lecture/écriture) restent sur son ordinateur, chiffrées par Windows.
- Windows peut afficher « Windows a protégé votre ordinateur » (application non signée) : clique sur **Informations complémentaires** puis **Exécuter quand même**.

L'application est compilée automatiquement par GitHub Actions à chaque modification du dossier `app/`, et publiée dans les Releases sous la version indiquée dans `app/package.json`.

### Changer les joueurs, l'objectif ou le code

Tout est dans [`joueurs.json`](joueurs.json), relu par l'application à chaque lancement : pas besoin de réinstaller.
- `objectif` : date de début (`debut`) et nombre de games (`games`) sur le pool.
- `joueurs` : rôle, pseudo, lien dpm.lol (`slug`) et champions du pool (`pool_ids`, noms dpm.lol sans espace, ex. `MissFortune`).
- `code_scrypt` et `coach_scrypt` : les empreintes (scrypt) du code d'équipe et du code coach. Les codes eux-mêmes ne sont jamais stockés ici.
- `fiches_salt` : sert à tirer la clé de chiffrement des fiches du coach. Le changer rend les anciennes fiches illisibles.
- `derniere_version` : affiche un bandeau « nouvelle version » dans les applications plus anciennes.

## Ancien lanceur

Le raccourci créé par l'ancien lanceur (`Installer FIRE LoL.bat`) ouvre maintenant la page de téléchargement. Pour le retirer, double-clique sur **Desinstaller FIRE LoL.bat**.

## Contenu du dépôt

| Fichier | Rôle |
|---|---|
| `index.html` | La page de téléchargement (publiée avec GitHub Pages) |
| `joueurs.json` | La configuration lue par l'application : joueurs, objectif, empreinte du code |
| `app/` | Le code de l'application Windows |
| `Installer FIRE LoL.bat` / `installer-windows.ps1` | Crée le raccourci sur le Bureau et dans le menu Démarrer |
| `Desinstaller FIRE LoL.bat` / `desinstaller-windows.ps1` | Retire le raccourci |
| `fire.ico`, `fire.png` | L'icône du lanceur |
