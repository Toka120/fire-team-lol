# FIRE LoL - installe le raccourci "FIRE LoL" sur le Bureau (et dans le menu Demarrer).
# Aucun droit administrateur necessaire. Rien n'est installe a part un raccourci et son icone.

$ErrorActionPreference = 'Stop'

$Nom      = 'FIRE LoL'
$Url      = 'https://toka120.github.io/fire-team-lol/'
$IconeUrl = 'https://toka120.github.io/fire-team-lol/fire.ico'
$Dossier  = Join-Path $env:LOCALAPPDATA 'FIRE-LoL'
$Icone    = Join-Path $Dossier 'fire.ico'

Write-Host ''
Write-Host '  FIRE LoL - installation du lanceur' -ForegroundColor DarkYellow
Write-Host ''

# 1. Dossier de l'icone
New-Item -ItemType Directory -Force -Path $Dossier | Out-Null

# 2. Icone : copiee depuis le dossier du script si elle y est, sinon telechargee
$IconeLocale = if ($PSScriptRoot) { Join-Path $PSScriptRoot 'fire.ico' } else { $null }
if ($IconeLocale -and (Test-Path $IconeLocale)) {
    Copy-Item $IconeLocale $Icone -Force
} else {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $IconeUrl -OutFile $Icone -UseBasicParsing
}

# 3. Contenu du raccourci internet (.url)
$Contenu = @(
    '[InternetShortcut]'
    "URL=$Url"
    "IconFile=$Icone"
    'IconIndex=0'
) -join "`r`n"

# 4. Bureau (fonctionne aussi avec un Bureau synchronise par OneDrive) et menu Demarrer
$Bureau    = [Environment]::GetFolderPath('Desktop')
$Programmes = [Environment]::GetFolderPath('Programs')
$Cibles = @(
    (Join-Path $Bureau "$Nom.url"),
    (Join-Path $Programmes "$Nom.url")
)
foreach ($Cible in $Cibles) {
    Set-Content -Path $Cible -Value $Contenu -Encoding ASCII
    Write-Host "  Raccourci cree : $Cible" -ForegroundColor Green
}

Write-Host ''
Write-Host '  C''est pret ! Double-clique sur "FIRE LoL" sur ton Bureau.' -ForegroundColor DarkYellow
Write-Host '  Ouverture de la page maintenant...'
Write-Host ''
Start-Process $Url
