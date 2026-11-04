# 🔥 FIRE LoL

Le lanceur des tableaux de bord de l'équipe FIRE LoL. Il ajoute un raccourci **FIRE LoL** sur le Bureau de chaque joueur. En un double-clic, il ouvre la page de l'équipe, d'où chacun accède à son tableau de bord de stats (relevées sur [dpm.lol](https://dpm.lol)).

Page de l'équipe : **https://toka120.github.io/fire-team-lol/**

## Installer (Windows)

**Méthode 1 : en téléchargeant le dossier**

1. En haut de cette page, clique sur **Code** puis **Download ZIP**.
2. Fais un clic droit sur le fichier téléchargé, puis **Extraire tout**.
3. Dans le dossier extrait, double-clique sur **Installer FIRE LoL.bat**.
   Si Windows affiche « Windows a protégé votre ordinateur », clique sur **Informations complémentaires** puis **Exécuter quand même**.
4. Le raccourci **FIRE LoL** apparaît sur ton Bureau et dans le menu Démarrer, et la page s'ouvre.

**Méthode 2 : en une ligne**

Ouvre **PowerShell** (touche Windows, tape « PowerShell », Entrée), colle cette ligne puis appuie sur Entrée :

```powershell
irm https://toka120.github.io/fire-team-lol/installer-windows.ps1 | iex
```

Aucun droit administrateur n'est nécessaire. Le lanceur ne fait que créer un raccourci et copier son icône dans `%LOCALAPPDATA%\FIRE-LoL`.

## Désinstaller

Double-clique sur **Desinstaller FIRE LoL.bat** (dans le dossier téléchargé). Le raccourci et l'icône sont retirés.

## Accès aux tableaux de bord

Les tableaux de bord sont hébergés sur Claude et restent privés : chaque joueur doit d'abord y avoir été invité par le propriétaire. Si la page demande de se connecter, utilise le compte Claude avec lequel le tableau de bord t'a été partagé.

## Ajouter ou modifier un joueur

Tout se passe dans [`joueurs.json`](joueurs.json) : un bloc par rôle, avec le pseudo, le champion pool, le lien du tableau de bord et le lien dpm.lol. Une fois le fichier modifié sur GitHub, la page de l'équipe se met à jour pour tout le monde en une ou deux minutes. Les joueurs n'ont rien à réinstaller.

## Contenu du dépôt

| Fichier | Rôle |
|---|---|
| `index.html` | La page de l'équipe (publiée avec GitHub Pages) |
| `joueurs.json` | La liste des joueurs et de leurs liens |
| `Installer FIRE LoL.bat` / `installer-windows.ps1` | Crée le raccourci sur le Bureau et dans le menu Démarrer |
| `Desinstaller FIRE LoL.bat` / `desinstaller-windows.ps1` | Retire le raccourci |
| `fire.ico`, `fire.png` | L'icône du lanceur |
