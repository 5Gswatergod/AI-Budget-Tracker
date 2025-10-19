import dayjs from 'dayjs';
import { ChallengeDefinition, ChallengeProgress, LedgerRecord } from '@/types';

export const builtInChallenges: ChallengeDefinition[] = [
  {
    id: 'streak-7',
    title: '連續記帳 7 天',
    description: '維持一週的記帳習慣來建立自律。',
    target: 7,
    type: 'streak'
  },
  {
    id: 'count-20',
    title: '本月達成 20 筆紀錄',
    description: '養成紀錄所有收支的習慣，避免漏掉任何一筆。',
    target: 20,
    type: 'count'
  },
  {
    id: 'amount-15000',
    title: '月支出控制在 15,000 內',
    description: '守住預算，讓財務維持在可控範圍。',
    target: 15000,
    type: 'amount'
  }
];

const calculateStreak = (records: LedgerRecord[]) => {
  const uniqueDates = new Set(
    records
      .filter((record) => record.type === 'expense' || record.type === 'income')
      .map((record) => dayjs(record.date).format('YYYY-MM-DD'))
  );
  let streak = 0;
  for (let i = 0; i < 60; i += 1) {
    const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    if (uniqueDates.has(date)) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
};

export const evaluateChallenges = (
  records: LedgerRecord[],
  customChallenges: ChallengeDefinition[]
): ChallengeProgress[] => {
  const now = dayjs();
  const monthStart = now.startOf('month');
  const monthlyRecords = records.filter((record) => dayjs(record.date).isAfter(monthStart.subtract(1, 'day')));

  const streak = calculateStreak(records);
  const monthlyCount = monthlyRecords.length;
  const monthlySpending = monthlyRecords
    .filter((record) => record.type === 'expense')
    .reduce((sum, record) => sum + record.amount, 0);

  const calculateProgress = (challenge: ChallengeDefinition): ChallengeProgress => {
    switch (challenge.type) {
      case 'streak': {
        const progress = Math.min(streak / challenge.target, 1);
        return {
          ...challenge,
          progress,
          achieved: streak >= challenge.target,
          metricLabel: `目前 ${streak} 天`
        };
      }
      case 'count': {
        const progress = Math.min(monthlyCount / challenge.target, 1);
        return {
          ...challenge,
          progress,
          achieved: monthlyCount >= challenge.target,
          metricLabel: `本月 ${monthlyCount} 筆`
        };
      }
      case 'amount': {
        const progress = Math.min(challenge.target / Math.max(monthlySpending, 1), 1);
        const achieved = monthlySpending <= challenge.target;
        return {
          ...challenge,
          progress,
          achieved,
          metricLabel: `本月已花 ${monthlySpending.toFixed(0)}`
        };
      }
      default:
        return {
          ...challenge,
          progress: 0,
          achieved: false,
          metricLabel: '未定義'
        };
    }
  };

  return [...builtInChallenges, ...customChallenges].map(calculateProgress);
};
