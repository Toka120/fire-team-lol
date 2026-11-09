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

; Si l'ancienne version refuse de se désinstaller (fichier encore bloqué par Windows, antivirus, dossier
; temporaire sur un autre disque…), on ne montre plus d'erreur : on referme FIRE, on supprime nous-mêmes
; les anciens fichiers du programme et l'installation continue. Les données des joueurs (AppData\Roaming)
; ne sont pas touchées.
!macro fireCleanOld
  ${if} $R0 != 0
    DetailPrint "Ancienne version de FIRE : nettoyage direct (code $R0)."
    !insertmacro fireCloseApp
    RMDir /r "$INSTDIR"
    ClearErrors
    StrCpy $R0 0
  ${endif}
!macroend

!macro customUnInstallCheck
  !insertmacro fireCleanOld
!macroend

!macro customUnInstallCheckCurrentUser
  !insertmacro fireCleanOld
!macroend

; Désinstalleur des prochaines versions : suppression directe, sans déplacer les fichiers dans le dossier
; temporaire (c'est ce déplacement qui échouait).
!macro customRemoveFiles
  RMDir /r "$INSTDIR"
!macroend
