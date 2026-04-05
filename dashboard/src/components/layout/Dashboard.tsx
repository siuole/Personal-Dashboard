import { useState, useEffect } from 'react';
import WidgetCard from './WidgetCard';
import GreetingWidget from '../widgets/GreetingWidget';
import WeatherWidget from '../widgets/WeatherWidget';
import CalendarWidget from '../widgets/CalendarWidget';
import GmailWidget from '../widgets/GmailWidget';
import TasksWidget from '../widgets/TasksWidget';
import StravaWidget from '../widgets/StravaWidget';
import GoalsWidget from '../widgets/GoalsWidget';
import { saveToken, isAuthenticated, clearToken, refreshAccessToken, isTokenExpiredSoon, getToken, getRefreshToken } from '../../services/google-auth';
import QuickLaunch from '../widgets/QuickLaunch';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/tasks',
].join(' ');

function DashboardInner() {
  const [authed, setAuthed] = useState(isAuthenticated());

  // Dynamic background based on time of day
  useEffect(() => {
    function applyBackground() {
      const h = new Date().getHours();
      let bg: string;
      if (h >= 5 && h < 8) {
        // Dawn — warm peach/gold
        bg = 'linear-gradient(160deg, #fdf1e0 0%, #fce4c4 100%)';
      } else if (h >= 8 && h < 12) {
        // Morning — fresh cool blue-white
        bg = 'linear-gradient(160deg, #eef5ff 0%, #e6f0fa 100%)';
      } else if (h >= 12 && h < 17) {
        // Afternoon — clean neutral (default)
        bg = 'linear-gradient(160deg, #f5f5f7 0%, #ebebed 100%)';
      } else if (h >= 17 && h < 20) {
        // Evening — warm amber
        bg = 'linear-gradient(160deg, #fff4e6 0%, #ffe8cc 100%)';
      } else if (h >= 20 && h < 22) {
        // Dusk — soft lavender
        bg = 'linear-gradient(160deg, #f0ebf8 0%, #e2d9f3 100%)';
      } else {
        // Night — cool blue-gray
        bg = 'linear-gradient(160deg, #e4e8f4 0%, #d5dbed 100%)';
      }
      document.body.style.background = bg;
    }

    applyBackground();
    const timer = setInterval(applyBackground, 60 * 1000);
    return () => { clearInterval(timer); document.body.style.background = ''; };
  }, []);

  // Auto-refresh: on startup and every 55 minutes
  useEffect(() => {
    async function tryRefresh() {
      const ok = await refreshAccessToken();
      if (ok) setAuthed(true);
      else { clearToken(); setAuthed(false); }
    }
    if (!getToken() && getRefreshToken()) tryRefresh();
    const interval = setInterval(async () => {
      if (isTokenExpiredSoon()) await refreshAccessToken();
    }, 55 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle OAuth callback: detect ?code= in URL on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      // Remove code from URL to prevent re-use on refresh
      window.history.replaceState({}, '', window.location.pathname);
      // Exchange code for token via server-side function
      fetch('/api/google-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          redirect_uri: window.location.origin,
        }),
      })
        .then(res => { if (!res.ok) throw new Error('Token exchange failed'); return res.json(); })
        .then(data => { saveToken(data.access_token, data.expires_in ?? 3600, data.refresh_token); setAuthed(true); })
        .catch(err => console.error('Google token exchange failed', err));
    } else {
      setAuthed(isAuthenticated());
    }
  }, []);

  function login() {
    // Manual OAuth redirect — no library needed
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: window.location.origin,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  function handleLogout() {
    clearToken();
    setAuthed(false);
  }

  return (
    <div className="min-h-screen flex flex-col gap-5" style={{ padding: '24px 28px' }}>

      {/* Header Row */}
      <div className="flex gap-5">
        {/* Greeting + Time */}
        <WidgetCard className="flex-1 min-w-0">
          <GreetingWidget />
        </WidgetCard>

        {/* Quick Launch + Login */}
        <WidgetCard className="flex-shrink-0 flex flex-col items-center justify-between gap-4" style={{ minWidth: 160 }}>
          <QuickLaunch />
          {authed ? (
            <button
              onClick={handleLogout}
              style={{
                padding: '0.375em 1em',
                background: '#f0f0f0',
                border: 0,
                borderRadius: '0.5em',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#242424',
                fontFamily: 'inherit',
                cursor: 'pointer',
                textShadow: '0 0.0625em 0 #fff',
                boxShadow: 'inset 0 0.0625em 0 0 #f4f4f4, 0 0.0625em 0 0 #efefef, 0 0.125em 0 0 #ececec, 0 0.25em 0 0 #e0e0e0, 0 0.3125em 0 0 #dedede, 0 0.375em 0 0 #dcdcdc, 0 0.425em 0 0 #cacaca, 0 0.425em 0.5em 0 #cecece',
                transition: '0.15s ease',
              }}
              onMouseDown={e => { e.currentTarget.style.translate = '0 0.225em'; e.currentTarget.style.boxShadow = 'inset 0 0.03em 0 0 #f4f4f4, 0 0.03em 0 0 #efefef, 0 0.0625em 0 0 #ececec, 0 0.125em 0 0 #e0e0e0, 0 0.125em 0 0 #dedede, 0 0.2em 0 0 #dcdcdc, 0 0.225em 0 0 #cacaca, 0 0.225em 0.375em 0 #cecece'; }}
              onMouseUp={e => { e.currentTarget.style.translate = ''; e.currentTarget.style.boxShadow = 'inset 0 0.0625em 0 0 #f4f4f4, 0 0.0625em 0 0 #efefef, 0 0.125em 0 0 #ececec, 0 0.25em 0 0 #e0e0e0, 0 0.3125em 0 0 #dedede, 0 0.375em 0 0 #dcdcdc, 0 0.425em 0 0 #cacaca, 0 0.425em 0.5em 0 #cecece'; }}
              onMouseLeave={e => { e.currentTarget.style.translate = ''; e.currentTarget.style.boxShadow = 'inset 0 0.0625em 0 0 #f4f4f4, 0 0.0625em 0 0 #efefef, 0 0.125em 0 0 #ececec, 0 0.25em 0 0 #e0e0e0, 0 0.3125em 0 0 #dedede, 0 0.375em 0 0 #dcdcdc, 0 0.425em 0 0 #cacaca, 0 0.425em 0.5em 0 #cecece'; }}
            >
              Abmelden
            </button>
          ) : (
            <button
              onClick={() => login()}
              className="group flex items-center gap-3 whitespace-nowrap"
              style={{
                padding: '0.375em 1em',
                background: '#f0f0f0',
                border: 0,
                borderRadius: '0.5em',
                fontSize: '1rem',
                fontWeight: 600,
                color: '#242424',
                fontFamily: 'inherit',
                cursor: 'pointer',
                textShadow: '0 0.0625em 0 #fff',
                boxShadow: 'inset 0 0.0625em 0 0 #f4f4f4, 0 0.0625em 0 0 #efefef, 0 0.125em 0 0 #ececec, 0 0.25em 0 0 #e0e0e0, 0 0.3125em 0 0 #dedede, 0 0.375em 0 0 #dcdcdc, 0 0.425em 0 0 #cacaca, 0 0.425em 0.5em 0 #cecece',
                transition: '0.15s ease',
              }}
              onMouseDown={e => { e.currentTarget.style.translate = '0 0.225em'; e.currentTarget.style.boxShadow = 'inset 0 0.03em 0 0 #f4f4f4, 0 0.03em 0 0 #efefef, 0 0.0625em 0 0 #ececec, 0 0.125em 0 0 #e0e0e0, 0 0.125em 0 0 #dedede, 0 0.2em 0 0 #dcdcdc, 0 0.225em 0 0 #cacaca, 0 0.225em 0.375em 0 #cecece'; }}
              onMouseUp={e => { e.currentTarget.style.translate = ''; e.currentTarget.style.boxShadow = 'inset 0 0.0625em 0 0 #f4f4f4, 0 0.0625em 0 0 #efefef, 0 0.125em 0 0 #ececec, 0 0.25em 0 0 #e0e0e0, 0 0.3125em 0 0 #dedede, 0 0.375em 0 0 #dcdcdc, 0 0.425em 0 0 #cacaca, 0 0.425em 0.5em 0 #cecece'; }}
              onMouseLeave={e => { e.currentTarget.style.translate = ''; e.currentTarget.style.boxShadow = 'inset 0 0.0625em 0 0 #f4f4f4, 0 0.0625em 0 0 #efefef, 0 0.125em 0 0 #ececec, 0 0.25em 0 0 #e0e0e0, 0 0.3125em 0 0 #dedede, 0 0.375em 0 0 #dcdcdc, 0 0.425em 0 0 #cacaca, 0 0.425em 0.5em 0 #cecece'; }}
            >
              <GoogleIcon />
              <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: -0.1 }}>
                <span className="hidden sm:inline">Mit Google anmelden</span>
                <span className="sm:hidden">Anmelden</span>
              </span>
            </button>
          )}
        </WidgetCard>
      </div>

      {/* Row 1: Calendar (breiter) + Gmail (schmaler) */}
      <div className="hidden lg:grid gap-5" style={{ gridTemplateColumns: '1.7fr 1fr' }}>
        <WidgetCard className="flex flex-col" style={{ height: '500px' }}>
          <CalendarWidget authenticated={authed} />
        </WidgetCard>
        <WidgetCard className="flex flex-col" style={{ height: '500px' }}>
          <GmailWidget authenticated={authed} />
        </WidgetCard>
      </div>

      {/* Row 2: Wetter | To-Do | Strava — gleiche Breite */}
      <div className="hidden lg:grid grid-cols-3 gap-5">
        <WidgetCard className="p-0 overflow-hidden" style={{ height: '300px' }}>
          <WeatherWidget />
        </WidgetCard>
        <WidgetCard className="flex flex-col" style={{ height: '300px' }}>
          <TasksWidget authenticated={authed} />
        </WidgetCard>
        <WidgetCard className="flex flex-col" style={{ height: '300px' }}>
          <StravaWidget />
        </WidgetCard>
      </div>

      {/* Row 3: Monatsziele | Wochenziele */}
      <div className="hidden lg:grid grid-cols-2 gap-5">
        <WidgetCard className="flex flex-col" style={{ height: '280px' }}>
          <GoalsWidget period="month" />
        </WidgetCard>
        <WidgetCard className="flex flex-col" style={{ height: '280px' }}>
          <GoalsWidget period="week" />
        </WidgetCard>
      </div>

      {/* Mobile fallback */}
      <div className="flex flex-col gap-5 lg:hidden">
        <WidgetCard className="flex flex-col" style={{ height: '480px' }}>
          <CalendarWidget authenticated={authed} />
        </WidgetCard>
        <WidgetCard className="flex flex-col" style={{ height: '360px' }}>
          <GmailWidget authenticated={authed} />
        </WidgetCard>
        <WidgetCard className="p-0 overflow-hidden" style={{ height: '260px' }}>
          <WeatherWidget />
        </WidgetCard>
        <WidgetCard className="flex flex-col" style={{ minHeight: '260px' }}>
          <StravaWidget />
        </WidgetCard>
        <WidgetCard className="flex flex-col" style={{ height: '260px' }}>
          <TasksWidget authenticated={authed} />
        </WidgetCard>
        <WidgetCard className="flex flex-col" style={{ minHeight: '260px' }}>
          <GoalsWidget period="month" />
        </WidgetCard>
        <WidgetCard className="flex flex-col" style={{ minHeight: '260px' }}>
          <GoalsWidget period="week" />
        </WidgetCard>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

export default function Dashboard() {
  return <DashboardInner />;
}
