# Personal Dashboard — Browser Start Page

## Projektziel
Ein persoenliches Dashboard als Browser-Startseite (New Tab), das die wichtigsten Tages-Infos auf einen Blick zeigt. Gebaut als Lernprojekt fuer Claude Code.

**Design-Referenz:** Siehe `moodboard.png` im Repo — SaaS-Dashboard-Stil mit Sidebar, KPI-Karten, Charts und Listenansicht. Light Theme.

---

## Widgets (nach Prioritaet)

| # | Widget | Datenquelle | Auth | Position |
|---|--------|------------|------|----------|
| 1 | Kalender | Google Calendar API | Google OAuth 2.0 | Oben links |
| 2 | Tasks | Google Tasks API | Google OAuth 2.0 | Oben mitte |
| 3 | Wetter | OpenWeatherMap API | API Key (kostenlos) | Oben rechts |
| 4 | E-Mails | Gmail API | Google OAuth 2.0 | Unten links (2/3 Breite) |
| 5 | Strava | Strava API v3 | Strava OAuth 2.0 | Unten rechts (1/3 Breite) |
| 6 | Uhrzeit / Begruessung | Lokal | Keine | Header (volle Breite) |

**Reihenfolge ist bewusst:** Wetter hat keine OAuth-Komplexitaet und eignet sich perfekt zum Einstieg. Google-Widgets (Calendar, Gmail, Tasks) teilen sich einen OAuth-Flow. Strava ist separat.

---

## Tech-Stack

- **Framework:** React (Vite)
- **Styling:** Tailwind CSS
- **Sprache:** TypeScript
- **State Management:** React State / Context (kein Redux noetig)
- **Build:** Vite
- **Deployment:** Lokal als Chrome Extension (New Tab Override) oder gehostet via Vercel/Netlify

---

## Architektur

```
src/
  components/
    layout/
      Dashboard.tsx             # Grid-Layout fuer alle Widgets
      WidgetCard.tsx            # Wiederverwendbare Widget-Huelle
    widgets/
      GreetingWidget.tsx        # Uhrzeit + Begruessung (Header)
      WeatherWidget.tsx         # Wetter Heidelberg (animated)
      CalendarWidget.tsx        # Wochenansicht Google Calendar
      GmailWidget.tsx           # Ungelesene Mails als Liste
      TasksWidget.tsx           # Offene Tasks mit Checkboxen
      StravaWidget.tsx          # Strava Stats + Chart
  services/
    google-auth.ts              # Google OAuth Flow
    strava-auth.ts              # Strava OAuth Flow
    weather-api.ts              # OpenWeatherMap Calls
    google-calendar.ts          # Calendar API Calls
    gmail.ts                    # Gmail API Calls
    google-tasks.ts             # Tasks API Calls
    strava.ts                   # Strava API Calls
  config/
    api-keys.ts                 # API Keys (nicht committen!)
  App.tsx
  main.tsx
```

---

## Build-Phasen

### Phase 1 — Grundgeruest + Wetter
- [ ] Vite + React + Tailwind Projekt aufsetzen
- [ ] Dashboard Grid-Layout: Header volle Breite, 3 Spalten oben, 2 Spalten unten
- [ ] GreetingWidget im Header (Uhrzeit, Datum, "Guten Morgen/Tag/Abend, Louis")
- [ ] WeatherWidget (oben rechts) an OpenWeatherMap anbinden (Heidelberg)
- [ ] Animated CSS Weather Icons (Sonne, Regen, Wolken, Schnee, Gewitter)
- [ ] Dynamischer Hintergrund-Gradient auf Wetter-Karte (kalt=blau, mild=teal, warm=orange)
- [ ] Light Theme als Default (weisser Hintergrund, subtile Schatten)

### Phase 2 — Google Integration
- [ ] Google Auth Service implementieren (Token Flow + Refresh)
- [ ] CalendarWidget (oben links): Wochenansicht mit heutigem Tag hervorgehoben
- [ ] GmailWidget (unten links, 2/3 Breite): Ungelesene Mails als Liste (Absender, Betreff, Zeit)
- [ ] TasksWidget (oben mitte): Todo-Liste mit Checkboxen aus Default-Liste

### Phase 3 — Strava
- [ ] Strava OAuth implementieren
- [ ] StravaWidget (unten rechts, 1/3 Breite): KPI-Karten (km diese Woche, Laeufe, Pace) + Balkendiagramm

### Phase 4 — Polish + Deployment
- [ ] Responsive Design (Desktop-fokussiert, aber mobil nutzbar)
- [ ] Loading States + Error Handling fuer alle Widgets
- [ ] Auto-Refresh Intervalle (Wetter: 30min, Mail: 5min, Kalender: 10min)
- [ ] Deploy auf Vercel
- [ ] Als Chrome-Startseite setzen

---

## API Credentials

