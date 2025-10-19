import * as SQLite from 'expo-sqlite';
import { LedgerRecord, PlanTier } from '@/types';

const database = SQLite.openDatabase('ledger.db');

type SQLParams = (string | number | null)[];

const executeSql = <T = SQLite.SQLResultSet>(sql: string, params: SQLParams = []) =>
  new Promise<SQLite.SQLResultSet>((resolve, reject) => {
    database.transaction((tx) => {
      tx.executeSql(
        sql,
        params,
        (_, result) => resolve(result),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });

export const initializeLedger = async () => {
  await executeSql(
    `CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      category TEXT NOT NULL,
      note TEXT,
      date TEXT NOT NULL,
      tags TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      deleted INTEGER DEFAULT 0,
      dirty INTEGER DEFAULT 1
    );`
  );

  await executeSql(
    `CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );`
  );
};

const mapRowsToRecords = (rows: SQLite.SQLResultSetRowList): LedgerRecord[] => {
  const records: LedgerRecord[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows.item(i) as any;
    records.push({
      id: row.id,
      type: row.type,
      amount: row.amount,
      currency: row.currency,
      category: row.category,
      note: row.note ?? undefined,
      date: row.date,
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deleted: row.deleted === 1,
      dirty: row.dirty === 1
    });
  }
  return records;
};

export const listLedgerRecords = async (): Promise<LedgerRecord[]> => {
  const result = await executeSql('SELECT * FROM records WHERE deleted = 0 ORDER BY date DESC');
  return mapRowsToRecords(result.rows);
};

export const listDirtyRecords = async (): Promise<LedgerRecord[]> => {
  const result = await executeSql('SELECT * FROM records WHERE dirty = 1');
  return mapRowsToRecords(result.rows);
};

export const upsertRecord = async (record: LedgerRecord) => {
  await executeSql(
    `INSERT INTO records (id, type, amount, currency, category, note, date, tags, createdAt, updatedAt, deleted, dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      amount = excluded.amount,
      currency = excluded.currency,
      category = excluded.category,
      note = excluded.note,
      date = excluded.date,
      tags = excluded.tags,
      createdAt = excluded.createdAt,
      updatedAt = excluded.updatedAt,
      deleted = excluded.deleted,
      dirty = excluded.dirty;`,
    [
      record.id,
      record.type,
      record.amount,
      record.currency,
      record.category,
      record.note ?? null,
      record.date,
      JSON.stringify(record.tags ?? []),
      record.createdAt,
      record.updatedAt,
      record.deleted ? 1 : 0,
      record.dirty ? 1 : 0
    ]
  );
};

export const markRecordDeleted = async (id: string, timestamp: string) => {
  await executeSql('UPDATE records SET deleted = 1, dirty = 1, updatedAt = ? WHERE id = ?', [timestamp, id]);
};

export const clearDirtyFlag = async (ids: string[]) => {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  await executeSql(`UPDATE records SET dirty = 0 WHERE id IN (${placeholders})`, ids);
};

export const clearAllRecords = async () => {
  await executeSql('DELETE FROM records');
};

export const getMetaValue = async (key: string): Promise<string | null> => {
  const result = await executeSql('SELECT value FROM meta WHERE key = ?', [key]);
  if (result.rows.length === 0) return null;
  const row = result.rows.item(0) as any;
  return row.value ?? null;
};

export const setMetaValue = async (key: string, value: string) => {
  await executeSql('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [key, value]);
};

export const getPlanTier = async (): Promise<PlanTier> => {
  const value = await getMetaValue('plan');
  if (value === 'pro' || value === 'enterprise') {
    return value;
  }
  return 'free';
};

export const setPlanTier = async (plan: PlanTier) => {
  await setMetaValue('plan', plan);
};

export const setLastSyncAt = async (timestamp: string) => setMetaValue('lastSyncAt', timestamp);
export const getLastSyncAt = async () => getMetaValue('lastSyncAt');

export const setAiUsage = async (date: string, count: number) =>
  setMetaValue('aiUsage', JSON.stringify({ date, count }));

export const getAiUsage = async (): Promise<{ date: string; count: number } | null> => {
  const raw = await getMetaValue('aiUsage');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { date: string; count: number };
    return parsed;
  } catch (error) {
    return null;
  }
};
