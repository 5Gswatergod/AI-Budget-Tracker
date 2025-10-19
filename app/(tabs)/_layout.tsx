import { Tabs, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useLedgerStore, selectAiRemaining } from '@/lib/store';
import { PLAN_LABELS } from '@/constants';

export default function TabsLayout() {
  const router = useRouter();
  const plan = useLedgerStore((state) => state.plan);
  const syncStatus = useLedgerStore((state) => state.syncStatus);
  const sync = useLedgerStore((state) => state.sync);
  const remaining = useLedgerStore(selectAiRemaining);
  const enableAdmin =
    (Constants.expoConfig?.extra as Record<string, string | undefined> | undefined)?.EXPO_PUBLIC_ENABLE_ADMIN_CONSOLE ===
      'true' ||
    (Constants?.manifest2 as any)?.extra?.EXPO_PUBLIC_ENABLE_ADMIN_CONSOLE === 'true';

  return (
    <>
      <View className="bg-bgdark px-5 pt-14 pb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-slate-200 text-xs">當前方案</Text>
          <Text className="text-white text-lg font-semibold">{PLAN_LABELS[plan]}</Text>
        </View>
        <View className="items-end">
          <Pressable
            onPress={sync}
            className="px-3 py-1 rounded-full border border-primary/60"
          >
            <Text className="text-primary text-xs">
              {syncStatus === 'syncing' ? '同步中…' : syncStatus === 'error' ? '同步失敗' : '立即同步'}
            </Text>
          </Pressable>
          <Text className="text-xs text-slate-400 mt-1">AI 剩餘 {remaining} 次</Text>
        </View>
      </View>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#06b6d4',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarStyle: {
            backgroundColor: '#050816',
            borderTopColor: '#111827'
          },
          headerShown: false
        }}
      >
        <Tabs.Screen
          name="ledger/index"
          options={{
            title: '記帳',
            tabBarIcon: ({ color, size }) => <Feather name="book-open" color={color} size={size} />
          }}
        />
        <Tabs.Screen
          name="assistant/index"
          options={{
            title: '助理',
            tabBarIcon: ({ color, size }) => <Feather name="message-circle" color={color} size={size} />
          }}
        />
        <Tabs.Screen
          name="analytics/index"
          options={{
            title: '分析',
            tabBarIcon: ({ color, size }) => <Feather name="pie-chart" color={color} size={size} />
          }}
        />
        <Tabs.Screen
          name="challenges/index"
          options={{
            title: '挑戰',
            tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="target" color={color} size={size} />
          }}
        />
        <Tabs.Screen
          name="upgrade/index"
          options={{
            title: '升級',
            tabBarIcon: ({ color, size }) => <Feather name="zap" color={color} size={size} />
          }}
        />
      </Tabs>
      {enableAdmin ? (
        <View className="absolute right-4 bottom-24">
          <Pressable
            onPress={() => router.push('/admin')}
            className="bg-primary rounded-full px-4 py-2"
          >
            <Text className="text-black font-semibold">開發者後台</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}
