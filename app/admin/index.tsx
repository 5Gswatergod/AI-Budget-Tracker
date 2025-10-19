import { useMemo, useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import dayjs from 'dayjs';
import Constants from 'expo-constants';
import { useLedgerStore } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { pushRemoteRecords, syncEnabled } from '@/lib/sync/client';
import { listDirtyRecords } from '@/lib/db/ledger';

export default function AdminScreen() {
  const records = useLedgerStore((state) => state.records);
  const sync = useLedgerStore((state) => state.sync);
  const clearLedger = useLedgerStore((state) => state.clearLedger);
  const plan = useLedgerStore((state) => state.plan);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const metrics = useMemo(() => {
    const total = records.length;
    const expense = records.filter((record) => record.type === 'expense').length;
    const income = total - expense;
    const monthStart = dayjs().startOf('month');
    const monthly = records.filter((record) => dayjs(record.date).isAfter(monthStart.subtract(1, 'day'))).length;
    return { total, expense, income, monthly };
  }, [records]);

  const handleForceSync = async () => {
    if (!syncEnabled()) {
      setMessage('尚未設定同步端點');
      return;
    }
    setBusy(true);
    try {
      const dirty = await listDirtyRecords();
      if (dirty.length) {
        await pushRemoteRecords(dirty);
      }
      await sync();
      setMessage('已重新整理同步狀態');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '同步失敗');
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    setBusy(true);
    try {
      await clearLedger();
      setMessage('已清空本地資料');
    } finally {
      setBusy(false);
    }
  };

  const syncEndpoint =
    (Constants.expoConfig?.extra as Record<string, string | undefined> | undefined)?.EXPO_PUBLIC_SYNC_ENDPOINT ||
    (Constants?.manifest2 as any)?.extra?.EXPO_PUBLIC_SYNC_ENDPOINT;
  const billingEndpoint =
    (Constants.expoConfig?.extra as Record<string, string | undefined> | undefined)?.EXPO_PUBLIC_BILLING_ENDPOINT ||
    (Constants?.manifest2 as any)?.extra?.EXPO_PUBLIC_BILLING_ENDPOINT;
  const aiEndpoint =
    (Constants.expoConfig?.extra as Record<string, string | undefined> | undefined)?.EXPO_PUBLIC_AI_ENDPOINT ||
    (Constants?.manifest2 as any)?.extra?.EXPO_PUBLIC_AI_ENDPOINT;

  return (
    <ScrollView className="flex-1 bg-bgdark px-5 pt-6" contentContainerStyle={{ paddingBottom: 60 }}>
      <Card padding="lg">
        <Text className="text-white text-xl font-semibold">開發者控制台</Text>
        <Text className="text-slate-400 text-sm mt-2">快速檢查端點設定、同步狀態與資料健康度。</Text>
      </Card>

      <View className="mt-5 gap-3">
        <Card padding="lg">
          <Text className="text-slate-300 text-sm">方案狀態</Text>
          <Text className="text-white text-2xl font-semibold mt-2">{plan}</Text>
        </Card>
        <Card padding="lg">
          <Text className="text-slate-300 text-sm">紀錄統計</Text>
          <Text className="text-white text-lg mt-2">總筆數 {metrics.total}</Text>
          <Text className="text-slate-400 text-sm mt-2">支出 {metrics.expense}｜收入 {metrics.income}</Text>
          <Text className="text-slate-500 text-xs mt-1">本月新增 {metrics.monthly} 筆</Text>
        </Card>
      </View>

      <Card className="mt-5" padding="lg">
        <Text className="text-white text-base font-semibold">端點設定</Text>
        <View className="mt-3 gap-2">
          <Text className="text-slate-300 text-xs">同步：{syncEndpoint ?? '未設定'}</Text>
          <Text className="text-slate-300 text-xs">金流：{billingEndpoint ?? '未設定'}</Text>
          <Text className="text-slate-300 text-xs">AI：{aiEndpoint ?? '未設定'}</Text>
        </View>
      </Card>

      <Card className="mt-5" padding="lg">
        <Text className="text-white text-base font-semibold">運維操作</Text>
        <View className="flex-row gap-3 mt-4">
          <Pressable
            onPress={handleForceSync}
            disabled={busy}
            className={`flex-1 rounded-xl py-3 ${syncEnabled() ? 'bg-primary' : 'bg-slate-700'}`}
          >
            <Text className="text-center text-black font-semibold">強制同步</Text>
          </Pressable>
          <Pressable onPress={handleClear} disabled={busy} className="flex-1 border border-rose-500 rounded-xl py-3">
            <Text className="text-center text-rose-300">清空本地</Text>
          </Pressable>
        </View>
        {message ? <Text className="text-xs text-amber-300 mt-3">{message}</Text> : null}
      </Card>
    </ScrollView>
  );
}
