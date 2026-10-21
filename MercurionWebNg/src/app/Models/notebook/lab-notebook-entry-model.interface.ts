import type { JsonObject } from '../json.models';

/** Domain summary, compatible with PostgreSQL scientific Notebook v1. */
export interface LabNotebookEntry {
  id: string;
  userId: string;
  title: string;
  premiseDelta: JsonObject | null;
  premiseText: string;
  createdAt: string;
  updatedAt: string;
}
