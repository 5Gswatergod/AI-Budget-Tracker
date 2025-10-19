import { NavLink, Outlet } from 'react-router-dom';
import { Layers, LayoutDashboard, Medal, Settings2, Sparkles, Wallet2 } from 'lucide-react';
import { useLedger, type SyncStatus } from '@/modules/ledger/ledgerContext';
import { useBilling } from '@/modules/billing/billingContext';

const navItems = [
  { to: '/ledger', label: '我的記帳', icon: Wallet2 },
  { to: '/analytics', label: '數據分析', icon: LayoutDashboard },
  { to: '/challenges', label: '挑戰任務', icon: Medal },
  { to: '/billing', label: '升級方案', icon: Layers },
  { to: '/admin', label: '後台管理', icon: Settings2 },
];

function SyncIndicator() {
  const { syncStatus, lastSyncedAt, syncError, syncNow, isSyncConfigured } = useLedger();

  if (!isSyncConfigured) {
    return <span className="rounded-full bg-gray-800/80 px-3 py-1 text-xs text-gray-400">離線模式</span>;
  }

  const statusText: Record<SyncStatus, string> = {
    idle: '待命',
    syncing: '同步中…',
    success: lastSyncedAt ? `已同步 ${new Date(lastSyncedAt).toLocaleTimeString('zh-TW')}` : '已同步',
    error: syncError ? `同步錯誤：${syncError}` : '同步失敗',
    offline: '離線',
  };

  const color =
    syncStatus === 'success'
      ? 'text-accent'
      : syncStatus === 'error'
        ? 'text-red-300'
        : syncStatus === 'syncing'
          ? 'text-primary'
          : 'text-gray-400';

  return (
    <button
      type="button"
      onClick={() => syncNow()}
      className={`rounded-full border border-white/10 bg-gray-800/80 px-3 py-1 text-xs transition hover:border-primary/40 ${color}`}
    >
      {statusText[syncStatus]}
    </button>
  );
}

function PlanBadge() {
  const { plan, isTrialing } = useBilling();
  return (
    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
      {isTrialing ? '試用中' : plan.toUpperCase()}
    </span>
  );
}

export default function AppShell() {
  return (
    <div className="min-h-screen bg-bgdark text-white">
      <header className="border-b border-white/5 bg-gray-950/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <NavLink to="/ledger" className="flex items-center gap-2 text-lg font-semibold text-primary">
            <Sparkles className="h-5 w-5" /> AI Budget Tracker
          </NavLink>
          <nav className="flex items-center gap-2 text-sm">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 transition ${
                    isActive ? 'bg-primary/20 text-primary' : 'text-gray-300 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <PlanBadge />
            <SyncIndicator />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-8">
        <Outlet />
      </main>
    </div>
  );
}
