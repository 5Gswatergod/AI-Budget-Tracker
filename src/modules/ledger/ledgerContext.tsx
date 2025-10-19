import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { sortByNewest } from './utils';

export type LedgerCategory =
  | '餐飲'
  | '交通'
  | '娛樂'
  | '購物'
  | '居家'
  | '醫療'
  | '教育'
  | '其他';

export const ledgerCategories: LedgerCategory[] = [
  '餐飲',
  '交通',
  '娛樂',
  '購物',
  '居家',
  '醫療',
  '教育',
  '其他',
];

export type LedgerRecord = {
  id: string;
  description: string;
  amount: number;
  category: LedgerCategory;
  createdAt: string; // ISO string
};

type LedgerState = {
  records: LedgerRecord[];
};

type LedgerAction =
  | { type: 'add'; payload: LedgerRecord }
  | { type: 'update'; payload: LedgerRecord }
  | { type: 'remove'; payload: { id: string } }
  | { type: 'hydrate'; payload: LedgerRecord[] };

const STORAGE_KEY = 'ai-budget-ledger-records';
const SYNC_ENDPOINT = import.meta.env.VITE_SYNC_ENDPOINT ?? '';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

type SyncSnapshot = {
  status: SyncStatus;
  lastSyncedAt: string | null;
  error: string | null;
};

type LedgerContextValue = {
  records: LedgerRecord[];
  addRecord: (record: Omit<LedgerRecord, 'id'>) => void;
  updateRecord: (record: LedgerRecord) => void;
  removeRecord: (id: string) => void;
  syncNow: () => Promise<void>;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  isSyncConfigured: boolean;
};

const LedgerContext = createContext<LedgerContextValue | null>(null);

function sanitizeRecord(record: LedgerRecord): LedgerRecord {
  return {
    ...record,
    createdAt: new Date(record.createdAt).toISOString(),
  };
}

function ledgerReducer(state: LedgerState, action: LedgerAction): LedgerState {
  switch (action.type) {
    case 'add':
      return { records: [action.payload, ...state.records] };
    case 'update':
      return {
        records: state.records.map((record) =>
          record.id === action.payload.id ? { ...record, ...sanitizeRecord(action.payload) } : record,
        ),
      };
    case 'remove':
      return {
        records: state.records.filter((record) => record.id !== action.payload.id),
      };
    case 'hydrate': {
      const merged = new Map<string, LedgerRecord>();
      for (const record of state.records) {
        merged.set(record.id, record);
      }
      for (const record of action.payload) {
        merged.set(record.id, sanitizeRecord(record));
      }
      return { records: sortByNewest([...merged.values()]) };
    }
    default:
      return state;
  }
}

function initializeLedger(): LedgerState {
  if (typeof window === 'undefined') {
    return { records: [] };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { records: [] };
    const parsed = JSON.parse(raw) as LedgerRecord[];
    return {
      records: sortByNewest(parsed.map(sanitizeRecord)),
    };
  } catch (error) {
    console.warn('Failed to load ledger records from storage', error);
    return { records: [] };
  }
}

function persistLedger(records: LedgerRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function getUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
}

export function LedgerProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(ledgerReducer, undefined, initializeLedger);
  const isSyncConfigured = Boolean(SYNC_ENDPOINT);
  const [syncState, setSyncState] = useState<SyncSnapshot>({
    status: isSyncConfigured ? 'idle' : 'offline',
    lastSyncedAt: null,
    error: null,
  });
  const syncInFlightRef = useRef(false);
  const hasInitializedSyncRef = useRef(!isSyncConfigured);

  useEffect(() => {
    persistLedger(state.records);
  }, [state.records]);

  const addRecord = useCallback((record: Omit<LedgerRecord, 'id'>) => {
    dispatch({ type: 'add', payload: { ...record, id: getUUID(), createdAt: new Date(record.createdAt).toISOString() } });
  }, []);

  const updateRecord = useCallback((record: LedgerRecord) => {
    dispatch({ type: 'update', payload: record });
  }, []);

  const removeRecord = useCallback((id: string) => {
    dispatch({ type: 'remove', payload: { id } });
  }, []);

  const runSync = useCallback(async () => {
    if (!isSyncConfigured || typeof window === 'undefined') {
      return;
    }
    if (syncInFlightRef.current) {
      return;
    }
    syncInFlightRef.current = true;
    setSyncState((prev) => ({ ...prev, status: 'syncing', error: null }));
    try {
      const response = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: state.records }),
      });
      if (!response.ok) {
        throw new Error(`同步服務回應 ${response.status}`);
      }
      const payload = await response.json().catch(() => null);
      if (payload && Array.isArray(payload.records)) {
        dispatch({ type: 'hydrate', payload: payload.records });
      }
      const now = new Date().toISOString();
      setSyncState({ status: 'success', lastSyncedAt: now, error: null });
    } catch (error) {
      setSyncState((prev) => ({
        status: 'error',
        lastSyncedAt: prev.lastSyncedAt,
        error: error instanceof Error ? error.message : '未知的同步錯誤',
      }));
    } finally {
      syncInFlightRef.current = false;
    }
  }, [isSyncConfigured, state.records]);

  const syncNow = useCallback(async () => {
    if (!isSyncConfigured) return;
    await runSync();
  }, [isSyncConfigured, runSync]);

  useEffect(() => {
    if (!isSyncConfigured || typeof window === 'undefined') {
      return;
    }
    let cancelled = false;
    setSyncState((prev) => ({ ...prev, status: 'syncing', error: null }));
    (async () => {
      try {
        const response = await fetch(SYNC_ENDPOINT, { method: 'GET' });
        if (!response.ok) {
          throw new Error(`同步服務回應 ${response.status}`);
        }
        const payload = await response.json().catch(() => null);
        if (!cancelled && payload && Array.isArray(payload.records)) {
          dispatch({ type: 'hydrate', payload: payload.records });
        }
        if (!cancelled) {
          setSyncState({ status: 'success', lastSyncedAt: new Date().toISOString(), error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setSyncState((prev) => ({
            status: 'error',
            lastSyncedAt: prev.lastSyncedAt,
            error: error instanceof Error ? error.message : '無法載入遠端資料',
          }));
        }
      } finally {
        if (!cancelled) {
          hasInitializedSyncRef.current = true;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSyncConfigured]);

  useEffect(() => {
    if (!isSyncConfigured || !hasInitializedSyncRef.current) {
      return;
    }
    const timeout = window.setTimeout(() => {
      if (syncState.status !== 'syncing') {
        runSync();
      }
    }, 800);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [isSyncConfigured, runSync, state.records, syncState.status]);

  const value = useMemo(
    () => ({
      records: state.records,
      addRecord,
      updateRecord,
      removeRecord,
      syncNow,
      syncStatus: syncState.status,
      syncError: syncState.error,
      lastSyncedAt: syncState.lastSyncedAt,
      isSyncConfigured,
    }),
    [state.records, addRecord, updateRecord, removeRecord, syncNow, syncState, isSyncConfigured],
  );

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger() {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error('useLedger must be used within a LedgerProvider');
  }
  return context;
}
