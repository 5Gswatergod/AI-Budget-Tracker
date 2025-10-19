import Constants from 'expo-constants';
import { LedgerRecord } from '@/types';

const resolveEndpoint = () => {
  const expoExtra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  return (
    expoExtra?.EXPO_PUBLIC_SYNC_ENDPOINT ||
    (Constants?.manifest2 as any)?.extra?.EXPO_PUBLIC_SYNC_ENDPOINT ||
    process.env.EXPO_PUBLIC_SYNC_ENDPOINT ||
    ''
  );
};

export const getSyncEndpoint = () => resolveEndpoint();

export const syncEnabled = () => Boolean(resolveEndpoint());

const mapRecordForUpload = (record: LedgerRecord) => ({
  ...record,
  tags: record.tags ?? []
});

export const pullRemoteRecords = async (): Promise<LedgerRecord[]> => {
  const endpoint = resolveEndpoint();
  if (!endpoint) return [];
  const response = await fetch(`${endpoint.replace(/\/$/, '')}/sync`);
  if (!response.ok) {
    throw new Error(`Sync pull failed: ${response.status}`);
  }
  const payload = (await response.json()) as { records?: LedgerRecord[] };
  return (payload.records ?? []).map((record) => ({
    ...record,
    tags: record.tags ?? [],
    deleted: Boolean(record.deleted),
    dirty: false
  }));
};

export const pushRemoteRecords = async (records: LedgerRecord[]) => {
  const endpoint = resolveEndpoint();
  if (!endpoint) return;
  const response = await fetch(`${endpoint.replace(/\/$/, '')}/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ records: records.map(mapRecordForUpload) })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Sync push failed: ${response.status} ${message}`);
  }
};
