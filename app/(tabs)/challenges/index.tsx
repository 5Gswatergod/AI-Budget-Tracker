import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { useLedgerStore, selectChallengeProgress } from '@/lib/store';

const getProgressColor = (progress: number) => {
  if (progress >= 1) return 'bg-emerald-500';
  if (progress >= 0.7) return 'bg-amber-400';
  return 'bg-primary';
};

export default function ChallengesScreen() {
  const challengeProgress = useLedgerStore(selectChallengeProgress);
  const addCustomChallenge = useLedgerStore((state) => state.addCustomChallenge);
  const removeCustomChallenge = useLedgerStore((state) => state.removeCustomChallenge);
  const [limit, setLimit] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const customChallenges = useMemo(
    () => challengeProgress.filter((challenge) => challenge.id.startsWith('custom-limit-')),
    [challengeProgress]
  );

  const handleAdd = async () => {
    const value = Number(limit);
    if (!value || value <= 0) {
      setMessage('請輸入有效的金額上限');
      return;
    }
    await addCustomChallenge({
      id: `custom-limit-${Date.now()}`,
      title: '自訂月支出上限',
      description: `將本月支出控制在 ${value} 元以內`,
      target: value,
      type: 'amount'
    });
    setLimit('');
    setMessage('已加入自訂挑戰');
  };

  return (
    <ScrollView className="flex-1 bg-bgdark px-5 pt-6" contentContainerStyle={{ paddingBottom: 120 }}>
      <Card padding="lg">
        <Text className="text-white text-lg font-semibold">節流挑戰</Text>
        <Text className="text-slate-400 mt-2 text-sm">
          完成挑戰可以幫助你維持紀律，也能讓 AI 助理提供更精準的建議。
        </Text>
      </Card>

      {challengeProgress.map((challenge) => (
        <Card key={challenge.id} className="mt-4" padding="lg">
          <View className="flex-row justify-between items-start">
            <View className="flex-1 pr-4">
              <Text className="text-white text-base font-semibold">{challenge.title}</Text>
              <Text className="text-slate-400 text-sm mt-1">{challenge.description}</Text>
              <Text className="text-slate-500 text-xs mt-2">{challenge.metricLabel}</Text>
              <View className="h-2 bg-surface-muted rounded-full mt-3 overflow-hidden">
                <View className={`h-full ${getProgressColor(challenge.progress)} rounded-full`} style={{ width: `${
                  Math.min(challenge.progress, 1) * 100
                }%` }} />
              </View>
            </View>
            {challenge.id.startsWith('custom-limit-') ? (
              <Pressable onPress={() => removeCustomChallenge(challenge.id)}>
                <Feather name="trash-2" size={18} color="#f87171" />
              </Pressable>
            ) : null}
          </View>
          {challenge.achieved ? (
            <Text className="text-emerald-400 text-xs mt-3">恭喜達成！繼續保持優秀習慣。</Text>
          ) : null}
        </Card>
      ))}

      <Card className="mt-5" padding="lg">
        <Text className="text-white text-base font-semibold">自訂月支出上限</Text>
        <Text className="text-slate-400 text-xs mt-1">
          系統會依照輸入的金額追蹤本月支出並顯示完成度。
        </Text>
        <View className="flex-row gap-3 mt-4 items-center">
          <TextInput
            value={limit}
            onChangeText={setLimit}
            placeholder="輸入金額"
            placeholderTextColor="#475569"
            keyboardType="numeric"
            className="flex-1 bg-surface-muted rounded-xl px-4 py-3 text-white"
          />
          <Pressable onPress={handleAdd} className="bg-primary rounded-xl px-4 py-3">
            <Text className="text-black font-semibold">加入</Text>
          </Pressable>
        </View>
        {message ? <Text className="text-xs text-amber-300 mt-2">{message}</Text> : null}
        {customChallenges.length ? (
          <Text className="text-slate-500 text-[11px] mt-3">
            你目前有 {customChallenges.length} 個自訂挑戰
          </Text>
        ) : null}
      </Card>
    </ScrollView>
  );
}
