import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { DEFAULT_PLAYERS } from '../constants';
import type { FineEntry } from '../types';
import { getFineHistory } from '../services/historyService';

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

test('history totals include fines for active, hidden and unknown players', () => {
  const active = DEFAULT_PLAYERS.find(player => player.isActive === true)!;
  const hidden = DEFAULT_PLAYERS.find(player => player.isActive === false)!;
  const current = [makeFine({ id: 'current', playerId: active.id, amount: 30 })];
  const archived = [
    makeFine({ id: 'former-member', playerId: hidden.id, amount: 50, isArchived: true }),
    makeFine({ id: 'unknown-member', playerId: 'historical-account-not-in-roster', amount: 70, status: 'paid', isArchived: true }),
  ];

  const history = getFineHistory(current, archived);
  assert.equal(history.length, 3);
  assert.equal(history.reduce((total, fine) => total + fine.amount, 0), 150);
  assert.equal(history.filter(fine => fine.status === 'unpaid').reduce((total, fine) => total + fine.amount, 0), 80);
  assert.equal(history.filter(fine => fine.status === 'paid').reduce((total, fine) => total + fine.amount, 0), 70);
  assert.ok(history.some(fine => fine.playerId === hidden.id));
  assert.ok(history.some(fine => fine.playerId === 'historical-account-not-in-roster'));
});

test('history preserves payment status, complaints, comments and other stored data without changing inputs', () => {
  const unpaid = {
    ...makeFine({ id: 'unpaid' }),
    description: 'Historisk beskrivelse',
    aiComment: 'Lagret kommentar',
    complaint: { reason: 'Kom til avtalt tid', status: 'pending' as const, date: '2026-05-16', votes: { p5: 'maintain' as const } },
    payRequest: { status: 'pending' as const, date: '2026-05-17' },
    comments: [{ id: 'comment-1', userId: 'p3', userName: 'Former member', text: 'Historisk kommentar', timestamp: 1778976000000, reactions: [{ emoji: '👍', userId: 'p5' }] }],
    reactions: [{ emoji: '⚽', userId: 'p3' }],
    extraSavedData: { source: 'old-import' },
  };
  const paid = makeFine({
    id: 'paid',
    status: 'paid',
    isArchived: true,
    complaint: { reason: 'Tidligere klage', status: 'rejected', date: '2026-05-18' },
    comments: [{ id: 'comment-2', userId: 'p5', userName: 'Birk Haugnes', text: 'Betalt', timestamp: 1779062400000 }],
  });
  const current = [unpaid];
  const archived = [paid];
  const originalCurrent = structuredClone(current);
  const originalArchived = structuredClone(archived);
  Object.freeze(current);
  Object.freeze(archived);
  Object.freeze(unpaid);
  Object.freeze(paid);

  const history = getFineHistory(current, archived);
  assert.deepEqual(history.find(fine => fine.id === unpaid.id), originalCurrent[0]);
  assert.deepEqual(history.find(fine => fine.id === paid.id), originalArchived[0]);
  assert.deepEqual(current, originalCurrent);
  assert.deepEqual(archived, originalArchived);
});

test('a fine present in both collections is counted once with the complete archived copy', () => {
  const current = makeFine({ id: 'overlap', amount: 30, status: 'unpaid' });
  const archived = {
    ...makeFine({ id: current.id, amount: 50, status: 'paid', isArchived: true }),
    description: 'Oppdatert historisk bot',
    complaint: { reason: 'Klage vurdert', status: 'rejected' as const, date: '2026-05-19', votes: { p2: 'maintain' as const } },
    comments: [{ id: 'archive-comment', userId: 'p2', userName: 'Aleksander Moe', text: 'Avgjort', timestamp: 1779148800000 }],
    extraSavedData: { receipt: 'saved-reference' },
  };
  const history = getFineHistory([current], [archived]);

  assert.equal(history.length, 1);
  assert.equal(history.reduce((total, fine) => total + fine.amount, 0), 50);
  assert.deepEqual(history[0], archived);
  assert.equal(current.amount, 30);
  assert.equal(current.status, 'unpaid');
});
