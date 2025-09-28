// src/app_modules/chembl_36/services/sync-checkpoint.util.ts
import { promises as fs } from 'fs';
import * as path from 'path';

export type SyncState = {
  lastKey: string;     // UUID dell’ultimo documento indicizzato con successo
  updatedAt: string;   // ISO timestamp
};

const BASE_DIR = path.resolve(process.cwd(), 'sync-checkpoints'); // fuori da src
const FILEPATH = path.join(BASE_DIR, 'molecule_details_chembl_36.json');

export async function readCheckpoint(): Promise<SyncState | null> {
  try {
    const raw = await fs.readFile(FILEPATH, 'utf8');
    const parsed = JSON.parse(raw) as SyncState;
    if (parsed?.lastKey && typeof parsed.lastKey === 'string') return parsed;
    return null;
  } catch {
    return null; // file mancante o corrotto => nessun checkpoint
  }
}

export async function writeCheckpoint(state: SyncState): Promise<void> {
  await fs.mkdir(BASE_DIR, { recursive: true });
  const tmp = FILEPATH + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(state), 'utf8');
  await fs.rename(tmp, FILEPATH); // scrittura atomica
}

export async function resetCheckpoint(): Promise<void> {
  try {
    await fs.unlink(FILEPATH);
  } catch {
    /* noop */
  }
}

export function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

// opzionale: UUID “zero”
export const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