> **WICHTIG: Diese Datei NIEMALS in ein oeffentliches Git Repo committen!**
> Wenn du git nutzt: PLAN.md in .gitignore eintragen oder Keys nur in .env.local speichern.

### Google OAuth 2.0
- **Project ID:** personal-dashboard-491118
- **Client ID:** 821445208766-f2ommove4vrcqq3nq0l9ules9lrcjk7v.apps.googleusercontent.com
- **Client Secret:** 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
- **Redirect URI:** http://localhost:3000/api/auth/callback/google
- **Scopes:**
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `https://www.googleapis.com/auth/calendar.readonly`
  - `https://www.googleapis.com/auth/tasks.readonly`

### Strava OAuth 2.0
- **Client ID:** 215559
- **Client Secret:** 069099ef00db23adb8e100e8baf66a7c439e388e
- **Access Token:** 7aa619faa5f4ccb225bdd277f78990806a2f196e
- **Refresh Token:** 203ad7a34a93a68bf3eedb3565dde97a69ca7546
- **Callback Domain:** localhost
- **Scope:** `activity:read`

### OpenWeatherMap
- **API Key:** 204b1079eab2e113fe85c8fa41fb28e8
- **Plan:** Free (1000 Calls/Tag)
- **Endpoint:** Current Weather + 3-Day Forecast
- **Standort:** Heidelberg (lat: 49.3988, lon: 8.6724)

### .env.local (Copy-Paste ready)
```
GOOGLE_CLIENT_ID=821445208766-f2ommove4vrcqq3nq0l9ules9lrcjk7v.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
NEXTAUTH_SECRET=louis-personal-dashboard-2026-secret
NEXTAUTH_URL=http://localhost:3000

STRAVA_CLIENT_ID=215559
STRAVA_CLIENT_SECRET=069099ef00db23adb8e100e8baf66a7c439e388e

OPENWEATHER_API_KEY=204b1079eab2e113fe85c8fa41fb28e8
```

---

## Design-Richtlinien (basierend auf Moodboard)

### Layout-Struktur
```
+--------------------------------------------------------------------+
|  Header: "Guten Morgen/Tag/Abend, Louis" + Uhrzeit + Datum        |
+---------------------+---------------------+------------------------+
|  Google Calendar     |  Google Tasks       |  Wetter Heidelberg     |
|  (Wochenansicht,     |  (Todo-Liste mit    |  (Animated Icons,      |
|   heute hervor-      |   Checkboxen aus    |   aktuelle Temp +      |
|   gehoben)           |   Default-Liste)    |   3-Tage Forecast,     |
|                      |                     |   dynamischer Gradient)|
+---------------------+---------------------+------------------------+
|  Gmail Inbox         |                     |  Strava Stats          |
|  (Ungelesene Mails:  |                     |  (km diese Woche,      |
|   Absender, Betreff, |                     |   Laeufe, Pace,        |
|   Zeit — max 5-8)    |                     |   Balkendiagramm)      |
+---------------------+---------------------+------------------------+
```

**Kein Sidebar.** Alles in einem cleanen Grid — 3 Spalten oben, 2 Spalten unten (Gmail nimmt 2/3, Strava 1/3). Header-Zeile spannt volle Breite.

### Visueller Stil
- **Theme:** Light Mode — weisser/hellgrauer Hintergrund (#F8F9FA oder #FAFAFA)
- **Karten:** Weiss (#FFFFFF), abgerundete Ecken (border-radius: 12-16px), subtiler Schatten
- **Kein Sidebar** — alles in einem offenen Grid-Layout
- **Typografie:** Inter oder System Font, clean Sans-Serif
- **KPI-Karten:** Grosse Zahl, kleiner Label-Text, Trend-Indikator (↑↓ + Prozent, gruen/rot)
- **Farben:**
  - Primaer-Akzent: Blau (#3B82F6) oder nach Wahl
  - Erfolg/Positiv: Gruen (#10B981)
  - Warnung/Negativ: Rot (#EF4444)
  - Text: Dunkelgrau (#1F2937) auf hellem Grund
  - Subtle Text: Mittelgrau (#6B7280)
- **Charts:** Dunkle Balken (#1F2937 oder #111827) auf hellem Grund, wie im Moodboard
- **Spacing:** Grosszuegig — viel Weissraum zwischen Widgets
- **Vibe:** Clean, professional, SaaS-Dashboard-Aesthetic — kein visuelles Rauschen

---

## Wichtige Regeln fuer Claude Code

- Immer diese PLAN.md als Kontext lesen bevor Aenderungen gemacht werden
- Ein Widget nach dem anderen bauen und testen
- API Keys niemals hardcoden — .env File nutzen
- Jeden Service (API-Call-Logik) getrennt von der UI halten
- TypeScript Typen fuer alle API Responses definieren
- Keine externen State-Management Libraries — React Context reicht