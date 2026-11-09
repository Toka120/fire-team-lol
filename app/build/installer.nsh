; FIRE LoL : avant d'installer (ou de désinstaller), on ferme toute copie de FIRE encore ouverte,
; y compris celle cachée près de l'horloge. Sinon Windows bloque les anciens fichiers et l'installeur
; affiche « Échec de désinstallation des anciens fichiers d'application ».
!macro fireCloseApp
  nsExec::Exec 'taskkill /im "FIRE LoL.exe" /t'
  Sleep 800
  nsExec::Exec 'taskkill /f /im "FIRE LoL.exe" /t'
  Sleep 1200
!macroend

!macro customInit
  !insertmacro fireCloseApp
!macroend

!macro customUnInit
  !insertmacro fireCloseApp
!macroend
