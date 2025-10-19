import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  ledgerCategories,
  type LedgerRecord,
  useLedger,
} from './ledgerContext';
import { formatCurrency, formatDate } from './utils';

type FormState = {
  description: string;
  amount: string;
  category: (typeof ledgerCategories)[number];
  createdAt: string;
};

function getDefaultFormState(): FormState {
  return {
    description: '',
    amount: '',
    category: ledgerCategories[0],
    createdAt: new Date().toISOString(),
  };
}

export default function LedgerPage() {
  const { records, addRecord, updateRecord, removeRecord, syncStatus, syncError, syncNow, isSyncConfigured, lastSyncedAt } =
    useLedger();
  const [formState, setFormState] = useState<FormState>(getDefaultFormState);
  const [editing, setEditing] = useState<LedgerRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalSpent = useMemo(
    () => records.reduce((sum, record) => sum + record.amount, 0),
    [records],
  );

  const monthlySpent = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    return records.reduce((sum, record) => {
      const date = new Date(record.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      return key === monthKey ? sum + record.amount : sum;
    }, 0);
  }, [records]);

  const averageTicket = useMemo(() => {
    if (!records.length) return 0;
    return Math.round(totalSpent / records.length);
  }, [records, totalSpent]);

  const topCategory = useMemo(() => {
    if (!records.length) return null;
    const categories = records.reduce<Record<string, number>>((acc, record) => {
      acc[record.category] = (acc[record.category] ?? 0) + record.amount;
      return acc;
    }, {});
    const [category, amount] = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
    return { category, amount };
  }, [records]);

  const sortedRecords = useMemo(
    () =>
      [...records].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [records],
  );

  function resetForm() {
    setFormState(getDefaultFormState());
    setEditing(null);
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(formState.amount);
    if (!formState.description.trim()) {
      setError('請輸入支出描述');
      return;
    }
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('金額需為大於 0 的數字');
      return;
    }

    const payload = {
      description: formState.description.trim(),
      amount: Math.round(parsedAmount),
      category: formState.category,
      createdAt: new Date(formState.createdAt).toISOString(),
    };

    if (editing) {
      updateRecord({ ...editing, ...payload });
    } else {
      addRecord(payload);
    }

    resetForm();
  }

  function handleEdit(record: LedgerRecord) {
    setEditing(record);
    setFormState({
      description: record.description,
      amount: String(record.amount),
      category: record.category,
      createdAt: record.createdAt,
    });
    setError(null);
  }

  function handleDelete(id: string) {
    removeRecord(id);
    if (editing?.id === id) {
      resetForm();
    }
  }

  return (
    <div className="min-h-screen bg-bgdark p-6 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-semibold text-primary">我的記帳</h2>
              {isSyncConfigured ? (
                <button
                  type="button"
                  onClick={syncNow}
                  className={`text-xs font-semibold transition ${
                    syncStatus === 'syncing'
                      ? 'text-primary'
                      : syncStatus === 'error'
                        ? 'text-red-300'
                        : 'text-gray-400 hover:text-primary'
                  }`}
                >
                  {syncStatus === 'syncing'
                    ? '同步中…'
                    : syncStatus === 'success'
                      ? `已同步 ${lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString('zh-TW') : ''}`
                      : syncStatus === 'error'
                        ? '同步失敗，點擊重試'
                        : '手動同步'}
                </button>
              ) : (
                <span className="text-xs text-gray-500">離線模式（僅儲存於此裝置）</span>
              )}
            </div>
            <p className="text-sm text-gray-400">追蹤每日收支，掌握財務節奏</p>
            {syncError && (
              <p className="text-xs text-red-300">同步發生問題：{syncError}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="border-primary/30 bg-primary/10">
              <CardContent className="space-y-1">
                <p className="text-xs text-primary">累計支出</p>
                <p className="text-lg font-semibold text-white">{formatCurrency(totalSpent)}</p>
              </CardContent>
            </Card>
            <Card className="border-white/10">
              <CardContent className="space-y-1">
                <p className="text-xs text-gray-400">本月支出</p>
                <p className="text-lg font-semibold text-white">{formatCurrency(monthlySpent)}</p>
              </CardContent>
            </Card>
            <Card className="border-white/10">
              <CardContent className="space-y-1">
                <p className="text-xs text-gray-400">平均每筆</p>
                <p className="text-lg font-semibold text-white">{formatCurrency(averageTicket)}</p>
              </CardContent>
            </Card>
            <Card className="border-white/10">
              <CardContent className="space-y-1">
                <p className="text-xs text-gray-400">主要分類</p>
                <p className="text-lg font-semibold text-white">
                  {topCategory ? `${topCategory.category} ${formatCurrency(topCategory.amount)}` : '尚無資料'}
                </p>
              </CardContent>
            </Card>
          </div>
        </header>

        <Card className="border-primary/20 bg-gray-900/70">
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {editing ? '編輯支出' : '新增支出紀錄'}
                </h3>
                {editing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-sm text-primary hover:text-primary/80"
                  >
                    取消編輯
                  </button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-gray-300">項目描述</span>
                  <input
                    type="text"
                    value={formState.description}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="例如：早餐、捷運、訂閱費"
                    className="w-full rounded-lg border border-white/10 bg-gray-800/80 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-gray-300">金額</span>
                  <input
                    type="number"
                    min="0"
                    value={formState.amount}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, amount: event.target.value }))
                    }
                    placeholder="請輸入新台幣金額"
                    className="w-full rounded-lg border border-white/10 bg-gray-800/80 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-gray-300">分類</span>
                  <select
                    value={formState.category}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        category: event.target.value as FormState['category'],
                      }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-gray-800/80 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  >
                    {ledgerCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-gray-300">日期</span>
                  <input
                    type="date"
                    value={formState.createdAt.slice(0, 10)}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        createdAt: new Date(event.target.value).toISOString(),
                      }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-gray-800/80 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                    required
                  />
                </label>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-black transition hover:bg-primary/80"
                >
                  {editing ? '更新紀錄' : '新增紀錄'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">近期紀錄</h3>
            <p className="text-xs text-gray-400">共 {records.length} 筆</p>
          </div>
          {sortedRecords.length === 0 ? (
            <Card className="border-dashed border-white/10 bg-gray-900/40">
              <CardContent className="text-center text-sm text-gray-400">
                尚無紀錄，先新增一筆吧！
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedRecords.map((record) => (
                <Card key={record.id} className="border-white/10 bg-gray-900/80">
                  <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-white">{record.description}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                        <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-primary">
                          {record.category}
                        </span>
                        <span>{formatDate(record.createdAt)}</span>
                        <span className="text-gray-500">ID: {record.id.slice(-6)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 md:flex-row md:items-center">
                      <p className="text-xl font-semibold text-accent">
                        {formatCurrency(record.amount)}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(record)}
                          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 transition hover:border-primary/60 hover:text-primary"
                        >
                          編輯
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(record.id)}
                          className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10"
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
