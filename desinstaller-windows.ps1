# FIRE LoL - retire le raccourci "FIRE LoL" du Bureau et du menu Demarrer, et son icone.

$Nom     = 'FIRE LoL'
$Dossier = Join-Path $env:LOCALAPPDATA 'FIRE-LoL'
$Cibles  = @(
    (Join-Path ([Environment]::GetFolderPath('Desktop')) "$Nom.url"),
    (Join-Path ([Environment]::GetFolderPath('Programs')) "$Nom.url")
)

foreach ($Cible in $Cibles) {
    if (Test-Path $Cible) {
        Remove-Item $Cible -Force
        Write-Host "  Supprime : $Cible"
    }
}
if (Test-Path $Dossier) {
    Remove-Item $Dossier -Recurse -Force
    Write-Host "  Supprime : $Dossier"
}
Write-Host ''
Write-Host '  FIRE LoL a ete retire de cet ordinateur.' -ForegroundColor DarkYellow
