// src/app_modules/embeddings/utils/emb-checkpoint.util.ts
import { promises as fs } from 'fs';
import * as path from 'path';

export const EMB_CHECKPOINT = path.resolve(process.cwd(), '.sync-checkpoints/embeddings.json');

export type EmbCheckpoint = {
    lastKey: string;             // ultimo stableUuid processato
    mode: 'seed' | 'embed' | 'done'; // fase
    updatedAt: string;
};

export async function readEmbCk(): Promise<EmbCheckpoint | null> {
    try { return JSON.parse(await fs.readFile(EMB_CHECKPOINT, 'utf8')); }
    catch { return null; }
}
export async function writeEmbCk(p: EmbCheckpoint) {
    await fs.mkdir(path.dirname(EMB_CHECKPOINT), { recursive: true });
    await fs.writeFile(EMB_CHECKPOINT, JSON.stringify(p), 'utf8');
}
export async function resetEmbCk() {
    await fs.rm(EMB_CHECKPOINT, { force: true });
}
export const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
export const isUuid = (s?: string) => !!s && /^[0-9a-f-]{36}$/i.test(s);
