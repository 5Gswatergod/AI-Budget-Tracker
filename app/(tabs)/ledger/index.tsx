import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { DEFAULT_CATEGORIES, DEFAULT_TAGS } from '@/constants';
import { useLedgerStore, AddRecordInput } from '@/lib/store';
import { LedgerRecord } from '@/types';

interface LedgerFormState {
  id?: string;
  type: 'expense' | 'income';
  amount: string;
  category: string;
  date: string;
  note: string;
  tags: string;
}

const createDefaultForm = (): LedgerFormState => ({
  type: 'expense',
  amount: '',
  category: DEFAULT_CATEGORIES[0],
  date: dayjs().format('YYYY-MM-DD'),
  note: '',
  tags: ''
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(value);

export default function LedgerScreen() {
  const records = useLedgerStore((state) => state.records);
  const addRecord = useLedgerStore((state) => state.addRecord);
  const updateRecord = useLedgerStore((state) => state.updateRecord);
  const deleteRecord = useLedgerStore((state) => state.deleteRecord);
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState<LedgerFormState>(createDefaultForm);
  const [error, setError] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const monthlyStart = dayjs().startOf('month');
    let totalExpense = 0;
    let totalIncome = 0;
    let monthlyExpense = 0;
    const categoryTotals: Record<string, number> = {};

    records.forEach((record) => {
      if (record.type === 'expense') {
        totalExpense += record.amount;
        if (dayjs(record.date).isAfter(monthlyStart.subtract(1, 'day'))) {
          monthlyExpense += record.amount;
        }
        categoryTotals[record.category] = (categoryTotals[record.category] ?? 0) + record.amount;
      } else {
        totalIncome += record.amount;
      }
    });

    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    return {
      totalExpense,
      totalIncome,
      balance: totalIncome - totalExpense,
      monthlyExpense,
      topCategoryName: topCategory?.[0] ?? '尚無資料',
      topCategoryValue: topCategory?.[1] ?? 0
    };
  }, [records]);

  const handleOpenForm = (record?: LedgerRecord) => {
    if (record) {
      setForm({
        id: record.id,
        type: record.type,
        amount: record.amount.toString(),
        category: record.category,
        date: dayjs(record.date).format('YYYY-MM-DD'),
        note: record.note ?? '',
        tags: record.tags.join(' ')
      });
    } else {
      setForm(createDefaultForm());
    }
    setError(null);
    setFormVisible(true);
  };

  const handleSubmit = async () => {
    const amount = Number(form.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setError('請輸入正確的金額');
      return;
    }
    const payload: AddRecordInput = {
      type: form.type,
      amount,
      currency: 'TWD',
      category: form.category,
      date: dayjs(form.date).toISOString(),
      note: form.note.trim(),
      tags: form.tags
        .split(' ')
        .map((item) => item.trim())
        .filter(Boolean)
    };
    try {
      if (form.id) {
        await updateRecord(form.id, payload);
      } else {
        await addRecord(payload);
      }
      setFormVisible(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    }
  };

  const renderRecord = ({ item }: { item: LedgerRecord }) => (
    <Card className="mb-3">
      <View className="flex-row justify-between items-center">
        <View>
          <Text className="text-white text-lg font-semibold">{item.category}</Text>
          <Text className="text-slate-400 text-xs mt-1">{dayjs(item.date).format('YYYY/MM/DD HH:mm')}</Text>
          {item.note ? <Text className="text-slate-300 text-sm mt-2">{item.note}</Text> : null}
          {item.tags.length ? (
            <View className="flex-row gap-2 mt-2">
              {item.tags.map((tag) => (
                <View key={tag} className="bg-surface-muted px-2 py-1 rounded-full">
                  <Text className="text-slate-200 text-xs">{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <View className="items-end">
          <Text className={`text-xl font-bold ${item.type === 'expense' ? 'text-rose-400' : 'text-emerald-400'}`}>
            {item.type === 'expense' ? '-' : '+'}
            {formatCurrency(item.amount)}
          </Text>
          <View className="flex-row gap-3 mt-4">
            <Pressable onPress={() => handleOpenForm(item)}>
              <Feather name="edit-2" color="#38bdf8" size={18} />
            </Pressable>
            <Pressable onPress={() => deleteRecord(item.id)}>
              <Feather name="trash-2" color="#f87171" size={18} />
            </Pressable>
          </View>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView className="flex-1 bg-bgdark">
      <ScrollView className="px-5 pt-4" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="flex-row gap-3">
          <Card className="flex-1" padding="lg">
            <Text className="text-slate-400 text-xs">本月支出</Text>
            <Text className="text-2xl font-bold text-white mt-2">{formatCurrency(metrics.monthlyExpense)}</Text>
          </Card>
          <Card className="flex-1" padding="lg">
            <Text className="text-slate-400 text-xs">目前餘額</Text>
            <Text className="text-2xl font-bold text-emerald-400 mt-2">{formatCurrency(metrics.balance)}</Text>
          </Card>
        </View>
        <Card className="mt-4" padding="lg">
          <Text className="text-slate-300">最大分類：{metrics.topCategoryName}</Text>
          <Text className="text-slate-500 mt-1">{formatCurrency(metrics.topCategoryValue)}</Text>
        </Card>
        <View className="mt-6">
          <Text className="text-white text-lg font-semibold mb-3">紀錄明細</Text>
          <FlatList
            data={records}
            renderItem={renderRecord}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
      <Pressable
        onPress={() => handleOpenForm()}
        className="absolute bottom-20 right-6 bg-primary rounded-full p-4 shadow-lg shadow-primary/40"
      >
        <Feather name="plus" color="#020617" size={28} />
      </Pressable>

      <Modal visible={formVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-bgdark rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center">
              <Text className="text-white text-xl font-semibold">
                {form.id ? '編輯紀錄' : '新增紀錄'}
              </Text>
              <Pressable onPress={() => setFormVisible(false)}>
                <Feather name="x" color="#94a3b8" size={24} />
              </Pressable>
            </View>
            <View className="flex-row gap-4 mt-4">
              {(['expense', 'income'] as const).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setForm((prev) => ({ ...prev, type }))}
                  className={`flex-1 border rounded-xl py-3 ${
                    form.type === type ? 'border-primary bg-primary/10' : 'border-slate-700'
                  }`}
                >
                  <Text className="text-center text-white font-semibold">
                    {type === 'expense' ? '支出' : '收入'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={form.amount}
              onChangeText={(text) => setForm((prev) => ({ ...prev, amount: text }))}
              placeholder="金額"
              placeholderTextColor="#475569"
              keyboardType="numeric"
              className="mt-5 bg-surface-muted rounded-xl px-4 py-3 text-white"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
              <View className="flex-row gap-2">
                {DEFAULT_CATEGORIES.map((category) => (
                  <Pressable
                    key={category}
                    onPress={() => setForm((prev) => ({ ...prev, category }))}
                    className={`px-4 py-2 rounded-full border ${
                      form.category === category ? 'border-primary bg-primary/20' : 'border-slate-700'
                    }`}
                  >
                    <Text className="text-white text-sm">{category}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <TextInput
              value={form.date}
              onChangeText={(text) => setForm((prev) => ({ ...prev, date: text }))}
              placeholder="日期 (YYYY-MM-DD)"
              placeholderTextColor="#475569"
              className="mt-4 bg-surface-muted rounded-xl px-4 py-3 text-white"
            />
            <TextInput
              value={form.note}
              onChangeText={(text) => setForm((prev) => ({ ...prev, note: text }))}
              placeholder="備註"
              placeholderTextColor="#475569"
              className="mt-4 bg-surface-muted rounded-xl px-4 py-3 text-white"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
              <View className="flex-row gap-2">
                {DEFAULT_TAGS.map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() =>
                      setForm((prev) => ({
                        ...prev,
                        tags: prev.tags.includes(tag) ? prev.tags : `${prev.tags} ${tag}`.trim()
                      }))
                    }
                    className="px-3 py-2 rounded-full bg-surface-muted"
                  >
                    <Text className="text-white">{tag}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <TextInput
              value={form.tags}
              onChangeText={(text) => setForm((prev) => ({ ...prev, tags: text }))}
              placeholder="自訂標籤，以空白分隔"
              placeholderTextColor="#475569"
              className="mt-4 bg-surface-muted rounded-xl px-4 py-3 text-white"
            />
            {error ? <Text className="text-rose-400 mt-3 text-sm">{error}</Text> : null}
            <Pressable onPress={handleSubmit} className="mt-6 bg-primary rounded-xl py-3">
              <Text className="text-center text-black font-semibold text-lg">儲存</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
