import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { PLAN_LABELS } from '@/constants';
import { useLedgerStore } from '@/lib/store';
import { billingEndpoint, startCheckout, openCustomerPortal } from '@/lib/billing';

const PLANS = [
  {
    id: 'free',
    price: 'NT$0',
    description: '入門方案，適合個人基本記帳。',
    features: ['離線記帳', '基本儀表板', 'AI 每日 5 次']
  },
  {
    id: 'pro',
    price: 'NT$299/月',
    description: '進階分析與無限 AI 助理。',
    features: ['無限 AI 分析', 'CSV/PDF 匯出', '挑戰無上限', '雲端同步']
  },
  {
    id: 'enterprise',
    price: '聯繫業務',
    description: '適合團隊與進階治理需求。',
    features: ['多使用者帳本', '自訂 API', '專屬客服']
  }
];

export default function UpgradeScreen() {
  const plan = useLedgerStore((state) => state.plan);
  const setPlan = useLedgerStore((state) => state.setPlan);
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const endpoint = billingEndpoint();

  const handleUpgrade = async (targetPlan: 'pro' | 'enterprise') => {
    if (!endpoint) {
      setMessage('尚未設定金流端點，無法進行升級。');
      return;
    }
    setLoadingPlan(targetPlan);
    setMessage(null);
    try {
      const response = await startCheckout({ plan: targetPlan, cycle, userId: 'demo-user' });
      await Linking.openURL(response.redirectUrl);
      setMessage('已開啟結帳流程，請於瀏覽器完成付款。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '啟動結帳流程失敗');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleDowngrade = async () => {
    await setPlan('free');
    setMessage('已切換回免費方案。');
  };

  const handlePortal = async () => {
    if (!endpoint) {
      setMessage('未設定金流端點，無法開啟客戶入口。');
      return;
    }
    try {
      const portalUrl = await openCustomerPortal('demo-user');
      await Linking.openURL(portalUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '無法開啟客戶入口');
    }
  };

  return (
    <ScrollView className="flex-1 bg-bgdark px-5 pt-6" contentContainerStyle={{ paddingBottom: 140 }}>
      <Card padding="lg">
        <Text className="text-white text-lg font-semibold">選擇你的方案</Text>
        <Text className="text-slate-400 text-sm mt-2">
          付款會導向設定的金流節點，完成後自動更新方案權限。
        </Text>
        <View className="flex-row items-center gap-3 mt-4">
          {(['monthly', 'annual'] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => setCycle(option)}
              className={`px-4 py-2 rounded-full border ${
                cycle === option ? 'border-primary bg-primary/20' : 'border-slate-700'
              }`}
            >
              <Text className="text-white text-sm">{option === 'monthly' ? '月繳' : '年繳 (省 15%)'}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {PLANS.map((item) => (
        <Card key={item.id} className="mt-5" padding="lg">
          <View className="flex-row justify-between items-start">
            <View className="flex-1 pr-4">
              <Text className="text-white text-xl font-semibold">{PLAN_LABELS[item.id as keyof typeof PLAN_LABELS]}</Text>
              <Text className="text-slate-400 text-sm mt-1">{item.description}</Text>
              <Text className="text-primary text-lg font-semibold mt-3">{item.price}</Text>
              <View className="mt-4 gap-2">
                {item.features.map((feature) => (
                  <View key={feature} className="flex-row items-center gap-2">
                    <Feather name="check" size={16} color="#10b981" />
                    <Text className="text-slate-300 text-sm">{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
            {item.id === plan ? (
              <View className="items-center">
                <Text className="text-emerald-400 text-xs">目前方案</Text>
              </View>
            ) : null}
          </View>
          <View className="flex-row gap-3 mt-5">
            {item.id === 'free' ? (
              <Pressable onPress={handleDowngrade} className="flex-1 border border-slate-600 rounded-xl py-3">
                <Text className="text-center text-slate-200">切換至免費</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => handleUpgrade(item.id as 'pro' | 'enterprise')}
                disabled={loadingPlan === item.id || !endpoint}
                className={`flex-1 rounded-xl py-3 ${
                  !endpoint
                    ? 'bg-slate-700'
                    : loadingPlan === item.id
                    ? 'bg-primary/60'
                    : 'bg-primary'
                }`}
              >
                <Text className="text-center text-black font-semibold">
                  {!endpoint ? '待設定金流' : loadingPlan === item.id ? '建立中…' : '升級' }
                </Text>
              </Pressable>
            )}
            {item.id !== 'free' ? (
              <Pressable onPress={handlePortal} className="w-12 h-12 rounded-xl border border-slate-600 items-center justify-center">
                <Feather name="external-link" size={18} color="#38bdf8" />
              </Pressable>
            ) : null}
          </View>
        </Card>
      ))}

      {message ? <Text className="text-xs text-amber-300 mt-4 text-center">{message}</Text> : null}
    </ScrollView>
  );
}
