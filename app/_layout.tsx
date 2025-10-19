import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useLedgerStore } from '@/lib/store';

export default function RootLayout() {
  const initialize = useLedgerStore((state) => state.initialize);
  const initialized = useLedgerStore((state) => state.initialized);
  const resetAiUsageIfNeeded = useLedgerStore((state) => state.resetAiUsageIfNeeded);
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    initialize().then(() => resetAiUsageIfNeeded());
  }, [initialize, resetAiUsageIfNeeded]);

  if (!initialized) {
    return (
      <View className="flex-1 items-center justify-center bg-bgdark">
        <ActivityIndicator size="large" color="#06b6d4" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#020617' }
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="admin/index"
            options={{
              headerShown: true,
              headerTitle: '開發者後台',
              presentation: 'modal',
              headerStyle: { backgroundColor: '#020617' },
              headerTintColor: '#f8fafc'
            }}
          />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
