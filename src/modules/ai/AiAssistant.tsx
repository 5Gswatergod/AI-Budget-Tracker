import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, Send, Sparkles } from 'lucide-react';
import { useLedger } from '../ledger/ledgerContext';
import { useBilling } from '../billing/billingContext';
import {
  formatCurrency,
  formatDate,
  getLatestRecord,
  getMonthlySeries,
  getTopCategory,
  groupByCategory,
  sortByNewest,
} from '../ledger/utils';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  createdAt: string;
};

type UsageState = {
  dateKey: string;
  count: number;
};

const AI_ENDPOINT = import.meta.env.VITE_AI_ENDPOINT ?? '';
const USAGE_KEY = 'ai-budget-assistant-usage';
const MAX_FREE_MESSAGES = 5;

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
}

function buildOverview(recordsLength: number, totalSpent: number, topCategory?: {
  category: string;
  amount: number;
}) {
  if (!recordsLength) {
    return '還沒有任何記帳紀錄，先到左側新增支出，就能看到專屬分析建議囉！';
  }

  if (!topCategory) {
    return `目前共 ${recordsLength} 筆紀錄，累計支出 ${formatCurrency(totalSpent)}。`;
  }

  return `目前共 ${recordsLength} 筆紀錄，累計支出 ${formatCurrency(totalSpent)}。其中 ${topCategory.category} 佔比最高，已花費 ${formatCurrency(topCategory.amount)}。`;
}

function generateReply(question: string, options: {
  recordsLength: number;
  totalSpent: number;
  topCategory?: { category: string; amount: number };
  latestRecord?: { description: string; amount: number; createdAt: string; category: string };
  monthlyTrend: Array<{ month: string; value: number }>;
}): string {
  const { recordsLength, totalSpent, topCategory, latestRecord, monthlyTrend } = options;
  const normalized = question.trim().toLowerCase();

  if (!recordsLength) {
    return '目前還沒有任何記帳資料，先在「我的記帳」頁面新增支出後，我就能提供分析囉！';
  }

  const responses: string[] = [];

  if (/總|總共|total|全部/.test(normalized)) {
    responses.push(`截至目前為止共紀錄 ${recordsLength} 筆，累計支出 ${formatCurrency(totalSpent)}。`);
  }

  if (/(類別|分類|category)/.test(normalized) && topCategory) {
    responses.push(`支出最多的分類是 ${topCategory.category}，已花費 ${formatCurrency(topCategory.amount)}。`);
  }

  if (/(最近|latest|new)/.test(normalized) && latestRecord) {
    responses.push(
      `最近一筆是 ${formatDate(latestRecord.createdAt)} 的 ${latestRecord.description}，金額 ${formatCurrency(latestRecord.amount)} (${latestRecord.category})。`,
    );
  }

  if (/(月|趨勢|trend|history)/.test(normalized) && monthlyTrend.length) {
    const latest = monthlyTrend.at(-1)!;
    responses.push(`最近的月份（${latest.month}）支出 ${formatCurrency(latest.value)}。`);
    if (monthlyTrend.length >= 2) {
      const previous = monthlyTrend.at(-2)!;
      const diff = latest.value - previous.value;
      const diffText =
        diff === 0
          ? '與上個月持平'
          : diff > 0
            ? `比上月多 ${formatCurrency(Math.abs(diff))}`
            : `比上月少 ${formatCurrency(Math.abs(diff))}`;
      responses.push(diffText);
    }
  }

  if (/(建議|節省|省錢|tips|suggest)/.test(normalized)) {
    if (topCategory) {
      responses.push(`可以從 ${topCategory.category} 分類開始檢視，設定本月上限有助於守住預算。`);
    } else {
      responses.push('目前紀錄分布平均，可替每個分類設定預算提醒，避免超支。');
    }
  }

  if (!responses.length) {
    responses.push(buildOverview(recordsLength, totalSpent, topCategory));
  }

  return responses.join('\n');
}

function loadUsage(): UsageState {
  if (typeof window === 'undefined') {
    return { dateKey: new Date().toISOString().slice(0, 10), count: 0 };
  }
  try {
    const raw = window.localStorage.getItem(USAGE_KEY);
    if (!raw) {
      return { dateKey: new Date().toISOString().slice(0, 10), count: 0 };
    }
    const parsed = JSON.parse(raw) as UsageState;
    return {
      dateKey: parsed.dateKey ?? new Date().toISOString().slice(0, 10),
      count: Number(parsed.count ?? 0),
    };
  } catch (error) {
    console.warn('Failed to read assistant usage from storage', error);
    return { dateKey: new Date().toISOString().slice(0, 10), count: 0 };
  }
}

function persistUsage(usage: UsageState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
}

