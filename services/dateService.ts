import type { TimeFilter } from '../types';

// Anchor on day 1 so moving from the 29th–31st never skips a short month.
export const monthAtOffset = (offset: number, reference = new Date()): Date =>
  new Date(reference.getFullYear(), reference.getMonth() + offset, 1);

export const isDateInPeriod = (date: string, filter: TimeFilter, reference = new Date()): boolean => {
  if (filter === 'all') return true;

  const value = new Date(date);
  if (!Number.isFinite(value.getTime()) || value.getFullYear() !== reference.getFullYear()) return false;
  if (filter === 'year') return true;
  if (filter === 'month') return value.getMonth() === reference.getMonth();

  // The team's autumn semester starts in August; spring includes January–July.
  return (value.getMonth() >= 7) === (reference.getMonth() >= 7);
};
