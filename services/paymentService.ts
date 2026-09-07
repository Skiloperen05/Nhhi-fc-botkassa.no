import type { FineEntry } from '../types';

const monthFormatter = new Intl.DateTimeFormat('en', {
  timeZone: 'Europe/Oslo', year: 'numeric', month: 'numeric',
});

const monthNumber = (date: Date): number => {
  if (!Number.isFinite(date.getTime())) return NaN;
  const parts = monthFormatter.formatToParts(date);
  const year = Number(parts.find(part => part.type === 'year')?.value);
  const month = Number(parts.find(part => part.type === 'month')?.value);
  return year * 12 + month - 1;
};

/** Eligibility follows the incident date and the team's calendar, not archive location. */
export const isFinePaymentOpen = (fine: Pick<FineEntry, 'date'>, now = new Date()): boolean =>
  monthNumber(new Date(fine.date)) < monthNumber(now);

export const canRequestFinePayment = (fine: FineEntry, now = new Date()): boolean =>
  isFinePaymentOpen(fine, now) && fine.status === 'unpaid' &&
  fine.payRequest?.status !== 'pending' && fine.complaint?.status !== 'pending';

export const paymentAvailabilityMessage = (fine: Pick<FineEntry, 'date'>): string => {
  const month = monthNumber(new Date(fine.date));
  if (!Number.isFinite(month)) return 'Dato må rettes før betaling.';
  const opens = new Date(Date.UTC(Math.floor(month / 12), month % 12 + 1, 1));
  return `Kan betales fra ${opens.toLocaleDateString('nb-NO', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })}`;
};

/** Reject new payments and requests, while retaining already recorded payment history. */
export const canSavePaymentState = (next: FineEntry, previous?: FineEntry, now = new Date()): boolean => {
  if (isFinePaymentOpen(next, now)) return true;
  const sameIncidentMonth = previous && monthNumber(new Date(previous.date)) === monthNumber(new Date(next.date));
  if (next.status === 'paid' && !(previous?.status === 'paid' && sameIncidentMonth)) return false;
  if (next.payRequest?.status === 'pending' &&
      !(previous?.payRequest?.status === 'pending' && sameIncidentMonth)) return false;
  return true;
};
