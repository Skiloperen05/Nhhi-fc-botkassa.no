import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { DEFAULT_PLAYERS, LEGACY_PLAYERS, NEW_PLAYERS } from '../constants';
import type { Player } from '../types';
import {
  ACCOUNT_MIGRATION_VERSION,
  canonicalPlayerByName,
  isPlayerActive,
  normalizeName,
  normalizePlayerIdentities,
  repairPlayerAccounts,
  repairSession,
} from '../services/playerService';

test('normalization keeps the entire stored profile and existing ID', () => {
  const original = {
    ...LEGACY_PLAYERS[1],
    name: 'Aleksander Moe',
    password: 'already-changed-password',
    hasChangedPassword: true,
    systemRole: 'user' as const,
    customRole: 'Spillerrepresentant',
    position: 'Keeper',
    email: 'updated@example.test',
    phone: '+4712345678',
    isActive: true,
    extraSavedData: { memberSince: 2024 },
  };
  const normalized = normalizePlayerIdentities([original]);
  assert.deepEqual(normalized.find(player => player.id === original.id), original);
  assert.deepEqual(normalizePlayerIdentities(normalized), normalized);
});

test('roster aliases normalize names without changing IDs or passwords', () => {
  const original: Player = {
    id: 'manually-created-jakob',
    name: 'Jakob Solhaug Sørum',
    systemRole: 'user',
    password: 'jakob-existing-password',
    hasChangedPassword: true,
  };
  const result = normalizePlayerIdentities([original]);
  const jakobs = result.filter(player => player.name === 'Jakob Sørum');
  assert.equal(jakobs.length, 1);
  assert.equal(jakobs[0].id, original.id);
  assert.equal(jakobs[0].password, original.password);
  assert.equal(jakobs[0].hasChangedPassword, true);
  assert.equal(normalizeName('  Jakob Solhaug Sørum  '), 'Jakob Sørum');
  assert.equal(canonicalPlayerByName(original.name)?.name, 'Jakob Sørum');
});

test('an existing new member account takes precedence over its roster default ID', () => {
  assert.ok(NEW_PLAYERS.length > 0);
  const rosterPlayer = NEW_PLAYERS[0];
  const existing: Player = {
    id: 'custom-before-autumn-import',
    name: rosterPlayer.name,
    systemRole: 'admin',
    customRole: 'Coach',
    password: 'existing-new-member-password',
    hasChangedPassword: true,
    email: 'existing@example.test',
  };
  const result = normalizePlayerIdentities([existing]);
  assert.equal(result.some(player => player.id === rosterPlayer.id), false);
  assert.equal(result.filter(player => player.name === rosterPlayer.name).length, 1);
  const stored = result.find(player => player.id === existing.id)!;
  assert.equal(stored.password, existing.password);
  assert.equal(stored.systemRole, existing.systemRole);
  assert.equal(stored.email, existing.email);
  assert.equal(stored.customRole, existing.customRole);
  assert.equal(stored.isActive, true);
});

test('departed and unknown accounts remain stored but default to hidden', () => {
  const departed = LEGACY_PLAYERS.find(player => player.isActive === false);
  assert.ok(departed, 'The autumn roster should retain departed legacy players.');
  const { isActive: _oldFlag, ...withoutFlag } = departed;
  const legacyPassword = 'former-member-password';
  const records: Player[] = [
    { ...withoutFlag, password: legacyPassword, hasChangedPassword: true },
    { id: 'p39', name: 'Legacy extra account', systemRole: 'user', password: 'p39-password' },
    { id: 'p40', name: 'Legacy extra account 2', systemRole: 'user' },
    { id: 'p41', name: 'Legacy extra account 3', systemRole: 'user', isActive: true },
    { id: 'former-custom', name: 'Former custom player', systemRole: 'user', password: 'custom-password' },
    { id: 'future-custom', name: 'Future custom player', systemRole: 'user', isActive: true },
  ];
  const normalized = normalizePlayerIdentities(records);
  for (const original of records) {
    const stored = normalized.find(player => player.id === original.id);
    assert.ok(stored, `Preserve ${original.id}`);
    assert.equal(stored.password, original.password);
    assert.equal(isPlayerActive(stored), original.id === 'future-custom');
  }
  assert.equal(normalized.find(player => player.id === departed.id)?.hasChangedPassword, true);
  assert.deepEqual(normalizePlayerIdentities(normalized), normalized);
});

