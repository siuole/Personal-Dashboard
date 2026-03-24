# Personal Dashboard — PLAN 2.0
> Aktualisiert: März 2026 | Basis: PLAN.md v1 + Security-Audit

---

## Status Quo

Das Dashboard ist technisch fertig gebaut. Alle Widgets existieren:

| Widget | Status |
|--------|--------|
| GreetingWidget | ✅ fertig |
| WeatherWidget | ✅ fertig |
| CalendarWidget | ✅ fertig |
| GmailWidget | ✅ fertig |
| TasksWidget | ✅ fertig |
| StravaWidget | ✅ fertig |
| GoalsWidget | ✅ fertig |

`dist/` ist gebaut, `vercel.json` ist vorbereitet. Das Deployment könnte theoretisch sofort passieren — aber es gibt Sicherheitsprobleme, die zuerst gelöst werden müssen.

---

## Kritisches Problem: Secrets im Frontend-Bundle

Vite baked alle `VITE_`-Variablen direkt in den JavaScript-Bundle ein. Das bedeutet: **Jeder, der die Seite öffnet, kann über die Browser-DevTools alle Secrets auslesen.** Konkret betroffen:

- `VITE_STRAVA_CLIENT_SECRET` → landet komplett im Bundle
- `VITE_STRAVA_REFRESH_TOKEN` → landet komplett im Bundle
- `VITE_GOOGLE_CLIENT_SECRET` → landet komplett im Bundle

Die `strava-auth.ts` schickt das Client Secret direkt im Frontend an `https://www.strava.com/oauth/token`. Das darf nicht so bleiben.

**Faustregel:** Alles was "Secret" im Namen hat, gehört niemals ins Frontend.

---

## Phase 0 — Sofort-Fixes (vor dem ersten `git init`)

Diese Phase kostet 15 Minuten und verhindert, dass Credentials für immer in der Git-History stecken.

### Schritt 1 — .gitignore erweitern

Die bestehende `.gitignore` muss zwei Einträge bekommen:

```
# Secrets & Plans mit Credentials
PLAN.md
PLAN 2.0.md
client_secret*.json
```

> **Warum:** `PLAN.md` enthält alle API Keys, Client Secrets und Tokens im Klartext. Die `client_secret_*.json` ist die Google OAuth JSON-Datei. Beide dürfen nie ins Repo.

### Schritt 2 — `.env.local` prüfen

Die `.env.local` ist bereits durch den Eintrag `*.local` in der `.gitignore` geschützt — das ist korrekt. Keine Änderung nötig.

### Schritt 3 — `git init` + erstes Commit

Erst nach Schritt 1 und 2:

```bash
cd dashboard
git init
git add .
git commit -m "Initial commit — Personal Dashboard"
```

Prüfen, dass keine Secrets im Commit landen:
```bash
git show --stat HEAD
# client_secret*.json und .env.local dürfen NICHT auftauchen
```

---

## Phase 1 — Backend für OAuth-Token-Exchange (Vercel Serverless Functions)

Das ist der technisch aufwendigste Schritt, aber notwendig bevor das Dashboard öffentlich deployed wird.

### Warum ein Backend nötig ist

Der Strava OAuth Flow tauscht einen `code` gegen ein `access_token` aus. Dafür braucht man das `client_secret`. Dieser Tausch muss auf dem Server passieren, nicht im Browser.

### Neue Ordnerstruktur

```
dashboard/
  api/                          ← NEU: Vercel Serverless Functions
    strava-token.ts             ← Token Exchange + Refresh (Strava)
    google-token.ts             ← Token Exchange (Google, falls nötig)
  src/
    services/
      strava-auth.ts            ← ÄNDERN: kein Client Secret mehr, ruft /api/strava-token auf
      google-auth.ts            ← ggf. anpassen
```

### `api/strava-token.ts` — was rein muss

```typescript
// Vercel Serverless Function
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, refresh_token, grant_type } = req.body

  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,       // kein VITE_ Prefix!
      client_secret: process.env.STRAVA_CLIENT_SECRET, // bleibt server-side
      code,
      refresh_token,
      grant_type,
    }),
  })

  const data = await response.json()
  res.status(200).json(data)
}
```

### `strava-auth.ts` — was geändert wird

Die Funktionen `exchangeStravaCode` und `refreshAccessToken` rufen statt `https://www.strava.com/oauth/token` direkt jetzt `/api/strava-token` auf. Das Client Secret bleibt damit server-side.

```typescript
// VORHER (unsicher):
body: JSON.stringify({
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,  // ← Problem
  ...
})

// NACHHER (sicher):
const res = await fetch('/api/strava-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code, grant_type: 'authorization_code' }),
})
```

### Google OAuth

Google nutzt in diesem Projekt den OAuth 2.0 Implicit Flow (nur Client ID, kein Secret im Token-Tausch nötig). Das `VITE_GOOGLE_CLIENT_SECRET` in `.env.local` kann entfernt werden — es wird im Frontend nicht gebraucht. Prüfen, ob es irgendwo in `google-auth.ts` verwendet wird.

---

## Phase 2 — Environment Variables richtig aufsetzen

### Lokale Entwicklung (`.env.local`)

```env
# Wetter — kein Secret, VITE_ Prefix okay
VITE_OPENWEATHER_API_KEY=...
VITE_OPENWEATHER_LAT=49.3988
VITE_OPENWEATHER_LON=8.6724

# Google OAuth — nur Client ID ins Frontend
VITE_GOOGLE_CLIENT_ID=...

# Strava — nur Client ID ins Frontend
VITE_STRAVA_CLIENT_ID=...

# Server-only (kein VITE_ Prefix — werden von Vercel Functions genutzt)
STRAVA_CLIENT_SECRET=...
GOOGLE_CLIENT_SECRET=...     # nur falls ein Backend-Endpunkt für Google nötig wird
```

