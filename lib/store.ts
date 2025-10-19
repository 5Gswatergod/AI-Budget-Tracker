import { create } from 'zustand';
import dayjs from 'dayjs';
import { nanoid } from 'nanoid/non-secure';
import {
  initializeLedger,
  listLedgerRecords,
  upsertRecord,
  markRecordDeleted,
  listDirtyRecords,
  clearDirtyFlag,
  getPlanTier,
  setPlanTier,
  getAiUsage,
  setAiUsage,
  getLastSyncAt,
  setLastSyncAt,
  getMetaValue,
  setMetaValue,
  clearAllRecords
} from '@/lib/db/ledger';
import { LedgerRecord, PlanTier, ChallengeDefinition, LedgerType } from '@/types';
import { evaluateChallenges } from '@/lib/challenge/utils';
import { pullRemoteRecords, pushRemoteRecords, syncEnabled } from '@/lib/sync/client';
import { DEFAULT_CURRENCY, DAILY_AI_LIMIT } from '@/constants';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface AddRecordInput {
  type: LedgerType;
  amount: number;
  currency: string;
  category: string;
  date: string;
  note?: string;
  tags: string[];
}

export interface LedgerStore {
  initialized: boolean;
  records: LedgerRecord[];
  plan: PlanTier;
  currency: string;
  syncStatus: SyncStatus;
  syncError?: string;
  lastSyncAt?: string | null;
  aiUsageCount: number;
  aiUsageDate?: string | null;
  customChallenges: ChallengeDefinition[];
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  addRecord: (input: AddRecordInput) => Promise<void>;
  updateRecord: (id: string, updates: Partial<LedgerRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  sync: () => Promise<void>;
  setPlan: (plan: PlanTier) => Promise<void>;
  incrementAiUsage: () => Promise<void>;
  resetAiUsageIfNeeded: () => Promise<void>;
  addCustomChallenge: (challenge: ChallengeDefinition) => Promise<void>;
  removeCustomChallenge: (id: string) => Promise<void>;
  clearLedger: () => Promise<void>;
}

const loadCustomChallenges = async (): Promise<ChallengeDefinition[]> => {
  const raw = await getMetaValue('customChallenges');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ChallengeDefinition[];
    return parsed;
  } catch (error) {
    return [];
  }
};

const persistCustomChallenges = async (challenges: ChallengeDefinition[]) => {
  await setMetaValue('customChallenges', JSON.stringify(challenges));
};

export const useLedgerStore = create<LedgerStore>((set, get) => ({
  initialized: false,
  records: [],
  plan: 'free',
  currency: DEFAULT_CURRENCY,
  syncStatus: 'idle',
  aiUsageCount: 0,
  customChallenges: [],
  initialize: async () => {
    await initializeLedger();
    const [records, plan, aiUsage, lastSync, customChallenges] = await Promise.all([
      listLedgerRecords(),
      getPlanTier(),
      getAiUsage(),
      getLastSyncAt(),
      loadCustomChallenges()
    ]);
    set({
      initialized: true,
      records,
      plan,
      aiUsageCount: aiUsage?.count ?? 0,
      aiUsageDate: aiUsage?.date ?? null,
      lastSyncAt: lastSync,
      customChallenges
    });
  },
  refresh: async () => {
    const records = await listLedgerRecords();
    set({ records });
  },
  addRecord: async (input) => {
    const timestamp = new Date().toISOString();
    const record: LedgerRecord = {
      ...input,
      id: nanoid(),
      createdAt: timestamp,
      updatedAt: timestamp,
      deleted: false,
      dirty: true,
      tags: input.tags ?? []
    };
    await upsertRecord(record);
    set((state) => ({ records: [record, ...state.records] }));
  },
  updateRecord: async (id, updates) => {
    const timestamp = new Date().toISOString();
    const existing = get().records.find((record) => record.id === id);
    if (!existing) return;
    const updated: LedgerRecord = {
      ...existing,
      ...updates,
      tags: updates.tags ?? existing.tags,
      updatedAt: timestamp,
      dirty: true
    };
    await upsertRecord(updated);
    set((state) => ({
      records: state.records.map((record) => (record.id === id ? updated : record))
    }));
  },
  deleteRecord: async (id) => {
    const timestamp = new Date().toISOString();
    await markRecordDeleted(id, timestamp);
    set((state) => ({
      records: state.records.filter((record) => record.id !== id)
    }));
  },
  sync: async () => {
    if (!syncEnabled()) {
      set({ syncStatus: 'idle', syncError: undefined });
      return;
    }
    set({ syncStatus: 'syncing', syncError: undefined });
    try {
      const dirtyRecords = await listDirtyRecords();
      if (dirtyRecords.length) {
        await pushRemoteRecords(dirtyRecords);
        await clearDirtyFlag(dirtyRecords.map((record) => record.id));
      }
      const remoteRecords = await pullRemoteRecords();
      for (const record of remoteRecords) {
        await upsertRecord({ ...record, dirty: false });
      }
      const timestamp = new Date().toISOString();
      await setLastSyncAt(timestamp);
      const records = await listLedgerRecords();
      set({ records, syncStatus: 'success', lastSyncAt: timestamp });
    } catch (error) {
      set({ syncStatus: 'error', syncError: error instanceof Error ? error.message : '同步失敗' });
    }
  },
  setPlan: async (plan) => {
    await setPlanTier(plan);
    set({ plan });
  },
  incrementAiUsage: async () => {
    const today = dayjs().format('YYYY-MM-DD');
    const { aiUsageCount, aiUsageDate } = get();
    const nextCount = aiUsageDate === today ? aiUsageCount + 1 : 1;
    await setAiUsage(today, nextCount);
    set({ aiUsageCount: nextCount, aiUsageDate: today });
  },
  resetAiUsageIfNeeded: async () => {
    const today = dayjs().format('YYYY-MM-DD');
    const { aiUsageCount, aiUsageDate } = get();
    if (aiUsageDate !== today && aiUsageCount !== 0) {
      await setAiUsage(today, 0);
      set({ aiUsageCount: 0, aiUsageDate: today });
    }
  },
  addCustomChallenge: async (challenge) => {
    const existing = get().customChallenges;
    const updated = [...existing.filter((item) => item.id !== challenge.id), challenge];
    await persistCustomChallenges(updated);
    set({ customChallenges: updated });
  },
  removeCustomChallenge: async (id) => {
    const updated = get().customChallenges.filter((challenge) => challenge.id !== id);
    await persistCustomChallenges(updated);
    set({ customChallenges: updated });
  },
  clearLedger: async () => {
    await clearAllRecords();
    set({ records: [] });
  }
}));

export const selectChallengeProgress = (state: LedgerStore) =>
  evaluateChallenges(state.records, state.customChallenges);

export const selectAiRemaining = (state: LedgerStore) => {
  const today = dayjs().format('YYYY-MM-DD');
  const usageToday = state.aiUsageDate === today ? state.aiUsageCount : 0;
  return Math.max(DAILY_AI_LIMIT[state.plan] - usageToday, 0);
};
