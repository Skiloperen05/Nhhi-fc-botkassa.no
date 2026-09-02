import { DEFAULT_PLAYERS, LEGACY_PLAYERS } from '../constants';
import type { Player, User } from '../types';

// This is the existing account repair, not a new roster migration.
export const ACCOUNT_MIGRATION_VERSION = 1;

const INVALID_LEGACY_PLAYER_IDS = new Set(['p39', 'p40', 'p41']);
const LEGACY_PLAYER_IDS = new Set(LEGACY_PLAYERS.map(player => player.id));
const NAME_ALIASES: Record<string, string> = {
  'Jakob Solhaug Sørum': 'Jakob Sørum',
  'Jonas Kristiansen': 'Jonas Landsem Kristiansen',
  'Njål Osmundsen': 'Njål Sondre Osmundsen',
  'Martin Devik': 'Martin Leganger Devik',
};

export const normalizeName = (name: string): string => {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  return NAME_ALIASES[trimmed] || trimmed;
};

export const canonicalPlayerByName = (name: string): Player | undefined =>
  DEFAULT_PLAYERS.find(player => player.name === normalizeName(name));

const legacyPlayerByName = (name: string): Player | undefined =>
  LEGACY_PLAYERS.find(player => player.name === normalizeName(name));

const isLegacyAccountId = (id: string): boolean =>
  id === 'p0' || LEGACY_PLAYER_IDS.has(id);

export const isPlayerActive = (player: Player): boolean => player.isActive !== false;

/** Keep persisted accounts authoritative; roster defaults only fill missing fields/accounts. */
export const normalizePlayerIdentities = (players: Player[]): Player[] => {
  const defaultsById = new Map(DEFAULT_PLAYERS.map(player => [player.id, player]));
  const existingIds = new Set(players.map(player => player.id));
  const existingNames = new Set(players.map(player => normalizeName(player.name)));

  const stored = players.map(player => {
    const defaults = defaultsById.get(player.id) || canonicalPlayerByName(player.name);
    return {
      ...defaults,
      ...player,
      name: normalizeName(player.name),
      isActive: INVALID_LEGACY_PLAYER_IDS.has(player.id)
        ? false
        : player.isActive ?? defaults?.isActive ?? false,
    };
  });

  // A player already created manually keeps that ID and its fine/message references.
  const missing = DEFAULT_PLAYERS.filter(player =>
    !existingIds.has(player.id) && !existingNames.has(player.name)
  ).map(player => ({ ...player }));

  return [...stored, ...missing];
};

/** Repair the historical shifted numeric accounts once, without involving new roster IDs. */
export const repairPlayerAccounts = (storedPlayers: Player[], storedUser: User | null): Player[] => {
  const storedById = new Map(storedPlayers.map(player => [player.id, player]));
  const legacySources = storedPlayers.filter(player => isLegacyAccountId(player.id));
  const namesAlreadyCanonical = LEGACY_PLAYERS.every(player => {
    const stored = storedById.get(player.id);
    return !stored || normalizeName(stored.name) === player.name;
  });
  const sessionCanonical = storedUser && legacyPlayerByName(storedUser.name);
  const sessionIsShifted = Boolean(
    storedUser && isLegacyAccountId(storedUser.id) &&
    sessionCanonical && sessionCanonical.id !== storedUser.id
  );
  const adminRolesAreShifted =
    storedById.get('p1')?.systemRole === 'admin' ||
    storedById.get('p4')?.systemRole === 'admin';
  const canonicalAccountsAreShifted = namesAlreadyCanonical && (sessionIsShifted || adminRolesAreShifted);
  const legacyNamesAreShifted = legacySources.some(player => {
    const canonical = legacyPlayerByName(player.name);
    return canonical && canonical.id !== player.id;
  });

  if (!canonicalAccountsAreShifted && !legacyNamesAreShifted) {
    return normalizePlayerIdentities(storedPlayers);
  }

  const customPlayers = storedPlayers.filter(player => !LEGACY_PLAYER_IDS.has(player.id));
  const customNames = new Set(customPlayers.map(player => normalizeName(player.name)));
  const repairedLegacy = LEGACY_PLAYERS.flatMap(canonical => {
    const source = canonicalAccountsAreShifted
      ? storedById.get(`p${Number(canonical.id.slice(1)) - 1}`)
      : legacySources.find(player => legacyPlayerByName(player.name)?.id === canonical.id);

    // Avoid replacing a manually created account with a new default account.
    if (!source && customNames.has(canonical.name)) return [];

    return [{
      ...canonical,
      ...source,
      id: canonical.id,
      name: canonical.name,
      isActive: source?.isActive ?? canonical.isActive,
    }];
  });

  // Includes the old invalid records: normalization hides them without dropping their data.
  return normalizePlayerIdentities([...repairedLegacy, ...customPlayers]);
};

export const repairSession = (user: User | null, players: Player[]): User | null => {
  if (!user) return null;

  const byId = players.find(player => player.id === user.id);
  const canonical = legacyPlayerByName(user.name);
  const explicitlyShiftedLegacy = isLegacyAccountId(user.id) && canonical &&
    canonical.id !== user.id && normalizeName(byId?.name || '') !== canonical.name;
  const repairedLegacy = explicitlyShiftedLegacy
    ? players.find(player => player.id === canonical.id && normalizeName(player.name) === canonical.name)
    : undefined;
  const player = repairedLegacy || byId;

  return player
    ? { ...user, id: player.id, name: player.name, role: player.systemRole }
    : { ...user, name: normalizeName(user.name) };
};