### Vercel Dashboard (Production)

Unter `Settings → Environment Variables` folgende Variablen eintragen:

| Variable | Wert | Scope |
|----------|------|-------|
| `VITE_OPENWEATHER_API_KEY` | `204b1079...` | Production |
| `VITE_OPENWEATHER_LAT` | `49.3988` | Production |
| `VITE_OPENWEATHER_LON` | `8.6724` | Production |
| `VITE_GOOGLE_CLIENT_ID` | `821445208766-...` | Production |
| `VITE_STRAVA_CLIENT_ID` | `215559` | Production |
| `STRAVA_CLIENT_SECRET` | `069099ef...` | Production |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | Production |

> **Wichtig:** Die `STRAVA_CLIENT_SECRET` und `GOOGLE_CLIENT_SECRET` Zeilen haben **kein** `VITE_` Prefix. Vercel stellt sie nur den Serverless Functions zur Verfügung, nicht dem Browser-Bundle.

---

## Phase 3 — OAuth Redirect URIs aktualisieren

### Google Cloud Console

1. Öffne: https://console.cloud.google.com → Projekt `personal-dashboard-491118`
2. APIs & Services → Credentials → OAuth 2.0 Client ID auswählen
3. Unter "Authorized redirect URIs" hinzufügen:
   - `https://dein-projektname.vercel.app` (sobald bekannt)
   - `http://localhost:5173` (für lokale Entwicklung mit Vite)
4. Speichern

### Strava App-Einstellungen

1. Öffne: https://www.strava.com/settings/api
2. "Authorization Callback Domain" ändern von `localhost` auf:
   - `dein-projektname.vercel.app`

> **Hinweis:** Bei Strava kann nur eine Callback-Domain eingetragen werden. Für lokale Entwicklung muss man temporär `localhost` eintragen oder einen lokalen Proxy nutzen.

---

## Phase 4 — Deployment auf Vercel

### Voraussetzungen (Checkliste)

- [ ] Phase 0 abgeschlossen (`.gitignore` korrekt, kein Secret im Repo)
- [ ] Phase 1 abgeschlossen (Serverless Functions für Strava Token Exchange)
- [ ] Phase 2 abgeschlossen (Env Vars im Vercel Dashboard eingetragen)
- [ ] Phase 3 abgeschlossen (Redirect URIs aktualisiert)

### Deploy-Befehl

```bash
# Option A: Vercel CLI
npx vercel --prod

# Option B: Via GitHub
# Repo auf GitHub pushen → Vercel mit GitHub verbinden → Auto-Deploy bei Push
```

### Nach dem Deployment testen

1. Dashboard öffnen → Greeting Widget: Uhrzeit sichtbar?
2. Weather Widget: Wetter Heidelberg lädt?
3. Google OAuth: Login-Flow startet, Kalender/Gmail/Tasks laden?
4. Strava OAuth: Login-Flow startet, Stats laden?
5. Browser DevTools → Network Tab: Sind irgendwo Secrets in den Requests sichtbar?
6. Browser DevTools → Sources: Ist `client_secret` irgendwo im Bundle-JS findbar? (Suche mit Strg+F)

---

## Phase 5 — Chrome Extension (optional, nach Vercel-Deployment)

Falls das Dashboard als New Tab Override in Chrome genutzt werden soll:

1. `public/manifest.json` prüfen oder erstellen:
```json
{
  "manifest_version": 3,
  "name": "Personal Dashboard",
  "version": "1.0",
  "chrome_url_overrides": {
    "newtab": "index.html"
  }
}
```

2. `npm run build` ausführen
3. In Chrome: `chrome://extensions` → "Entwicklermodus" → "Entpackte Erweiterung laden" → `dist/` Ordner auswählen

> **Hinweis:** Als Chrome Extension müssen die OAuth Redirect URIs auf `chrome-extension://EXTENSION_ID/...` gesetzt werden. Das ist ein separater Aufwand. Einfacher ist es, das Vercel-Deployment als Startseite zu nutzen (kein Extension nötig).

---

## Risiken im Überblick

| Risiko | Schwere | Gelöst durch |
|--------|---------|--------------|
| Client Secrets im Bundle | 🔴 Kritisch | Phase 1 — Serverless Functions |
| PLAN.md mit Keys im Repo | 🔴 Kritisch | Phase 0 — .gitignore |
| OAuth Redirect URI falsch | 🟡 Mittel | Phase 3 |
| .env.local im Repo | 🟢 Kein Problem | `*.local` bereits in .gitignore |
| API Keys im Bundle (Weather, Google Client ID) | 🟡 Akzeptabel | Client IDs sind öffentlich by Design; OpenWeatherMap Free-Key hat Rate Limit als natürlichen Schutz |

---

## Wichtige Regeln (weiterhin gültig aus v1)

- PLAN.md und PLAN 2.0.md niemals in ein öffentliches Git Repo committen
- API Keys niemals hardcoden — ausschließlich über `.env.local` / Vercel Env Vars
- Alles was "Secret" heißt gehört server-side (kein `VITE_` Prefix)
- Ein Widget nach dem anderen testen nach Deployment
- Jeden Service (API-Call-Logik) getrennt von der UI halten
- TypeScript Typen für alle API Responses beibehalten
