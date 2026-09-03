import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import type { FineEntry } from '../types';
import { archiveFinesSafely, preparePaymentRequests } from '../services/finePersistenceService';

const makeFine = (overrides: Partial<FineEntry> = {}): FineEntry => ({
  id: 'fine-default',
  playerId: 'p5',
  amount: 30,
  reason: 'For sen',
  date: '2026-05-15T18:00:00.000Z',
  timestamp: Date.parse('2026-05-15T18:00:00.000Z'),
  status: 'unpaid',
  ...overrides,
});

test('failed or rejected archive writes never delete source fines or mutate input', async () => {
  const source = makeFine();
  const input = [source];
  const before = structuredClone(input);
  Object.freeze(input);
  Object.freeze(source);

  for (const rejects of [false, true]) {
    const deleted: string[] = [];
    await assert.rejects(archiveFinesSafely(input, [], {
      saveBulk: async () => {
        if (rejects) throw new Error('Network unavailable');
        return false;
      },
      delete: async (_type, id) => { deleted.push(id); return true; },
    }));
    assert.deepEqual(deleted, []);
    assert.deepEqual(input, before);
  }
});

test('archiving waits for durable save, deduplicates IDs and preserves an existing archive on retry', async () => {
  const staleSource = makeFine({ id: 'overlap', amount: 30 });
  const anotherSource = makeFine({ id: 'another', amount: 60 });
  const existingArchived = {
    ...makeFine({ id: staleSource.id, amount: 50, status: 'paid', isArchived: true }),
    complaint: { reason: 'Already reviewed', status: 'rejected' as const, date: '2026-05-16' },
    comments: [{ id: 'c1', userId: 'p5', userName: 'Birk Haugnes', text: 'Paid after archival', timestamp: 1778976000000 }],
    extraSavedData: { reference: 'receipt-1' },
  };
  const sources = [staleSource, anotherSource, { ...staleSource }];
  const originalSources = structuredClone(sources);
  const originalArchive = structuredClone(existingArchived);
  const events: string[] = [];
  const cloudArchive = new Map<string, FineEntry>();
  let allowSave: () => void = () => {};
  const saveReady = new Promise<void>(resolve => { allowSave = resolve; });

  const resultPromise = archiveFinesSafely(sources, [existingArchived], {
    saveBulk: async (type, rows) => {
      assert.equal(type, 'archive');
      events.push('save-started');
      await saveReady;
      rows.forEach(row => cloudArchive.set(row.id, row));
      events.push('save-completed');
      return true;
    },
    delete: async (type, id) => {
      assert.equal(type, 'fine');
      assert.ok(cloudArchive.has(id));
      events.push(`delete-${id}`);
      return true;
    },
  });

  assert.deepEqual(events, ['save-started']);
  allowSave();
  const result = await resultPromise;
  assert.deepEqual(events, ['save-started', 'save-completed', 'delete-overlap', 'delete-another']);
  assert.deepEqual(result.deletedIds, ['overlap', 'another']);
  assert.deepEqual(result.failedDeleteIds, []);
  assert.deepEqual(result.archivedFines.find(fine => fine.id === 'overlap'), existingArchived);
  assert.equal(result.archivedFines.find(fine => fine.id === 'another')?.isArchived, true);

  const retry = await archiveFinesSafely(sources, result.archivedFines, {
    saveBulk: async (_type, rows) => {
      rows.forEach(row => cloudArchive.set(row.id, row));
      return true;
    },
    delete: async () => true,
  });
  assert.equal(cloudArchive.size, 2);
  assert.deepEqual(retry.archivedFines, result.archivedFines);
  assert.deepEqual(cloudArchive.get('overlap'), existingArchived);
  assert.deepEqual(sources, originalSources);
  assert.deepEqual(existingArchived, originalArchive);
});

