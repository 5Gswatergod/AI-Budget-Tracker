import Constants from 'expo-constants';
import dayjs from 'dayjs';
import { LedgerRecord, PlanTier } from '@/types';

const resolveEndpoint = () => {
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  return (
    extra?.EXPO_PUBLIC_AI_ENDPOINT ||
    (Constants?.manifest2 as any)?.extra?.EXPO_PUBLIC_AI_ENDPOINT ||
    process.env.EXPO_PUBLIC_AI_ENDPOINT ||
    ''
  );
};

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);

const fallbackInsights = (question: string, ledger: LedgerRecord[], currency: string) => {
  if (!ledger.length) {
    return '目前沒有任何記帳紀錄，先新增一筆支出或收入吧！';
  }
  const last7Days = dayjs().subtract(7, 'day');
  const weeklyTotal = ledger
    .filter((record) => dayjs(record.date).isAfter(last7Days) && record.type === 'expense')
    .reduce((sum, record) => sum + record.amount, 0);

  const topCategory = ledger
    .filter((record) => record.type === 'expense')
    .reduce<Record<string, number>>((acc, record) => {
      acc[record.category] = (acc[record.category] ?? 0) + record.amount;
      return acc;
    }, {});

  const [categoryName, categoryTotal] = Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0] ?? [
    '其他',
    0
  ];

  return [
    `最近 7 天的支出共 ${formatCurrency(weeklyTotal, currency)}。`,
    `花費最多的分類是「${categoryName}」，累積 ${formatCurrency(categoryTotal, currency)}。`,
    question.includes('咖啡') ? '試著將每日咖啡預算設定在 120 元內，能有效控管支出。' : '若想獲得更進階的財務建議，建議升級方案並串接專屬 AI 模型。'
  ].join('\n');
};

export interface AiRequest {
  question: string;
  ledger: LedgerRecord[];
  plan: PlanTier;
  currency: string;
}

export interface AiResponse {
  reply: string;
  meta?: { tokens?: number; latencyMs?: number };
  usedFallback: boolean;
}

export const askAssistant = async ({ question, ledger, plan, currency }: AiRequest): Promise<AiResponse> => {
  const endpoint = resolveEndpoint();
  if (!endpoint) {
    return { reply: fallbackInsights(question, ledger, currency), usedFallback: true };
  }
  const started = Date.now();
  try {
    const response = await fetch(`${endpoint.replace(/\/$/, '')}/ai/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, ledger, plan })
    });
    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }
    const payload = (await response.json()) as { reply?: string; meta?: { tokens?: number; latencyMs?: number } };
    if (!payload.reply) {
      throw new Error('AI response missing reply');
    }
    const latency = payload.meta?.latencyMs ?? Date.now() - started;
    return { reply: payload.reply, meta: { ...payload.meta, latencyMs: latency }, usedFallback: false };
  } catch (error) {
    return { reply: fallbackInsights(question, ledger, currency), usedFallback: true };
  }
};
