// src/app_modules/chembl_36/utils/sync-checkpoint.util.ts
import { promises as fs } from 'fs';
import * as path from 'path';

export type SyncState = { lastKey: string; updatedAt: string };

const BASE_DIR = path.resolve(process.cwd(), 'sync-checkpoints'); // fuori da src/dist
export const CHECKPOINT_FILEPATH = path.join(BASE_DIR, 'molecule_details_chembl_36.json');

export async function readCheckpoint(): Promise<SyncState | null> {
  try {
    const raw = await fs.readFile(CHECKPOINT_FILEPATH, 'utf8');
    const parsed = JSON.parse(raw) as SyncState;
    return (parsed?.lastKey && typeof parsed.lastKey === 'string') ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeCheckpoint(state: SyncState): Promise<void> {
  await fs.mkdir(BASE_DIR, { recursive: true });
  const tmp = CHECKPOINT_FILEPATH + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(state), 'utf8');
  await fs.rename(tmp, CHECKPOINT_FILEPATH); // atomico
}

export async function resetCheckpoint(): Promise<void> {
  try { await fs.unlink(CHECKPOINT_FILEPATH); } catch { /* noop */ }
}

export function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
