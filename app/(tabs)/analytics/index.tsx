import { useMemo } from 'react';
import { Dimensions, ScrollView, Text, View } from 'react-native';
import dayjs from 'dayjs';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { Card } from '@/components/ui/Card';
import { useLedgerStore } from '@/lib/store';

const chartConfig = {
  backgroundGradientFrom: '#0f172a',
  backgroundGradientTo: '#0f172a',
  color: (opacity = 1) => `rgba(6, 182, 212, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(241, 245, 249, ${opacity})`,
  propsForLabels: {
    fontSize: 11
  },
  propsForDots: {
    r: '4'
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(value);

export default function AnalyticsScreen() {
  const records = useLedgerStore((state) => state.records);

  const insights = useMemo(() => {
    const now = dayjs();
    const monthStart = now.startOf('month');
    const lastMonthStart = monthStart.subtract(1, 'month');

    const monthlyExpense = records
      .filter((record) => record.type === 'expense' && dayjs(record.date).isAfter(monthStart.subtract(1, 'day')))
      .reduce((sum, record) => sum + record.amount, 0);

    const lastMonthExpense = records
      .filter((record) =>
        record.type === 'expense' &&
        dayjs(record.date).isAfter(lastMonthStart.subtract(1, 'day')) &&
        dayjs(record.date).isBefore(monthStart)
      )
      .reduce((sum, record) => sum + record.amount, 0);

    const change = lastMonthExpense ? ((monthlyExpense - lastMonthExpense) / lastMonthExpense) * 100 : 0;

    const byCategory = records
      .filter((record) => record.type === 'expense')
      .reduce<Record<string, number>>((acc, record) => {
        acc[record.category] = (acc[record.category] ?? 0) + record.amount;
        return acc;
      }, {});

    const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const topCategory = sortedCategories[0]?.[0] ?? '尚無資料';

    const dailySeries = Array.from({ length: 7 }).map((_, index) => {
      const day = now.subtract(6 - index, 'day');
      const total = records
        .filter((record) => record.type === 'expense' && dayjs(record.date).format('YYYY-MM-DD') === day.format('YYYY-MM-DD'))
        .reduce((sum, record) => sum + record.amount, 0);
      return { label: day.format('MM/DD'), value: total };
    });

    return {
      monthlyExpense,
      change,
      topCategory,
      sortedCategories,
      dailySeries
    };
  }, [records]);

  const screenWidth = Dimensions.get('window').width - 40;

  const colors = ['#06b6d4', '#10b981', '#f59e0b', '#a855f7', '#38bdf8'];
  const pieData = insights.sortedCategories.slice(0, 5).map(([name, value], index) => ({
    name,
    value,
    color: colors[index % colors.length],
    legendFontColor: '#f8fafc',
    legendFontSize: 12
  }));

  const barData = {
    labels: insights.sortedCategories.slice(0, 5).map(([name]) => name),
    datasets: [{ data: insights.sortedCategories.slice(0, 5).map(([, value]) => value) }]
  };

  return (
    <ScrollView className="flex-1 bg-bgdark px-5 pt-6" contentContainerStyle={{ paddingBottom: 120 }}>
      <View className="flex-row gap-3">
        <Card className="flex-1" padding="lg">
          <Text className="text-slate-300 text-xs">本月支出</Text>
          <Text className="text-2xl font-semibold text-white mt-2">{formatCurrency(insights.monthlyExpense)}</Text>
          <Text className="text-emerald-400 text-xs mt-2">
            {insights.change >= 0 ? '+' : ''}
            {insights.change.toFixed(1)}% 相較上月
          </Text>
        </Card>
        <Card className="flex-1" padding="lg">
          <Text className="text-slate-300 text-xs">花最多的分類</Text>
          <Text className="text-lg text-white font-semibold mt-2">{insights.topCategory}</Text>
        </Card>
      </View>

      <Card className="mt-5" padding="lg">
        <Text className="text-white font-semibold mb-3">近 7 天支出趨勢</Text>
        <LineChart
          data={{
            labels: insights.dailySeries.map((item) => item.label),
            datasets: [{ data: insights.dailySeries.map((item) => item.value) }]
          }}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
        />
      </Card>

      {pieData.length ? (
        <Card className="mt-5" padding="lg">
          <Text className="text-white font-semibold mb-3">分類佔比</Text>
          <PieChart
            data={pieData}
            accessor="value"
            backgroundColor="transparent"
            width={screenWidth}
            height={220}
            chartConfig={chartConfig}
            paddingLeft="10"
          />
        </Card>
      ) : null}

      {barData.labels.length ? (
        <Card className="mt-5" padding="lg">
          <Text className="text-white font-semibold mb-3">Top 5 分類</Text>
          <BarChart
            data={barData}
            width={screenWidth}
            height={250}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`
            }}
            fromZero
            showBarTops={false}
          />
        </Card>
      ) : null}
    </ScrollView>
  );
}
