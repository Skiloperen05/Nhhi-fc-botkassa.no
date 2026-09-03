import type { FineEntry } from '../types';

export interface ArchivePersistence {
  saveBulk: (type: 'archive', rows: FineEntry[]) => Promise<boolean>;
  delete: (type: 'fine', id: string) => Promise<boolean>;
}

export interface ArchiveResult {
  archivedFines: FineEntry[];
  deletedIds: string[];
  failedDeleteIds: string[];
}

/** A durable archive copy must exist before any source copy can be removed. */
export const archiveFinesSafely = async (
  toArchive: FineEntry[],
  existingArchive: FineEntry[],
  persistence: ArchivePersistence,
): Promise<ArchiveResult> => {
  const sourceById = new Map(toArchive.map(fine => [fine.id, fine]));
  const archiveById = new Map(existingArchive.map(fine => [fine.id, fine]));
  const archivedFines = Array.from(sourceById.values(), fine => ({
    // A previous attempt may already have archived and subsequently updated this fine.
    ...(archiveById.get(fine.id) || fine),
    isArchived: true,
  }));

  if (archivedFines.length === 0) {
    return { archivedFines: [], deletedIds: [], failedDeleteIds: [] };
  }

  const saved = await persistence.saveBulk('archive', archivedFines);
  if (saved !== true) throw new Error('Saving the archive failed; source fines were retained.');

  const deletions = await Promise.all(archivedFines.map(async fine => {
    try {
      return { id: fine.id, deleted: await persistence.delete('fine', fine.id) === true };
    } catch {
      return { id: fine.id, deleted: false };
    }
  }));

  return {
    archivedFines,
    deletedIds: deletions.filter(result => result.deleted).map(result => result.id),
    failedDeleteIds: deletions.filter(result => !result.deleted).map(result => result.id),
  };
};

export interface PaymentRequestUpdates {
  fineUpdates: FineEntry[];
  archiveUpdates: FineEntry[];
  missingIds: string[];
}

/** Group changes by their storage collection, with archived copies taking precedence. */
export const preparePaymentRequests = (
  ids: string[],
  fines: FineEntry[],
  archived: FineEntry[],
  date: string,
): PaymentRequestUpdates => {
  const finesById = new Map(fines.map(fine => [fine.id, fine]));
  const archiveById = new Map(archived.map(fine => [fine.id, fine]));
  const result: PaymentRequestUpdates = { fineUpdates: [], archiveUpdates: [], missingIds: [] };

  for (const id of new Set(ids)) {
    const archivedFine = archiveById.get(id);
    const fine = archivedFine || finesById.get(id);
    if (!fine) {
      result.missingIds.push(id);
      continue;
    }
    if (fine.status !== 'unpaid' || fine.payRequest?.status === 'pending' || fine.complaint?.status === 'pending') continue;

    const updated: FineEntry = { ...fine, payRequest: { status: 'pending', date } };
    if (archivedFine) {
      result.archiveUpdates.push({ ...updated, isArchived: true });
    } else {
      result.fineUpdates.push(updated);
    }
  }

  return result;
};
