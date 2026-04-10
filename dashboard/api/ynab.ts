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

    const headers = { Authorization: `Bearer ${apiKey}` };

    const [monthRes, budgetRes, txRes] = await Promise.all([
      fetch(`https://api.ynab.com/v1/budgets/last-used/months/${month}`, { headers }),
      fetch('https://api.ynab.com/v1/budgets/last-used', { headers }),
      fetch(`https://api.ynab.com/v1/budgets/last-used/transactions?since_date=${month}`, { headers }),
    ]);

    if (!monthRes.ok || !budgetRes.ok || !txRes.ok) {
      return res.status(502).json({ error: 'YNAB API error' });
    }

    const [monthData, budgetData, txData] = await Promise.all([
      monthRes.json(),
      budgetRes.json(),
      txRes.json(),
    ]);

    return res.status(200).json({
      month: monthData.data.month,
      currency: budgetData.data.budget.currency_format?.iso_code ?? 'EUR',
      transactions: txData.data.transactions,
    });
  } catch (err) {
    console.error('YNAB request failed:', err);
    return res.status(500).json({ error: 'Request failed' });
  }
}
