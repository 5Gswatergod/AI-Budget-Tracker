import { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import dayjs from 'dayjs';
import { Feather } from '@expo/vector-icons';
import { askAssistant } from '@/lib/ai/client';
import { useLedgerStore, selectAiRemaining } from '@/lib/store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  usedFallback?: boolean;
}

export default function AssistantScreen() {
  const plan = useLedgerStore((state) => state.plan);
  const records = useLedgerStore((state) => state.records);
  const incrementAiUsage = useLedgerStore((state) => state.incrementAiUsage);
  const aiRemaining = useLedgerStore(selectAiRemaining);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'intro',
      role: 'assistant',
      content: '你好！我可以幫你分析最近的支出變化或挑戰進度，有什麼想了解的嗎？',
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;
    if (aiRemaining <= 0) {
      setError('已達今日提問上限，請明天再試或升級方案。');
      return;
    }
    setError(null);
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    try {
      const response = await askAssistant({ question, ledger: records.slice(0, 500), plan, currency: 'TWD' });
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.reply,
          timestamp: new Date().toISOString(),
          usedFallback: response.usedFallback
        }
      ]);
      await incrementAiUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 助理暫時無法回應');
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View className={`mb-4 ${item.role === 'user' ? 'self-end max-w-[80%]' : 'self-start max-w-[85%]'}`}>
      <View
        className={`rounded-2xl px-4 py-3 ${
          item.role === 'user' ? 'bg-primary/90 rounded-br-none' : 'bg-surface-elevated rounded-bl-none'
        }`}
      >
        <Text className={item.role === 'user' ? 'text-black text-base' : 'text-white text-base'}>{item.content}</Text>
        <Text className="text-xs text-slate-400 mt-2">{dayjs(item.timestamp).format('HH:mm')}</Text>
        {item.usedFallback ? <Text className="text-[10px] text-amber-300 mt-1">使用離線分析</Text> : null}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bgdark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
      />
      <View className="absolute bottom-0 left-0 right-0 bg-surface-elevated px-4 pb-6 pt-3">
        {error ? <Text className="text-rose-400 text-xs mb-2">{error}</Text> : null}
        <View className="flex-row items-center gap-3">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={loading ? '分析中…' : '向 AI 助理發問'}
            placeholderTextColor="#475569"
            className="flex-1 bg-surface-muted rounded-2xl px-4 py-3 text-white"
            editable={!loading}
          />
          <Pressable
            onPress={handleSend}
            disabled={loading}
            className="bg-primary rounded-full p-3"
          >
            {loading ? <ActivityIndicator color="#020617" /> : <Feather name="send" size={20} color="#020617" />}
          </Pressable>
        </View>
        <Text className="text-[11px] text-slate-500 mt-2">今日剩餘 {aiRemaining} 次提問</Text>
      </View>
    </KeyboardAvoidingView>
  );
}