test('partial deletion reports only confirmed deletions while keeping every archive copy', async () => {
  const sources = ['deleted', 'false-result', 'rejected'].map(id => makeFine({ id }));
  const result = await archiveFinesSafely(sources, [], {
    saveBulk: async () => true,
    delete: async (_type, id) => {
      if (id === 'rejected') throw new Error('Delete request failed');
      return id === 'deleted';
    },
  });

  assert.deepEqual(result.deletedIds, ['deleted']);
  assert.deepEqual(result.failedDeleteIds, ['false-result', 'rejected']);
  assert.deepEqual(result.archivedFines, sources.map(fine => ({ ...fine, isArchived: true })));
});

test('archiving an empty selection performs no writes or deletes', async () => {
  const result = await archiveFinesSafely([], [makeFine({ isArchived: true })], {
    saveBulk: async () => { assert.fail('Unexpected archive write'); },
    delete: async () => { assert.fail('Unexpected source deletion'); },
  });
  assert.deepEqual(result, { archivedFines: [], deletedIds: [], failedDeleteIds: [] });
});

test('payment requests group active and archived fines by location while retaining all metadata', () => {
  const date = '2026-09-02T12:00:00.000Z';
  const active = {
    ...makeFine({ id: 'active', isArchived: true }),
    description: 'Stored active description',
    complaint: { reason: 'Old complaint', status: 'rejected' as const, date: '2026-05-16', votes: { p2: 'maintain' as const } },
    comments: [{ id: 'active-comment', userId: 'p5', userName: 'Birk Haugnes', text: 'Keep this comment', timestamp: 1778976000000 }],
    extraSavedData: { paymentReference: 'active-reference' },
  };
  // The collection determines storage location even if an older record lacks its archive flag.
  const archived = {
    ...makeFine({ id: 'archived' }),
    description: 'Stored archive description',
    aiComment: 'Existing AI comment',
    complaint: { reason: 'Another complaint', status: 'approved' as const, date: '2026-05-17' },
    payRequest: { status: 'rejected' as const, date: '2026-05-18' },
    comments: [{ id: 'archive-comment', userId: 'p3', userName: 'Former player', text: 'Keep archive discussion', timestamp: 1779062400000 }],
    reactions: [{ userId: 'p5', emoji: '👍' }],
    extraSavedData: { paymentReference: 'archive-reference' },
  };
  const current = [active, makeFine({ id: 'archived', amount: 999 }), makeFine({ id: 'paid', status: 'paid' }), makeFine({ id: 'pending', payRequest: { status: 'pending', date: '2026-09-01' } }), makeFine({ id: 'complained', complaint: { reason: 'Under review', status: 'pending', date: '2026-09-01' } })];
  const archive = [archived];
  const beforeCurrent = structuredClone(current);
  const beforeArchive = structuredClone(archive);
  Object.freeze(current);
  Object.freeze(archive);
  Object.freeze(active);
  Object.freeze(archived);

  const updates = preparePaymentRequests(['active', 'archived', 'active', 'archived', 'paid', 'pending', 'complained', 'missing', 'missing'], current, archive, date);
  assert.deepEqual(updates.fineUpdates, [{ ...active, payRequest: { status: 'pending', date } }]);
  assert.deepEqual(updates.archiveUpdates, [{ ...archived, isArchived: true, payRequest: { status: 'pending', date } }]);
  assert.deepEqual(updates.missingIds, ['missing']);
  assert.deepEqual(current, beforeCurrent);
  assert.deepEqual(archive, beforeArchive);
});

test('paid or pending archive copies override outdated unpaid active copies for payment requests', () => {
  const current = [makeFine({ id: 'paid-overlap' }), makeFine({ id: 'pending-overlap' })];
  const archived = [
    makeFine({ id: 'paid-overlap', status: 'paid', isArchived: true }),
    makeFine({ id: 'pending-overlap', payRequest: { status: 'pending', date: '2026-09-01' }, isArchived: true }),
  ];
  assert.deepEqual(preparePaymentRequests(current.map(fine => fine.id), current, archived, '2026-09-02'), {
    fineUpdates: [], archiveUpdates: [], missingIds: [],
  });
});
