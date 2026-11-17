; FIRE Launcher : on ferme le launcher encore ouvert avant d'installer ou de désinstaller (sinon fichiers bloqués).
!macro fireCloseLauncher
  nsExec::Exec 'taskkill /im "FIRE Launcher.exe" /t'
  Sleep 600
  nsExec::Exec 'taskkill /f /im "FIRE Launcher.exe" /t'
  Sleep 800
!macroend
!macro customInit
  !insertmacro fireCloseLauncher
!macroend
!macro customUnInit
  !insertmacro fireCloseLauncher
!macroend
