export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  const { messages } = req.body as {
    messages: { role: 'user' | 'model'; text: string }[];
  };

  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'No messages provided' });
  }

  try {
    const contents = messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      console.error('Gemini API error:', err);
      return res.status(response.status).json({ error: err?.error?.message ?? JSON.stringify(err) });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return res.status(200).json({ text });
  } catch (err) {
    console.error('Gemini request failed:', err);
    return res.status(500).json({ error: 'Request failed' });
  }
}
