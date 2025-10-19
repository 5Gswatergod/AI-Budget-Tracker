import { describe, expect, it } from 'vitest';
import {
  buildCsvFromRecords,
  calculateBudgetProgress,
  calculateDailyStreak,
  calculateMonthlySpending,
  formatCurrency,
  getMonthlySeries,
} from './utils';
import type { LedgerRecord } from './ledgerContext';

const baseRecords: LedgerRecord[] = [
  {
    id: '1',
    description: '早餐',
    amount: 120,
    category: '餐飲',
    createdAt: new Date('2024-01-02T08:00:00Z').toISOString(),
  },
  {
    id: '2',
    description: '捷運',
    amount: 50,
    category: '交通',
    createdAt: new Date('2024-01-03T08:00:00Z').toISOString(),
  },
  {
    id: '3',
    description: '午餐',
    amount: 180,
    category: '餐飲',
    createdAt: new Date('2024-02-01T08:00:00Z').toISOString(),
  },
];

describe('ledger utils', () => {
  it('formats currency without decimals', () => {
    expect(formatCurrency(1234, 'zh-TW', 'TWD')).toContain('1,234');
  });

  it('builds monthly series sorted by month', () => {
    const series = getMonthlySeries(baseRecords);
    expect(series).toEqual([
      { month: '2024-01', value: 170 },
      { month: '2024-02', value: 180 },
    ]);
  });

  it('calculates daily streak based on consecutive days', () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const streakRecords: LedgerRecord[] = [
      { ...baseRecords[0], id: 'a', createdAt: today.toISOString() },
      { ...baseRecords[1], id: 'b', createdAt: yesterday.toISOString() },
    ];
    expect(calculateDailyStreak(streakRecords)).toBeGreaterThanOrEqual(2);
  });

  it('computes monthly spending for a given reference date', () => {
    const febSpent = calculateMonthlySpending(baseRecords, new Date('2024-02-10'));
    expect(febSpent).toBe(180);
  });

  it('derives budget progress with remaining amount', () => {
    const { spent, remaining, ratio } = calculateBudgetProgress(baseRecords, 500, new Date('2024-01-31'));
    expect(spent).toBe(170);
    expect(remaining).toBe(330);
    expect(ratio).toBeCloseTo(0.34, 2);
  });

  it('exports records to CSV with quoted values', () => {
    const csv = buildCsvFromRecords(baseRecords);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('id,description,amount,category,createdAt');
    expect(lines).toHaveLength(baseRecords.length + 1);
    expect(lines[1]).toContain('早餐');
  });
});
