import { useMemo, useState } from 'react';
import { Flame, PlusCircle, Target, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  calculateBudgetProgress,
  calculateDailyStreak,
  calculateMonthlySpending,
  formatCurrency,
  getLatestRecord,
  getMonthlySeries,
} from '../ledger/utils';
import { useLedger } from '../ledger/ledgerContext';

type CustomChallenge = {
  id: string;
  title: string;
  monthlyBudget: number;
};

const STORAGE_KEY = 'ai-budget-custom-challenges';

function loadCustomChallenges(): CustomChallenge[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomChallenge[];
    return parsed.map((challenge) => ({
      ...challenge,
      monthlyBudget: Number(challenge.monthlyBudget),
    }));
  } catch (error) {
    console.warn('Failed to load custom challenges', error);
    return [];
  }
}

function persistCustomChallenges(challenges: CustomChallenge[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(challenges));
}

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 9);
}

export default function ChallengeCenter() {
  const { records } = useLedger();
  const [customChallenges, setCustomChallenges] = useState<CustomChallenge[]>(loadCustomChallenges);
  const [form, setForm] = useState({ title: '', monthlyBudget: '15000' });

  const streak = useMemo(() => calculateDailyStreak(records), [records]);
  const monthlySpent = useMemo(() => calculateMonthlySpending(records), [records]);
  const monthlyEntries = useMemo(() => getMonthlySeries(records).at(-1)?.value ?? 0, [records]);
  const latest = useMemo(() => getLatestRecord(records), [records]);

  const defaultChallenges = useMemo(
    () => [
      {
        id: 'streak-7',
        title: '連續記帳 7 天',
        description: '每天至少記錄一筆支出，建立穩定習慣。',
        goal: 7,
        progress: streak,
        unit: '天',
      },
      {
        id: 'entries-20',
        title: '本月 20 筆紀錄',
        description: '保持每週至少 5 筆記帳，月底即可達成。',
        goal: 20,
        progress: monthlyEntries,
        unit: '筆',
      },
      {
        id: 'budget-15000',
        title: '支出控制在 NT$15,000 內',
        description: '為自己設定每月上限，守住核心預算。',
        goal: 15000,
        progress: monthlySpent,
        unit: '元',
      },
    ],
    [monthlyEntries, monthlySpent, streak],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    const monthlyBudget = Number(form.monthlyBudget);
    if (Number.isNaN(monthlyBudget) || monthlyBudget <= 0) return;
    const challenge: CustomChallenge = {
      id: createId(),
      title: form.title.trim(),
      monthlyBudget,
    };
    const next = [...customChallenges, challenge];
    setCustomChallenges(next);
    persistCustomChallenges(next);
    setForm({ title: '', monthlyBudget: '15000' });
  };

  const handleRemove = (id: string) => {
    const next = customChallenges.filter((challenge) => challenge.id !== id);
    setCustomChallenges(next);
    persistCustomChallenges(next);
  };

  return (
    <div className="min-h-screen bg-bgdark pb-20 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pt-10">
        <header className="space-y-2">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-primary">
            <Trophy className="h-4 w-4" /> Challenge Hub
          </p>
          <h1 className="text-3xl font-semibold text-white">挑戰中心</h1>
          <p className="text-sm text-gray-400">
            建立專屬的財務挑戰、追蹤進度，讓理想的用錢習慣成為日常。
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {defaultChallenges.map((challenge) => {
            const ratio = Math.min(challenge.progress / challenge.goal, 1);
            const isCompleted = challenge.progress >= challenge.goal;
            return (
              <Card key={challenge.id} className="border-white/10 bg-gray-900/70">
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">{challenge.title}</h2>
                    {isCompleted ? <Trophy className="h-5 w-5 text-accent" /> : <Target className="h-5 w-5 text-primary" />}
                  </div>
                  <p className="text-sm text-gray-400">{challenge.description}</p>
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>
                        進度 {Math.min(challenge.progress, challenge.goal)} / {challenge.goal} {challenge.unit}
                      </span>
                      {isCompleted && <span className="text-accent">已完成</span>}
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-gray-800">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${Math.round(ratio * 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-6 rounded-2xl border border-white/10 bg-gray-900/70 p-6 md:grid-cols-[2fr,1fr]">
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Flame className="h-5 w-5 text-accent" /> 自訂節流挑戰
            </h2>
            <p className="text-sm text-gray-400">
              設定理想的月支出上限，讓系統自動追蹤並提醒剩餘彈性。支出會以當月所有紀錄即時更新。
            </p>
            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[2fr,1fr,auto]">
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="挑戰名稱，例如：3 月咖啡控管"
                className="rounded-lg border border-white/10 bg-gray-800/70 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                required
              />
              <input
                type="number"
                min="0"
                value={form.monthlyBudget}
                onChange={(event) => setForm((prev) => ({ ...prev, monthlyBudget: event.target.value }))}
                placeholder="月支出上限"
                className="rounded-lg border border-white/10 bg-gray-800/70 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                required
              />
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-black transition hover:bg-primary/80"
              >
                <PlusCircle className="h-4 w-4" /> 建立
              </button>
            </form>
            <div className="space-y-4">
              {customChallenges.length === 0 ? (
                <p className="rounded-lg border border-dashed border-white/10 bg-gray-900/50 p-4 text-xs text-gray-500">
                  尚未建立挑戰。輸入月支出上限後按下「建立」，系統會即時顯示達成度。
                </p>
              ) : (
                customChallenges.map((challenge) => {
                  const progress = calculateBudgetProgress(records, challenge.monthlyBudget);
                  const percent = Math.round(progress.ratio * 100);
                  const isSafe = progress.spent <= challenge.monthlyBudget;
                  return (
                    <div
                      key={challenge.id}
                      className="rounded-xl border border-white/10 bg-gray-950/60 p-4 shadow-inner"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-white">{challenge.title}</h3>
                          <p className="text-xs text-gray-400">
                            目標 {formatCurrency(challenge.monthlyBudget)} ・ 已花 {formatCurrency(progress.spent)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemove(challenge.id)}
                          className="text-xs text-gray-500 transition hover:text-red-300"
                        >
                          移除
                        </button>
                      </div>
                      <div className="mt-3 h-2 w-full rounded-full bg-gray-800">
                        <div
                          className={`h-2 rounded-full ${isSafe ? 'bg-accent' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-400">
                        {isSafe
                          ? `還有 ${formatCurrency(progress.remaining)} 可以運用`
                          : '已超出目標，建議重新檢視近期支出項目'}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <aside className="space-y-4 rounded-xl border border-primary/20 bg-primary/10 p-5 text-sm text-primary">
            <h3 className="text-base font-semibold text-primary">即時小結</h3>
            <ul className="space-y-2">
              <li>連續記帳：{streak} 天</li>
              <li>本月累計：{formatCurrency(monthlySpent)}</li>
              {latest ? (
                <li>
                  最新紀錄：{latest.description} ・ {formatCurrency(latest.amount)} ・{' '}
                  {new Date(latest.createdAt).toLocaleDateString('zh-TW')}
                </li>
              ) : (
                <li>尚未新增紀錄，先到「我的記帳」開始吧！</li>
              )}
            </ul>
            <p className="rounded-lg bg-primary/10 p-3 text-xs text-primary/80">
              建議每月檢視挑戰表現，逐步調整目標，打造可持續的財務習慣。
            </p>
          </aside>
        </section>
      </div>
    </div>
  );
}
