import { useState, useEffect, useCallback } from 'react';
import { fetchYnabData, getCategoryGroups, formatCurrency } from '../../services/ynab';
import type { YnabData, CategoryGroup } from '../../services/ynab';
import ErrorState from '../layout/ErrorState';
import { SkeletonBlock, SkeletonLine } from '../layout/Skeleton';

function YnabLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="10" fill="#1DB867" />
      <path d="M10 14h5l9 14 9-14h5L24 36 10 14Z" fill="white" />
    </svg>
  );
}

function KpiCard({
  label,
  value,
  highlight,
  negative,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      style={{
        background: highlight
          ? 'rgba(29,184,103,0.08)'
          : 'rgba(0,0,0,0.035)',
        borderRadius: 12,
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        border: highlight ? '1px solid rgba(29,184,103,0.2)' : '1px solid transparent',
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: '#9CA3AF',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: negative ? '#EF4444' : highlight ? '#1DB867' : '#111827',
          letterSpacing: -0.3,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function GroupBar({
  group,
  currency,
}: {
  group: CategoryGroup;
  currency: string;
}) {
  const spent = -group.activity;
  const budgeted = group.budgeted;
  const overspent = spent > budgeted && budgeted > 0;
  const unbudgeted = budgeted === 0 && spent > 0;
  const pct = budgeted > 0 ? Math.min(spent / budgeted, 1) * 100 : 100;

  const barColor = overspent || unbudgeted
    ? '#EF4444'
    : pct > 90
    ? '#F59E0B'
    : '#1DB867';

  const balanceLabel = overspent
    ? `${formatCurrency(-group.balance, currency)} überzogen`
    : unbudgeted
    ? formatCurrency(spent, currency)
    : formatCurrency(group.balance, currency);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: '#374151',
          width: 160,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={group.name}
      >
        {group.name}
      </span>

      <div
        style={{
          flex: 1,
          height: 5,
          background: 'rgba(0,0,0,0.07)',
          borderRadius: 99,
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: barColor,
            borderRadius: 99,
            transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>

      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: overspent || unbudgeted ? '#EF4444' : '#6B7280',
          flexShrink: 0,
          minWidth: 80,
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        {formatCurrency(spent, currency)}
        {budgeted > 0 && (
          <span style={{ color: '#C4C9D4' }}> / {formatCurrency(budgeted, currency)}</span>
        )}
      </span>

      <span
        style={{
          fontSize: 10,
          color: overspent || unbudgeted ? '#EF4444' : '#9CA3AF',
          flexShrink: 0,
          minWidth: 70,
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        {balanceLabel}
      </span>
    </div>
  );
}

function YnabSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      <SkeletonLine className="w-28 h-3" />
      <div style={{ display: 'flex', gap: 8 }}>
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="flex-1 h-14 rounded-xl" />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SkeletonLine className="w-36 h-2.5" />
            <SkeletonBlock className="flex-1 h-1.5 rounded-full" />
            <SkeletonLine className="w-20 h-2.5" />
          </div>
        ))}
      </div>
    </div>
  );
}

function formatMonthName(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

export default function YnabWidget() {
  const [data, setData] = useState<YnabData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchYnabData();
      setData(result);
    } catch {
      setError('YNAB-Daten nicht verfügbar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  if (loading && !data) return <YnabSkeleton />;

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
          <YnabLogo />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1D23', letterSpacing: -0.2 }}>
            YNAB
          </span>
        </div>
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  if (!data) return null;

  const { month, currency } = data;
  const groups = getCategoryGroups(month.categories);
  const frei = month.to_be_budgeted;
  const freiNegative = frei < 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <a
            href="https://app.ynab.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none' }}
          >
            <YnabLogo />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1D23', letterSpacing: -0.2 }}>
              YNAB
            </span>
          </a>
          <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>
            {formatMonthName(month.month)}
          </span>
        </div>
        {month.age_of_money != null && (
          <span
            style={{
              fontSize: 11,
              color: '#6B7280',
              fontWeight: 500,
              background: 'rgba(0,0,0,0.04)',
              borderRadius: 99,
              padding: '3px 10px',
            }}
          >
            Alter des Geldes: {month.age_of_money} Tage
          </span>
        )}
      </div>

      {/* KPI Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          marginBottom: 14,
          flexShrink: 0,
        }}
      >
        <KpiCard
          label="Frei zu budg."
          value={formatCurrency(frei, currency)}
          highlight={!freiNegative}
          negative={freiNegative}
        />
        <KpiCard label="Budgetiert" value={formatCurrency(month.budgeted, currency)} />
        <KpiCard label="Ausgegeben" value={formatCurrency(-month.activity, currency)} />
        <KpiCard label="Einnahmen" value={formatCurrency(month.income, currency)} />
      </div>

      {/* Category Group Bars */}
      <div
        style={{
          flex: '1 1 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          overflowY: 'auto',
          minHeight: 0,
        }}
      >
        {groups.length === 0 && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9CA3AF',
              fontSize: 13,
            }}
          >
            Keine Kategorien gefunden
          </div>
        )}
        {groups.map((g) => (
          <GroupBar key={g.name} group={g} currency={currency} />
        ))}
      </div>
    </div>
  );
}
