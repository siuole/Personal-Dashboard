const TOKEN_KEY   = 'goog_access_token';
const EXPIRY_KEY  = 'goog_token_expiry';
const REFRESH_KEY = 'goog_refresh_token';

export function saveToken(token: string, expiresIn: number, refreshToken?: string | null) {
  const expiry = Date.now() + expiresIn * 1000;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EXPIRY_KEY, String(expiry));
  if (refreshToken) {
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }
}

export function getToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = Number(localStorage.getItem(EXPIRY_KEY));
  if (!token || Date.now() > expiry) return null;
  return token;
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function isTokenExpiredSoon(): boolean {
  const expiry = Number(localStorage.getItem(EXPIRY_KEY));
  // Refresh if less than 5 minutes remaining
  return expiry > 0 && Date.now() > expiry - 5 * 60 * 1000;
}

export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch('/api/google-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    saveToken(data.access_token, data.expires_in ?? 3600, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function isAuthenticated(): boolean {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = Number(localStorage.getItem(EXPIRY_KEY));
  const hasRefresh = !!localStorage.getItem(REFRESH_KEY);
  // Still "authenticated" if we have a refresh token, even if access token expired
  return !!(token && expiry > 0) || hasRefresh;
}
