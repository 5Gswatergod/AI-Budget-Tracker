import { useMemo, useState } from 'react';
import { Check, Crown, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '../ledger/utils';
import { useBilling, type BillingPlan } from './billingContext';

const planFeatures: Record<BillingPlan, string[]> = {
  free: [
    '每日 5 次 AI 助理提問',
    '無限本地記帳紀錄',
    '匯出 CSV 報表',
  ],
  pro: [
    '無限制 AI 助理對話',
    '自訂分類提醒與挑戰',
    '雲端同步（每日備份）',
    '優先客服支援',
  ],
  enterprise: [
    '跨團隊共享帳本',
    'API 與 Webhook 整合',
    '自訂模型微調建議',
    '專屬財務顧問與部署輔導',
  ],
};

const pricingTable: Record<BillingPlan, { monthly: number; yearly: number }> = {
  free: { monthly: 0, yearly: 0 },
  pro: { monthly: 399, yearly: 3990 },
  enterprise: { monthly: 1499, yearly: 14990 },
};

const planBadges: Record<BillingPlan, { label: string; icon: JSX.Element | null }> = {
  free: { label: '入門', icon: null },
  pro: { label: '人氣', icon: <Crown className="h-4 w-4 text-accent" /> },
  enterprise: { label: '專業', icon: <Shield className="h-4 w-4 text-primary" /> },
};

export default function BillingPortal() {
  const {
    plan,
    trialEndsAt,
    isTrialing,
    billingError,
    isProcessing,
    isBillingPortalConfigured,
    upgradePlan,
    cancelSubscription,
    manageSubscription,
  } = useBilling();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const pricingLabel = useMemo(
    () => (billingCycle === 'yearly' ? '年繳（享 2 個月折扣）' : '月繳'),
    [billingCycle],
  );

  const handleSelect = async (selectedPlan: BillingPlan) => {
    if (selectedPlan === plan) return;
    await upgradePlan(selectedPlan);
  };

  return (
    <div className="min-h-screen bg-bgdark pb-16 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pt-10">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold text-primary">升級方案</h1>
          <p className="text-sm text-gray-400">
            選擇最適合你的財務夥伴。升級後即可解鎖雲端同步、進階挑戰以及無限制的 AI 分析。
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="rounded-full bg-gray-800/80 px-3 py-1">目前方案：{plan.toUpperCase()}</span>
            {isTrialing && trialEndsAt && (
              <span className="rounded-full bg-primary/20 px-3 py-1 text-primary">
                試用至 {new Date(trialEndsAt).toLocaleDateString('zh-TW')}
              </span>
            )}
          </div>
        </header>

        <section className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <span className="font-medium text-white">計費週期</span>
            <button
              type="button"
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                billingCycle === 'monthly' ? 'bg-primary text-black' : 'bg-gray-800 text-gray-300'
              }`}
              onClick={() => setBillingCycle('monthly')}
            >
              月繳
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                billingCycle === 'yearly' ? 'bg-primary text-black' : 'bg-gray-800 text-gray-300'
              }`}
              onClick={() => setBillingCycle('yearly')}
            >
              年繳
            </button>
            <span className="text-xs text-accent">{pricingLabel}</span>
          </div>
          <div className="text-xs text-gray-500">
            {isBillingPortalConfigured
              ? '已串接線上金流，升級後可直接跳轉結帳頁面。'
              : '尚未設定金流端點，升級將直接更新本地方案。'}
          </div>
        </section>

        {billingError && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {billingError}
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-3">
          {(Object.keys(planFeatures) as BillingPlan[]).map((planId) => {
            const price = pricingTable[planId][billingCycle];
            const isCurrent = plan === planId;
            const badge = planBadges[planId];
            return (
              <Card
                key={planId}
                className={`relative border-white/10 bg-gray-900/70 transition hover:border-primary/40 ${
                  isCurrent ? 'ring-2 ring-primary/60' : ''
                }`}
              >
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">{badge.label}</p>
                      <h2 className="text-xl font-semibold text-white">{planId.toUpperCase()}</h2>
                    </div>
                    {badge.icon}
                  </div>
                  <p className="text-3xl font-bold text-primary">
                    {price === 0 ? '免費' : formatCurrency(price)}
                    <span className="ml-1 text-xs text-gray-500">/ {billingCycle === 'monthly' ? '月' : '年'}</span>
                  </p>
                  <ul className="space-y-2 text-sm text-gray-300">
                    {planFeatures[planId].map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-accent" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={isProcessing || isCurrent}
                    onClick={() => handleSelect(planId)}
                    className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      isCurrent
                        ? 'cursor-default border border-primary/30 bg-primary/20 text-primary'
                        : 'bg-primary text-black hover:bg-primary/80'
                    } ${isProcessing ? 'opacity-70' : ''}`}
                  >
                    {isCurrent ? '目前方案' : '選擇方案'}
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-4 rounded-2xl border border-white/10 bg-gray-900/70 p-6 text-sm text-gray-300">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">管理訂閱</h3>
              <p className="text-xs text-gray-500">
                需要變更帳單資訊或發票抬頭？透過客戶入口即可即時更新。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={manageSubscription}
                className="rounded-lg border border-primary/40 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
                disabled={isProcessing}
              >
                開啟客戶入口
              </button>
              <button
                type="button"
                onClick={cancelSubscription}
                className="rounded-lg border border-red-400/40 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
                disabled={plan === 'free' || isProcessing}
              >
                取消訂閱
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            取消後方案將立即降回 Free，雲端備份會在 30 天後自動清除。若你在試用期內取消，不會產生任何費用。
          </p>
        </section>
      </div>
    </div>
  );
}
