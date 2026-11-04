# 🔥 FIRE LoL

L'application de l'équipe FIRE LoL : les stats de chaque joueur, relevées sur [dpm.lol](https://dpm.lol). Les stats se consultent uniquement dans l'application, avec le code d'équipe.

Page de téléchargement : **https://toka120.github.io/fire-team-lol/**

## L'application FIRE LoL (Windows)

**[⬇ Télécharger FIRE LoL](https://github.com/Toka120/fire-team-lol/releases/latest/download/FIRE-LoL-Setup.exe)** (installation + raccourci sur le Bureau), ou la **[version portable](https://github.com/Toka120/fire-team-lol/releases/latest/download/FIRE-LoL-Portable.exe)** (sans installation).

- Au premier lancement, l'écran **ENTRER LE CODE** demande le code d'équipe donné par le coach. Il n'est demandé qu'une fois par ordinateur.
- À chaque ouverture, puis toutes les 10 minutes, l'application relit les stats de chaque joueur sur dpm.lol (classé Solo/Duo).
- Accueil : une carte par joueur avec son win rate et sa progression vers l'objectif du coach (games sur le pool imposé).
- Page joueur : résumé avec repères, points forts et points à travailler, jour par jour avec chaque game en détail, champions et objectif, lexique.
- Windows peut afficher « Windows a protégé votre ordinateur » (application non signée) : clique sur **Informations complémentaires** puis **Exécuter quand même**.

L'application est compilée automatiquement par GitHub Actions à chaque modification du dossier `app/`, et publiée dans les Releases sous la version indiquée dans `app/package.json`.

### Changer les joueurs, l'objectif ou le code

Tout est dans [`joueurs.json`](joueurs.json), relu par l'application à chaque lancement : pas besoin de réinstaller.
- `objectif` : date de début (`debut`) et nombre de games (`games`) sur le pool.
- `joueurs` : rôle, pseudo, lien dpm.lol (`slug`) et champions du pool (`pool_ids`, noms dpm.lol sans espace, ex. `MissFortune`).
- `code_sha256` : l'empreinte du code d'accès (le code lui-même n'est jamais stocké ici). Changer cette valeur redemande le code à tout le monde.

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
