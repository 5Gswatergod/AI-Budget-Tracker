import type { LedgerRecord } from './ledgerContext';

function getDateKey(date: Date) {
  const normalized = new Date(date.getTime());
  normalized.setHours(0, 0, 0, 0);
  return normalized.toISOString().slice(0, 10);
}

export function sortByNewest(records: LedgerRecord[]) {
  return [...records].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function formatCurrency(amount: number, locale = 'zh-TW', currency = 'TWD') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date, locale = 'zh-TW') {
  const value = typeof date === 'string' ? new Date(date) : date;
  return value.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });
}

export function groupByCategory(records: LedgerRecord[]) {
  return records.reduce<Record<string, number>>((acc, record) => {
    acc[record.category] = (acc[record.category] ?? 0) + record.amount;
    return acc;
  }, {});
}

export function getMonthlyTotals(records: LedgerRecord[]) {
  return records.reduce<Record<string, number>>((acc, record) => {
    const date = new Date(record.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    acc[key] = (acc[key] ?? 0) + record.amount;
    return acc;
  }, {});
}

export function getLatestRecord(records: LedgerRecord[]) {
  return sortByNewest(records)[0];
}

export function getTopCategory(records: LedgerRecord[]) {
  const byCategory = groupByCategory(records);
  const [category, amount] = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!category) return undefined;
  return { category, amount };
}

export function getMonthlySeries(records: LedgerRecord[]) {
  const totals = getMonthlyTotals(records);
  return Object.entries(totals)
    .map(([month, value]) => ({ month, value }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));
}

export function countRecordsForMonth(records: LedgerRecord[], reference = new Date()) {
  const key = `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, '0')}`;
  return records.filter((record) => {
    const date = new Date(record.createdAt);
    const recordKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return recordKey === key;
  }).length;
}

export function calculateDailyStreak(records: LedgerRecord[]) {
  if (!records.length) return 0;
  const byDay = new Set(records.map((record) => getDateKey(new Date(record.createdAt))));
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = getDateKey(cursor);
    if (!byDay.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function calculateMonthlySpending(records: LedgerRecord[], reference = new Date()) {
  const targetYear = reference.getFullYear();
  const targetMonth = reference.getMonth();
  return records.reduce((total, record) => {
    const date = new Date(record.createdAt);
    if (date.getFullYear() === targetYear && date.getMonth() === targetMonth) {
      return total + record.amount;
    }
    return total;
  }, 0);
}

export function calculateBudgetProgress(records: LedgerRecord[], budget: number, reference = new Date()) {
  const spent = calculateMonthlySpending(records, reference);
  const remaining = Math.max(budget - spent, 0);
  const ratio = budget > 0 ? Math.min(spent / budget, 1) : 0;
  return { spent, remaining, ratio };
}

export function buildCsvFromRecords(records: LedgerRecord[]) {
  const header = ['id', 'description', 'amount', 'category', 'createdAt'];
  const escape = (value: string | number) => {
    const stringified = String(value ?? '');
    if (/[",\n]/.test(stringified)) {
      return `"${stringified.replace(/"/g, '""')}"`;
    }
    return stringified;
  };
  const rows = records.map((record) =>
    [record.id, record.description, record.amount, record.category, new Date(record.createdAt).toISOString()].map(escape).join(','),
  );
  return [header.join(','), ...rows].join('\n');
}
