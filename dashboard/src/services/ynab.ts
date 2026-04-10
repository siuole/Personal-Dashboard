export interface YnabCategory {
  id: string;
  category_group_id: string;
  category_group_name: string;
  name: string;
  hidden: boolean;
  budgeted: number;  // milliunits
  activity: number;  // milliunits, negative = spending
  balance: number;   // milliunits
}

export interface YnabMonth {
  month: string;
  income: number;
  budgeted: number;
  activity: number;
  to_be_budgeted: number;
  age_of_money: number | null;
  categories: YnabCategory[];
}

export interface YnabTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // milliunits, negative = outflow
  transfer_account_id: string | null;
}

export interface YnabData {
  month: YnabMonth;
  currency: string;
  transactions: YnabTransaction[];
}

// Returns map of YYYY-MM-DD -> total outflow in milliunits (positive values)
export function getDailySpending(transactions: YnabTransaction[]): Record<string, number> {
  const daily: Record<string, number> = {};
  for (const t of transactions) {
    if (t.amount >= 0 || t.transfer_account_id) continue;
    daily[t.date] = (daily[t.date] ?? 0) + (-t.amount);
  }
  return daily;
}

export interface CategoryGroup {
  name: string;
  budgeted: number;
  activity: number;
  balance: number;
}

export function formatCurrency(milliunits: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(milliunits / 1000);
}

export function getCategoryGroups(categories: YnabCategory[]): CategoryGroup[] {
  const groups = new Map<string, CategoryGroup>();

  for (const cat of categories) {
    if (cat.hidden || cat.category_group_name === 'Internal Master Category') continue;

    const existing = groups.get(cat.category_group_name) ?? {
      name: cat.category_group_name,
      budgeted: 0,
      activity: 0,
      balance: 0,
    };

    groups.set(cat.category_group_name, {
      name: existing.name,
      budgeted: existing.budgeted + cat.budgeted,
      activity: existing.activity + cat.activity,
      balance: existing.balance + cat.balance,
    });
  }

  return Array.from(groups.values())
    .filter((g) => g.budgeted > 0 || g.activity !== 0)
    .sort((a, b) => Math.abs(b.activity) - Math.abs(a.activity));
}

export async function fetchYnabData(): Promise<YnabData> {
  const res = await fetch('/api/ynab');
  if (!res.ok) throw new Error('YNAB fetch failed');
  return res.json();
}