export default function AiAssistant() {
  const { records } = useLedger();
  const { plan } = useBilling();
  const containerRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usage, setUsage] = useState<UsageState>(() => loadUsage());

  const totalSpent = useMemo(() => records.reduce((sum, record) => sum + record.amount, 0), [records]);
  const topCategory = useMemo(() => getTopCategory(records), [records]);
  const latestRecord = useMemo(() => getLatestRecord(records), [records]);
  const monthlyTrend = useMemo(() => getMonthlySeries(records), [records]);
  const categoryShare = useMemo(() => groupByCategory(records), [records]);
  const recentRecords = useMemo(() => sortByNewest(records).slice(0, 10), [records]);

  const overview = useMemo(
    () => buildOverview(records.length, totalSpent, topCategory ?? undefined),
    [records.length, totalSpent, topCategory],
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createId(),
      role: 'assistant',
      text: overview,
      createdAt: new Date().toISOString(),
    },
  ]);

  useEffect(() => {
    setMessages((prev) => {
      if (!prev.length) {
        return [
          {
            id: createId(),
            role: 'assistant',
            text: overview,
            createdAt: new Date().toISOString(),
          },
        ];
      }
      const [first, ...rest] = prev;
      if (first.role !== 'assistant') {
        return prev;
      }
      if (first.text === overview) {
        return prev;
      }
      return [
        { ...first, text: overview, createdAt: new Date().toISOString() },
        ...rest,
      ];
    });
  }, [overview]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    persistUsage(usage);
  }, [usage]);

  useEffect(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    if (usage.dateKey !== todayKey) {
      setUsage({ dateKey: todayKey, count: 0 });
    }
  }, [usage.dateKey]);

  const freeRemaining = plan === 'free' ? Math.max(MAX_FREE_MESSAGES - usage.count, 0) : null;
  const canCallRemote = plan !== 'free' && Boolean(AI_ENDPOINT);

  async function requestAiReply(question: string) {
    const payload = {
      question,
      locale: 'zh-TW',
      ledger: {
        totalSpent,
        recordsCount: records.length,
        topCategory,
        latestRecord,
        monthlyTrend,
        categories: categoryShare,
        recentRecords: recentRecords.map((record) => ({
          description: record.description,
          amount: record.amount,
          category: record.category,
          createdAt: record.createdAt,
        })),
      },
    };

    const response = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json().catch(() => ({}));
    return (data.reply ?? data.message ?? '').toString();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!question) return;

    const todayKey = new Date().toISOString().slice(0, 10);
    const usageCount = usage.dateKey === todayKey ? usage.count : 0;
    if (plan === 'free' && usageCount >= MAX_FREE_MESSAGES) {
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: 'assistant',
          text: '免費方案每日最多提問 5 次，升級 PRO 以解鎖無限制的 AI 對話與雲端建議。',
          createdAt: new Date().toISOString(),
        },
      ]);
      setInput('');
      return;
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      text: question,
      createdAt: new Date().toISOString(),
    };

    const fallback = generateReply(question, {
      recordsLength: records.length,
      totalSpent,
      topCategory: topCategory ? { category: topCategory.category, amount: topCategory.amount } : undefined,
      latestRecord: latestRecord
        ? {
            description: latestRecord.description,
            amount: latestRecord.amount,
            createdAt: latestRecord.createdAt,
            category: latestRecord.category,
          }
        : undefined,
      monthlyTrend,
    });

    const createAssistantMessage = (text: string): ChatMessage => ({
      id: createId(),
      role: 'assistant',
      text,
      createdAt: new Date().toISOString(),
    });

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    setUsage((prev) => {
      const next = {
        dateKey: todayKey,
        count: plan === 'free' ? (prev.dateKey === todayKey ? prev.count + 1 : 1) : prev.count,
      };
      persistUsage(next);
      return next;
    });

    if (!canCallRemote) {
      setMessages((prev) => [...prev, createAssistantMessage(fallback)]);
      setIsLoading(false);
      return;
    }

    try {
      const remote = await requestAiReply(question);
      const finalText = remote?.trim() ? remote : fallback;
      setMessages((prev) => [...prev, createAssistantMessage(finalText)]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '無法連線至 AI 服務';
      setMessages((prev) => [
        ...prev,
        createAssistantMessage(`${fallback}\n\n⚠️ 無法取得進階建議：${errorMessage}`),
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 rounded-2xl border border-primary/30 bg-gray-900/95 p-4 shadow-2xl backdrop-blur">
      <div className="mb-3 flex items-center gap-2 text-primary">
        <Bot size={20} />
        <span className="font-semibold">AI 助理</span>
        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
          <Sparkles size={12} /> Smart Insights
        </span>
      </div>
      <p className="mb-3 text-xs text-gray-400">
        {plan === 'free'
          ? `免費方案每日可提問 ${MAX_FREE_MESSAGES} 次，剩餘 ${freeRemaining ?? 0} 次。`
          : '已啟用進階分析，可獲得長期趨勢與情境化建議。'}
      </p>
      <div ref={containerRef} className="mb-3 max-h-60 space-y-3 overflow-y-auto pr-1 text-sm">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === 'assistant'
                ? 'rounded-xl border border-primary/20 bg-primary/5 p-3 text-primary'
                : 'rounded-xl border border-white/10 bg-gray-800/80 p-3 text-gray-100'
            }
          >
            <p className="whitespace-pre-line leading-relaxed">{message.text}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">
              {new Date(message.createdAt).toLocaleTimeString('zh-TW', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-primary">
            <Loader2 className="h-3 w-3 animate-spin" /> 正在整理你的帳本洞察…
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="問我：如何降低咖啡支出？"
          className="flex-1 rounded-lg border border-white/10 bg-gray-800/80 px-3 py-2 text-sm text-gray-100 focus:border-primary focus:outline-none"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-black transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={14} />}
          <span>{isLoading ? '思考中' : '發送'}</span>
        </button>
      </form>
    </div>
  );
}
