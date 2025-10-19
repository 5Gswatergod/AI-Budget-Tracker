export const DEFAULT_CURRENCY = 'TWD';

export const DEFAULT_CATEGORIES = [
  'food',
  'transport',
  'entertainment',
  'housing',
  'utilities',
  'shopping',
  'salary',
  'other'
];

export const DEFAULT_TAGS = ['💳', '☕️', '🚌', '🎮', '🛒'];

export const DAILY_AI_LIMIT: Record<'free' | 'pro' | 'enterprise', number> = {
  free: 5,
  pro: 1000,
  enterprise: 5000
};

export const PLAN_LABELS: Record<'free' | 'pro' | 'enterprise', string> = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise'
};
