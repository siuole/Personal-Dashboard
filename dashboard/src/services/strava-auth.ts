const TOKEN_KEY = 'strava_access_token';
const EXPIRY_KEY = 'strava_token_expiry';
const REFRESH_KEY = 'strava_refresh_token';

const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
// CLIENT_SECRET wird nicht mehr im Frontend verwendet — liegt in api/strava-token.ts

export function isStravaAuthenticated(): boolean {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = Number(localStorage.getItem(EXPIRY_KEY));
  return Boolean(token) && Date.now() < expiry;
}

function saveTokens(access: string, refresh: string, expiresAt: number) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(EXPIRY_KEY, String(expiresAt * 1000)); // Unix seconds → ms
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearStravaTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function initiateStravaAuth() {
  const redirectUri = window.location.origin;
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
  });
  window.location.href = `https://www.strava.com/oauth/authorize?${params}`;
}

export async function exchangeStravaCode(code: string): Promise<void> {
  // Token-Exchange läuft jetzt server-side über Vercel Serverless Function
  const res = await fetch('/api/strava-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, grant_type: 'authorization_code' }),
  });
  if (!res.ok) throw new Error('Strava code exchange failed');
  const data = await res.json();
  saveTokens(data.access_token, data.refresh_token, data.expires_at);
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) throw new Error('No refresh token');
  // Refresh läuft ebenfalls server-side
  const res = await fetch('/api/strava-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  if (!res.ok) throw new Error('Strava token refresh failed');
  const data = await res.json();
  saveTokens(data.access_token, data.refresh_token, data.expires_at);
  return data.access_token;
}

export async function getStravaToken(): Promise<string> {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = Number(localStorage.getItem(EXPIRY_KEY));
  if (token && Date.now() < expiry) return token;
  return refreshAccessToken();
}
