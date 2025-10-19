export type LedgerType = 'expense' | 'income';

export interface LedgerRecord {
  id: string;
  type: LedgerType;
  amount: number;
  currency: string;
  category: string;
  note?: string;
  date: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
  dirty?: boolean;
}

export type PlanTier = 'free' | 'pro' | 'enterprise';

export interface ChallengeDefinition {
  id: string;
  title: string;
  description: string;
  target: number;
  type: 'streak' | 'amount' | 'count';
  threshold?: number;
}

export interface ChallengeProgress extends ChallengeDefinition {
  progress: number;
  achieved: boolean;
  metricLabel: string;
}
