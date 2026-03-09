# Analyse und Implementierungsplan für StartLocalhost.bat

## 1. Analyse der Projektstruktur
Die Prüfung des Projektordners `SimplyWeb` hat ergeben, dass die Struktur für ein **Expo Router Web-Projekt** vollständig und korrekt ist:

*   **Verzeichnisstruktur**: `src/app` ist vorhanden und enthält die notwendigen `_layout.tsx` und `index.tsx` Dateien sowie Tabs (`(tabs)`). Dies entspricht den Best Practices für Expo Router.
*   **Konfiguration**:
    *   `app.json`: Enthält die korrekte Web-Konfiguration (`"output": "static"`), was für Expo Router notwendig ist.
    *   `package.json`: Enthält alle wichtigen Abhängigkeiten (`expo`, `expo-router`, `react-native-web`) und Skripte.
*   **Skripte**: Das Skript `"web": "expo start --web"` ist vorhanden und korrekt definiert.

**Fazit**: Das Projekt ist bereit für den Start im Web-Modus.

## 2. Entwurf: StartLocalhost.bat
Die neue Batch-Datei wird so konzipiert, dass sie robust ist und automatisch prüft, ob Abhängigkeiten installiert sind.

```batch
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
```

## 3. Nächste Schritte
1.  Erstellen der Datei `StartLocalhost.bat` im Hauptverzeichnis mit dem oben genannten Inhalt.
2.  (Optional) Testen des Skripts (durch den Benutzer).
