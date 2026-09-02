import type { FineEntry } from '../types';

/** Membership visibility must not remove fines from history or change historical totals. */
export const getFineHistory = (fines: FineEntry[], archived: FineEntry[]): FineEntry[] => {
  const historyById = new Map(fines.map(fine => [fine.id, fine]));
  // A fine can briefly exist in both collections while archiving syncs; count it once.
  archived.forEach(fine => historyById.set(fine.id, fine));
  return Array.from(historyById.values());
};
