# Architekturplan: Mehrsprachigkeit (i18n) für Web & App

## 1. Technologie-Auswahl
Für dieses Expo-Projekt (Web & Mobile) ist **`i18next` in Kombination mit `react-i18next`** die beste Wahl. 
* **Warum:** Es ist der Industriestandard für React und React Native. Es ist äußerst performant, bietet fertige Hooks (`useTranslation`), unterstützt Pluralisierung sowie Interpolation und funktioniert out-of-the-box mit dem Metro Bundler und Expo Router.
* **Erweiterung:** **`expo-localization`** wird zusätzlich empfohlen, um die Systemsprache des Nutzers beim ersten Start automatisch auszulesen.

## 2. Struktur der Übersetzungsdateien
Wir lagern die Texte in reine JSON-Dateien aus. Das Trennen nach Domänen/Komponenten hält die Dateien übersichtlich.

**Ordnerstruktur:**
```text
src/
└── locales/
    ├── de.json
    └── en.json
```

**Aufbau der JSON-Dateien (Beispiel `de.json`):**
```json
{
  "common": {
    "loading": "Wird geladen...",
    "error": "Ein Fehler ist aufgetreten."
  },
  "landingPage": {
    "heroBadge": "Simply – Die Zukunft ist einfach ✨",
    "heroTitle": "Perfekte <1>Insights</1> für dein Leben.",
    "pricing": {
      "starter": "Starter",
      "pro": "Pro"
    }
  },
  "chat": {
    "placeholder": "Schreibe eine Nachricht...",
    "processing": "Verarbeite..."
  }
}
```
*Hinweis: XML-ähnliche Tags `<1>...</1>` können für formatierte Texte (wie den primärfarbigen Text im Hero-Bereich) in Kombination mit der `Trans`-Komponente von `react-i18next` verwendet werden.*

## 3. Sprachumschalter-Logik & Persistenz
Der Sprachzustand muss global verfügbar sein und über App-Neustarts hinweg gespeichert werden.

1. **Persistenz:** Wir nutzen `@react-native-async-storage/async-storage` (bereits in `package.json` vorhanden), um die vom Nutzer gewählte Sprache zu speichern. Web und Native werden davon beide unterstützt.
2. **Initialisierung (`src/services/i18n.ts`):** 
   Hier wird `i18next` konfiguriert. Es prüft den `AsyncStorage` auf eine gespeicherte Sprache. Ist keine vorhanden, fällt es auf `expo-localization.getLocales()[0].languageCode` zurück.
3. **Global State (`src/context/LanguageContext.tsx`):**
   Ein eigener React Context verwaltet den State und stellt eine `changeLanguage(lang)` Funktion bereit, die das Umstellen in `i18next` anstößt und den neuen Wert im Storage sichert. 
   Dieser Provider wird in der Root-Datei (`src/app/_layout.tsx`) eingebunden.

## 4. Bilder-Management (Lokalisierte Bilder)
Da der Metro Bundler in React Native / Expo alle `require()`-Pfade zur Build-Zeit kennen muss, können wir **keine** dynamischen String-Pfade (wie ``require(`image_${lang}.png`)``) verwenden.

**Lösungsansatz:** Eine statische Map und ein Custom Hook.

1. **Dateibenennung:** Bilder mit Text erhalten einen Suffix (z.B. `slide1_de.jpg`, `slide1_en.jpg`).
2. **Map anlegen (`src/constants/localizedImages.ts`):**
   ```typescript
   export const localizedImages = {
     slide1: {
       de: require('@/assets/images/smarter-leben/slide1_de.jpg'),
       en: require('@/assets/images/smarter-leben/slide1_en.jpg'),
     },
     // ...
   };
   ```
3. **Custom Hook (`src/hooks/useLocalizedImage.ts`):**
   ```typescript
   import { useTranslation } from 'react-i18next';
   import { localizedImages } from '@/constants/localizedImages';

   export const useLocalizedImage = (imageKey: keyof typeof localizedImages) => {
     const { i18n } = useTranslation();
     const lang = (i18n.language === 'en' ? 'en' : 'de') as 'de' | 'en';
     return localizedImages[imageKey][lang];
   };
   ```
*In der Komponente (z.B. Carousel) wird dann das Bild einfach per `const slide1 = useLocalizedImage('slide1')` abgerufen.*

## 5. Implementierungsschritte (Schrittweise Anleitung)

- [ ] **Schritt 1: Abhängigkeiten installieren**
  `npm install i18next react-i18next expo-localization`

- [ ] **Schritt 2: Übersetzungsdateien anlegen**
  * `src/locales/de.json` erstellen und alle hardgecodeten Texte aus `LandingPage.tsx` und `index.tsx` dorthin migrieren.
  * `src/locales/en.json` erstellen und die englischen Pendants eintragen.

- [ ] **Schritt 3: i18n Konfiguration erstellen**
  * Erstelle `src/services/i18n.ts`. Konfiguriere dort `i18next` mit dem Init-Objekt, lade die JSON-Dateien und setze `fallbackLng: 'de'`.

- [ ] **Schritt 4: Language Context implementieren**
  * Erstelle `src/context/LanguageContext.tsx`. Dieser liest beim Start den `AsyncStorage`, setzt die Sprache im i18n-Service und stellt `changeLanguage` zur Verfügung.
  * Integriere den `<LanguageProvider>` in `src/app/_layout.tsx` (um alle anderen Provider herum).

- [ ] **Schritt 5: Bilder-Management aufsetzen**
  * Lokalisierte Bilder in `assets/images/smarter-leben/` ablegen.
  * `src/constants/localizedImages.ts` und den Hook `src/hooks/useLocalizedImage.ts` erstellen.

- [ ] **Schritt 6: Komponenten Refaktorieren**
  * In `src/components/website/LandingPage.tsx`: Den `useTranslation()` Hook einbinden und alle Texte durch `t('landingPage.heroTitle')` etc. ersetzen. Bei verschachtelten Styles (z.B. Primary Color im Satz) die `<Trans>`-Komponente von `react-i18next` verwenden.
  * In `src/app/(tabs)/index.tsx`: Ebenfalls harte Strings in Chat-UI und Alerts durch `t(...)` ersetzen.

- [ ] **Schritt 7: UI für Sprachwechsel einbauen**
  * In die Website-Navigation (`WebNavBar.tsx` o.Ä.) einen kleinen Toggle/Dropdown (DE | EN) einbauen.
  * In die App-Settings (`src/app/(tabs)/settings.tsx`) einen Menüpunkt für die Spracheinstellung aufnehmen.
