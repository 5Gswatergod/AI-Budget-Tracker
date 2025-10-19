import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Cloud,
  Download,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useLedger } from '@/modules/ledger/ledgerContext';
import { useBilling, type BillingPlan } from '@/modules/billing/billingContext';
import {
  buildCsvFromRecords,
  calculateDailyStreak,
  calculateMonthlySpending,
  formatCurrency,
} from '@/modules/ledger/utils';

const planDisplay: Record<BillingPlan, { label: string; description: string }> = {
  free: {
    label: 'Free',
    description: '僅限本地儲存與每日 5 次 AI 問答。',
  },
  pro: {
    label: 'Pro',
    description: '解鎖無限 AI 問答與自訂同步端點。',
  },
  enterprise: {
    label: 'Enterprise',
    description: '支援客製化權限、團隊工作區與 SLA。',
  },
};

type StatCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
};

function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-gray-900/60 p-5 shadow-lg shadow-black/30">
      <div className="flex items-center gap-3 text-sm text-gray-400">
        <span className="rounded-full bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
      {description ? <p className="mt-2 text-xs text-gray-500">{description}</p> : null}
    </div>
  );
}

const planOptions: BillingPlan[] = ['free', 'pro', 'enterprise'];

export default function AdminPanel() {
  const {
    records,
    removeRecord,
    syncNow,
    syncStatus,
    syncError,
    lastSyncedAt,
    isSyncConfigured,
  } = useLedger();
  const {
    plan,
    trialEndsAt,
    isTrialing,
    upgradePlan,
    cancelSubscription,
    manageSubscription,
    isProcessing,
    billingError,
    isBillingPortalConfigured,
  } = useBilling();

  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [awaitingSyncResult, setAwaitingSyncResult] = useState(false);

  const totals = useMemo(() => {
    const total = records.reduce((sum, record) => sum + record.amount, 0);
    const categories = new Set(records.map((record) => record.category)).size;
    const average = records.length ? Math.round(total / records.length) : 0;
    return {
      total,
      categories,
      average,
      count: records.length,
    };
  }, [records]);

  const monthlySpending = useMemo(() => calculateMonthlySpending(records), [records]);
  const dailyStreak = useMemo(() => calculateDailyStreak(records), [records]);

  useEffect(() => {
    if (!awaitingSyncResult) return;
    if (syncStatus === 'syncing') return;

    if (syncStatus === 'success') {
      setAdminMessage('同步成功，資料已更新。');
      setAdminError(null);
    } else if (syncStatus === 'error') {
      setAdminError('同步失敗，請檢查端點或錯誤訊息。');
    } else {
      setAdminMessage(`同步狀態：${syncStatus}`);
      setAdminError(null);
    }
    setAwaitingSyncResult(false);
  }, [awaitingSyncResult, syncStatus]);

  const lastSyncedLabel = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString('zh-TW', { hour12: false })
    : '尚未同步';

  const handleSync = async () => {
    if (!isSyncConfigured) {
      setAdminError('尚未設定遠端同步端點，請於環境變數填入 `VITE_SYNC_ENDPOINT`。');
      return;
    }
    setAdminMessage('正在發出同步請求…');
    setAdminError(null);
    setAwaitingSyncResult(true);
    await syncNow();
  };

  const handleExport = () => {
    if (!records.length) {
      setAdminError('目前沒有資料可匯出。');
      return;
    }
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      setAdminError('目前環境不支援檔案匯出。');
      return;
    }
    try {
      const csv = buildCsvFromRecords(records);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `ledger-export-${Date.now()}.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      setAdminMessage('已下載最新帳本 CSV。');
      setAdminError(null);
    } catch (error) {
      setAdminError('匯出過程發生錯誤，請稍後再試。');
      console.error(error);
    }
  };

  const handleWipeRecords = () => {
    if (!records.length) {
      setAdminError('沒有可清除的紀錄。');
      return;
    }
    if (typeof window !== 'undefined') {
      const confirmReset = window.confirm('確定要清除所有帳本紀錄嗎？此操作無法復原。');
      if (!confirmReset) {
        return;
      }
    }
    records.forEach((record) => removeRecord(record.id));
    setAdminMessage('已清除所有帳本紀錄。');
    setAdminError(null);
  };

  const handleUpgrade = async (nextPlan: BillingPlan) => {
    if (nextPlan === plan) {
      setAdminMessage(`目前已是 ${planDisplay[nextPlan].label} 方案。`);
      setAdminError(null);
      return;
    }
    setAdminMessage(`正在切換至 ${planDisplay[nextPlan].label} 方案…`);
    setAdminError(null);
    await upgradePlan({ plan: nextPlan, bypassCheckout: true });
    setAdminMessage(`方案已更新為 ${planDisplay[nextPlan].label}。`);
  };

  const handleCancel = () => {
    cancelSubscription();
    setAdminMessage('已取消訂閱並回到 Free 方案。');
    setAdminError(null);
  };

  const handleManagePortal = async () => {
    if (!isBillingPortalConfigured) {
      setAdminError('尚未設定金流入口端點，請設定 `VITE_BILLING_PORTAL_ENDPOINT`。');
      return;
    }
    setAdminMessage('正在開啟客戶入口…');
    setAdminError(null);
    await manageSubscription();
  };

  const trialInfo = isTrialing && trialEndsAt
    ? `試用結束時間：${new Date(trialEndsAt).toLocaleString('zh-TW', { hour12: false })}`
    : null;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">後台管理中心</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            透過此控制台快速檢視帳本健康度、觸發同步與管理方案設定，確保整體營運狀態穩定。
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-gray-900/60 px-4 py-3 text-xs text-gray-400">
          <div>目前同步狀態：<span className="text-primary">{syncStatus}</span></div>
          <div>最後成功同步：{lastSyncedLabel}</div>
          <div>同步端點：{isSyncConfigured ? '已啟用' : '未設定'}</div>
        </div>
      </div>

      {adminMessage ? (
        <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
          {adminMessage}
        </div>
      ) : null}

      {adminError ? (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {adminError}
        </div>
      ) : null}

      {billingError ? (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {billingError}
        </div>
      ) : null}

      {syncError ? (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {syncError}
        </div>
      ) : null}

      <section>
        <h2 className="text-xl font-semibold text-white">系統概況</h2>
        <p className="mb-4 text-sm text-gray-400">掌握帳本內容與記帳習慣，評估用戶活躍度。</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="帳本筆數"
            value={`${totals.count} 筆`}
            icon={Users}
            description="所有記錄皆會同步至遠端（如有設定）。"
          />
          <StatCard
            title="累計支出"
            value={formatCurrency(totals.total)}
            icon={BarChart3}
            description={`平均單筆 ${totals.count ? formatCurrency(totals.average) : '—'}`}
          />
          <StatCard
            title="本月支出"
            value={formatCurrency(monthlySpending)}
            icon={Cloud}
            description={`持續記帳天數：${dailyStreak} 天`}
          />
          <StatCard
            title="分類覆蓋"
            value={`${totals.categories} 個分類`}
            icon={ShieldCheck}
            description="觀察用戶是否善用多元分類。"
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-gray-900/60 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">資料治理</h3>
            <span className="text-xs text-gray-500">僅限具備管理權限者操作</span>
          </div>
          <p className="mt-2 text-sm text-gray-400">
            匯出帳本或重置資料前，請確保已備份必要資訊，避免造成使用者資料遺失。
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary/90 px-4 py-3 text-sm font-semibold text-black transition hover:bg-primary"
            >
              <Download className="h-4 w-4" /> 匯出帳本 CSV
            </button>
            <button
              type="button"
              onClick={handleSync}
              className="flex items-center justify-center gap-2 rounded-xl border border-primary/50 px-4 py-3 text-sm font-semibold text-primary transition hover:border-primary hover:text-white"
            >
              <RefreshCcw className="h-4 w-4" /> 立即同步遠端
            </button>
            <button
              type="button"
              onClick={handleWipeRecords}
              className="flex items-center justify-center gap-2 rounded-xl border border-red-500/40 px-4 py-3 text-sm font-semibold text-red-300 transition hover:border-red-400 hover:text-white"
            >
              <Trash2 className="h-4 w-4" /> 清除所有紀錄
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-gray-900/60 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">方案與權限</h3>
            <span className="text-xs text-gray-500">調整方案時會同步更新前端限制</span>
          </div>
          <p className="mt-2 text-sm text-gray-400">
            依據用戶需求切換不同方案，或透過客戶入口處理金流與發票。升級與管理操作會透過 BillingProvider 寫入本地狀態。
          </p>
          <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-4 text-sm text-gray-300">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-white">目前方案：{planDisplay[plan].label}</div>
                <p className="text-xs text-gray-400">{planDisplay[plan].description}</p>
              </div>
              {isTrialing ? (
                <span className="rounded-full border border-accent/60 bg-accent/10 px-3 py-1 text-xs text-accent">
                  試用中
                </span>
              ) : null}
            </div>
            {trialInfo ? <div className="mt-2 text-xs text-gray-500">{trialInfo}</div> : null}
          </div>
          <div className="mt-4 grid gap-2 text-sm text-gray-300">
            {planOptions.map((option) => (
              <button
                key={option}
                type="button"
                disabled={isProcessing}
                onClick={() => handleUpgrade(option)}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${
                  option === plan
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-white/10 bg-black/30 text-gray-200 hover:border-primary/50 hover:text-white'
                } ${isProcessing ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div>
                  <div className="font-semibold">{planDisplay[option].label}</div>
                  <div className="text-xs text-gray-400">{planDisplay[option].description}</div>
                </div>
                {option === plan ? <ShieldCheck className="h-4 w-4" /> : null}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <button
              type="button"
              disabled={isProcessing || plan === 'free'}
              onClick={handleCancel}
              className="rounded-xl border border-white/10 px-4 py-2 text-gray-200 transition hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              回到 Free 方案
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleManagePortal}
              className="rounded-xl border border-white/10 px-4 py-2 text-gray-200 transition hover:border-primary/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              開啟客戶入口
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
