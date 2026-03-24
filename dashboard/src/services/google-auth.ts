const TOKEN_KEY = 'goog_access_token';
const EXPIRY_KEY = 'goog_token_expiry';

export function saveToken(token: string, expiresIn: number) {
  const expiry = Date.now() + expiresIn * 1000;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EXPIRY_KEY, String(expiry));
}

export function getToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = Number(localStorage.getItem(EXPIRY_KEY));
  if (!token || Date.now() > expiry) {
    clearToken();
    return null;
  }
  return token;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
