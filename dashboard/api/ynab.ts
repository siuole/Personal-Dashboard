export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.YNAB_API_TOKEN;
  if (!apiKey) {
    return res.status(500).json({ error: 'YNAB API key not configured' });
  }

  try {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const [monthRes, budgetRes] = await Promise.all([
      fetch(`https://api.ynab.com/v1/budgets/last-used/months/${month}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      }),
      fetch('https://api.ynab.com/v1/budgets/last-used', {
        headers: { Authorization: `Bearer ${apiKey}` },
      }),
    ]);

    if (!monthRes.ok || !budgetRes.ok) {
      return res.status(502).json({ error: 'YNAB API error' });
    }

    const [monthData, budgetData] = await Promise.all([
      monthRes.json(),
      budgetRes.json(),
    ]);

    return res.status(200).json({
      month: monthData.data.month,
      currency: budgetData.data.budget.currency_format?.iso_code ?? 'EUR',
    });
  } catch (err) {
    console.error('YNAB request failed:', err);
    return res.status(500).json({ error: 'Request failed' });
  }
}
