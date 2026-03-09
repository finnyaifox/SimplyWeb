@echo off
TITLE SimplyWeb Localhost Launcher
echo.
echo ==========================================
echo   SimplyWeb Localhost wird gestartet...
echo ==========================================
echo.

:: 1. Sicherstellen, dass wir im richtigen Verzeichnis sind (wo die .bat liegt)
cd /d "%~dp0"

:: 2. Prüfen, ob node_modules existiert
if not exist "node_modules\" (
    echo [INFO] node_modules nicht gefunden. Installation wird gestartet...
    echo Dies kann einige Minuten dauern.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Fehler bei npm install. Bitte prüfen Sie die Ausgabe.
        pause
        exit /b %ERRORLEVEL%
    )
    echo [SUCCESS] Installation abgeschlossen.
) else (
    echo [INFO] node_modules gefunden. Überspringe Installation.
)

:: 3. Web-Server starten
echo.
echo Starte Expo Web Server...
echo.
call npm run web

:: 4. Falls der Server abstürzt, Fenster offen lassen
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Der Server wurde unerwartet beendet.
    pause
)
