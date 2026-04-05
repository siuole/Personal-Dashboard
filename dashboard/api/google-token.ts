export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Google credentials not configured' });
  }

  const { code, redirect_uri, grant_type, refresh_token } = req.body;

  try {
    let body: Record<string, string>;

    if (grant_type === 'refresh_token') {
      body = {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token,
        grant_type: 'refresh_token',
      };
    } else {
      body = {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirect_uri || 'https://personal-dashboard-five-jade.vercel.app',
        grant_type: 'authorization_code',
      };
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Google token error:', error);
      return res.status(response.status).json(error);
    }

    const data = await response.json();
    return res.status(200).json({
      access_token: data.access_token,
      expires_in: data.expires_in,
      refresh_token: data.refresh_token ?? null,
    });
  } catch (err) {
    console.error('Token exchange failed:', err);
    return res.status(500).json({ error: 'Token exchange failed' });
  }
}
