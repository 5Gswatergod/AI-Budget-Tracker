import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLedger } from '../ledger/ledgerContext';
import {
  buildCsvFromRecords,
  calculateDailyStreak,
  calculateMonthlySpending,
  formatCurrency,
  getLatestRecord,
  getMonthlySeries,
  getTopCategory,
  groupByCategory,
} from '../ledger/utils';

const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#f97316', '#22d3ee'];

export default function Dashboard() {
  const { records } = useLedger();
  const hasRecords = records.length > 0;

  const categoryData = useMemo(() => {
    const totals = groupByCategory(records);
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

  const monthlySeries = useMemo(() => getMonthlySeries(records), [records]);

  const monthlyChange = useMemo(() => {
    if (monthlySeries.length < 2) return null;
    const latest = monthlySeries.at(-1)!;
    const previous = monthlySeries.at(-2)!;
    const diff = latest.value - previous.value;
    const percentage = previous.value === 0 ? null : (diff / previous.value) * 100;
    return { latest, previous, diff, percentage };
  }, [monthlySeries]);

  const topCategory = useMemo(() => getTopCategory(records), [records]);
  const latestRecord = useMemo(() => getLatestRecord(records), [records]);
  const totalSpent = useMemo(() => records.reduce((sum, record) => sum + record.amount, 0), [records]);
  const monthlySpent = useMemo(() => calculateMonthlySpending(records), [records]);
  const averageTicket = useMemo(() => (records.length ? Math.round(totalSpent / records.length) : 0), [records, totalSpent]);
  const streak = useMemo(() => calculateDailyStreak(records), [records]);

  const handleExport = () => {
    if (!hasRecords || typeof window === 'undefined') return;
    const csv = buildCsvFromRecords(records);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-bgdark pb-16 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pt-10">
        <header className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-primary">支出分析儀表板</h2>
            <p className="text-sm text-gray-400">
              即時匯總所有帳本紀錄，追蹤分類佔比、月度趨勢與重點事件。
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={!hasRecords}
            className="flex items-center gap-2 rounded-lg border border-primary/40 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" /> 匯出 CSV 報表
          </button>
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-primary/30 bg-primary/10">
            <CardContent className="space-y-1">
              <p className="text-xs text-primary">累計支出</p>
              <p className="text-2xl font-semibold text-white">{formatCurrency(totalSpent)}</p>
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
              <p className="text-xs text-gray-400">連續記帳</p>
              <p className="text-lg font-semibold text-white">{streak} 天</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-white/10 bg-gray-900/70">
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">月度趨勢</h3>
                {monthlyChange && (
                  <span className={`text-xs ${monthlyChange.diff > 0 ? 'text-red-300' : monthlyChange.diff < 0 ? 'text-accent' : 'text-gray-400'}`}>
                    {monthlyChange.diff === 0
                      ? '與上月持平'
                      : `${monthlyChange.diff > 0 ? '較上月增加' : '較上月減少'} ${formatCurrency(Math.abs(monthlyChange.diff))}`}
                    {monthlyChange.percentage != null && monthlyChange.percentage !== Infinity
                      ? ` (${monthlyChange.percentage > 0 ? '+' : ''}${monthlyChange.percentage.toFixed(1)}%)`
                      : ''}
                  </span>
                )}
              </div>
              {monthlySeries.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthlySeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" tickFormatter={(value) => `${Math.round(value / 1000)}k`} width={48} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400">累積足夠的紀錄後，這裡會顯示每月支出曲線。</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-gray-900/70">
            <CardContent className="space-y-4">
              <h3 className="text-lg font-semibold text-white">分類佔比</h3>
              {categoryData.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" outerRadius={100} label className="text-xs">
                      {categoryData.map((entry, index) => (
                        <Cell key={`slice-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400">目前沒有分類資料，先在記帳頁新增一筆吧！</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-white/10 bg-gray-900/70">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">分類花費排行榜</h3>
              <span className="text-xs text-gray-500">依照本月累計支出排序</span>
            </div>
            {categoryData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" tickFormatter={(value) => `${Math.round(value / 1000)}k`} width={48} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Bar dataKey="value" name="支出" radius={[6, 6, 0, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`bar-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400">還沒有分類紀錄，完成挑戰中心的節流任務後會更有感！</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-gray-900/70">
          <CardContent className="space-y-4 text-sm text-gray-300">
            <h3 className="text-lg font-semibold text-white">重點洞察</h3>
            <ul className="space-y-3">
              <li>
                ✅ 最大支出分類：{topCategory ? `${topCategory.category}（${formatCurrency(topCategory.amount)}）` : '尚無資料'}
              </li>
              <li>
                🔄 最新紀錄：
                {latestRecord
                  ? `${latestRecord.description} · ${formatCurrency(latestRecord.amount)} · ${new Date(latestRecord.createdAt).toLocaleDateString('zh-TW')}`
                  : '尚未新增紀錄'}
              </li>
              <li>
                📈 本月趨勢：
                {monthlyChange
                  ? `${monthlyChange.latest.month} 共 ${formatCurrency(monthlyChange.latest.value)}，較 ${monthlyChange.previous.month} ${monthlyChange.diff >= 0 ? '增加' : '減少'} ${formatCurrency(Math.abs(monthlyChange.diff))}`
                  : '紀錄不足，待累積更多資料'}
              </li>
              <li>🧾 累積紀錄：{records.length} 筆（平均 {formatCurrency(averageTicket)}）</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