test('explicit active and hidden flags override the known roster defaults', () => {
  const active = DEFAULT_PLAYERS.find(player => player.isActive === true)!;
  const departed = LEGACY_PLAYERS.find(player => player.isActive === false)!;
  const result = normalizePlayerIdentities([
    { ...active, isActive: false },
    { ...departed, isActive: true },
  ]);
  assert.equal(result.find(player => player.id === active.id)?.isActive, false);
  assert.equal(result.find(player => player.id === departed.id)?.isActive, true);
});

test('new roster IDs are stable, unique and separate from historical numeric IDs', () => {
  assert.equal(ACCOUNT_MIGRATION_VERSION, 1);
  assert.equal(LEGACY_PLAYERS.length, 38);
  assert.deepEqual(LEGACY_PLAYERS.map(player => player.id), Array.from({ length: 38 }, (_, index) => `p${index + 1}`));
  assert.ok(NEW_PLAYERS.every(player => player.id.startsWith('h2026_')));
  assert.equal(new Set(DEFAULT_PLAYERS.map(player => player.id)).size, DEFAULT_PLAYERS.length);
  const first = normalizePlayerIdentities([]);
  assert.deepEqual(first, DEFAULT_PLAYERS);
  assert.deepEqual(normalizePlayerIdentities(first), first);
});

test('historical shifted account repair retains credentials and all source profile fields', () => {
  const stored = LEGACY_PLAYERS.map(player => ({
    ...player,
    password: `password-originally-at-${player.id}`,
    hasChangedPassword: true,
    systemRole: player.id === 'p1' || player.id === 'p4' ? 'admin' as const : 'user' as const,
    customRole: `saved-role-at-${player.id}`,
    email: `saved-${player.id}@example.test`,
    phone: `phone-${player.id}`,
    extraSavedData: { originalId: player.id },
  }));
  const newMember = { ...NEW_PLAYERS[0], password: 'new-password', hasChangedPassword: true, extraSavedData: { untouched: true } };
  const invalid: Player = { id: 'p39', name: 'Former account', systemRole: 'user', password: 'invalid-legacy-password' };
  const repaired = repairPlayerAccounts([...stored, newMember, invalid], { id: 'p1', name: 'Aleksander Moe', role: 'admin' });
  const source = stored.find(player => player.id === 'p1')!;
  const target = repaired.find(player => player.id === 'p2')!;
  assert.deepEqual(target, { ...LEGACY_PLAYERS[1], ...source, id: 'p2', name: 'Aleksander Moe' });
  assert.deepEqual(repaired.find(player => player.id === newMember.id), newMember);
  assert.deepEqual(repaired.find(player => player.id === invalid.id), { ...invalid, isActive: false });
  assert.deepEqual(normalizePlayerIdentities(repaired), repaired);
  assert.equal(normalizePlayerIdentities(repaired).find(player => player.id === 'p2')?.password, source.password);
});

test('unshifted legacy repair and repeated refreshes retain existing passwords', () => {
  const existing: Player[] = [
    { ...LEGACY_PLAYERS[1], password: 'already-correct-password', hasChangedPassword: true },
    { ...NEW_PLAYERS[0], password: 'new-account-password', hasChangedPassword: true },
  ];
  const repaired = repairPlayerAccounts(existing, null);
  const twice = normalizePlayerIdentities(normalizePlayerIdentities(repaired));
  for (const player of existing) {
    assert.equal(twice.find(stored => stored.id === player.id)?.password, player.password);
    assert.equal(twice.find(stored => stored.id === player.id)?.hasChangedPassword, true);
  }
});

test('sessions use stored IDs and roles while repairing an explicitly shifted legacy identity', () => {
  const custom: Player = { id: 'custom-jakob', name: 'Jakob Sørum', systemRole: 'admin', isActive: true };
  const result = normalizePlayerIdentities([custom]);
  assert.deepEqual(repairSession({ id: custom.id, name: 'Jakob Solhaug Sørum', role: 'user' }, result), {
    id: custom.id, name: custom.name, role: custom.systemRole,
  });
  assert.deepEqual(repairSession({ id: 'p1', name: 'Aleksander Moe', role: 'user' }, result), {
    id: 'p2', name: 'Aleksander Moe', role: 'admin',
  });
  const unknown = { id: 'unknown-custom-id', name: 'Aleksander Moe', role: 'user' as const };
  assert.deepEqual(repairSession(unknown, result), unknown);
  assert.equal(repairSession(null, result), null);
});
