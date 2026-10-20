; Tracker installer additions (electron-builder NSIS include)
; The installer unpacks the app in the TEMP folder before copying it into place.
; If that drive is nearly full the copy is cut short and Tracker can't start,
; so check first and stop with a clear message instead.
!include "FileFunc.nsh"

!macro customInit
  ; drive that holds %TEMP%, e.g. "C:\"
  StrCpy $R1 $TEMP 3
  ${DriveSpace} $R1 "/D=F /S=M" $R0
  ${If} $R0 < 700
    MessageBox MB_OK|MB_ICONEXCLAMATION "Tracker needs about 700 MB of free space on drive $R1 to install, but only $R0 MB is free.$\r$\n$\r$\nFree up some space on that drive and run the installer again. Your Tracker data is not affected."
    Quit
  ${EndIf}
!macroend
