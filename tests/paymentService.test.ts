import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import type { FineEntry } from '../types';
import { isFinePaymentOpen, canRequestFinePayment, canSavePaymentState, paymentAvailabilityMessage } from '../services/paymentService';
import { preparePaymentRequests } from '../services/finePersistenceService';

const september = new Date('2026-09-07T12:00:00Z');
const makeFine = (id: string, date: string, extra: Partial<FineEntry> = {}): FineEntry => ({
  id, date, playerId: 'p5', amount: 50, reason: 'Testbot', status: 'unpaid',
  timestamp: Date.parse('2026-09-07T12:00:00Z'), ...extra,
});

test('payment opens after the incident month, independent of registration date or archive flag', () => {
  assert.equal(isFinePaymentOpen(makeFine('august', '2026-08-31T12:00:00Z'), september), true);
  assert.equal(isFinePaymentOpen(makeFine('september', '2026-09-01T12:00:00Z', { isArchived: true }), september), false);
  assert.equal(isFinePaymentOpen(makeFine('future', '2026-10-01T12:00:00Z'), september), false);
  assert.equal(isFinePaymentOpen(makeFine('invalid', 'invalid'), september), false);
  assert.equal(paymentAvailabilityMessage({ date: '2026-09-15T12:00:00Z' }), 'Kan betales fra 1. oktober 2026');
});

test('payment boundaries use Norway time, including year and leap-year transitions', () => {
  const august = makeFine('august', '2026-08-10T12:00:00Z');
  assert.equal(isFinePaymentOpen(august, new Date('2026-08-31T21:59:59Z')), false);
  assert.equal(isFinePaymentOpen(august, new Date('2026-08-31T22:00:00Z')), true);
  assert.equal(isFinePaymentOpen(makeFine('oslo-september', '2026-08-31T22:30:00Z'), september), false);
  assert.equal(isFinePaymentOpen(makeFine('december', '2026-12-30T12:00:00Z'), new Date('2026-12-31T23:00:00Z')), true);
  assert.equal(isFinePaymentOpen(makeFine('leap', '2028-02-29T12:00:00Z'), new Date('2028-02-29T23:00:00Z')), true);
});

test('pay all includes only closed months and preserves excluded fines and all metadata', () => {
  const current = makeFine('september', '2026-09-01T12:00:00Z', { isArchived: true });
  const manual = makeFine('manual-august', '2026-08-12T12:00:00Z', { registeredBy: { id: 'p5', name: 'Birk Haugnes' } });
  const archive = makeFine('archive-august', '2026-08-01T12:00:00Z', { isArchived: true, comments: [{ id:'c1',userId:'p5',userName:'Birk',text:'Bevar',timestamp:1 }] });
  const future = makeFine('future', '2026-10-01T12:00:00Z');
  const fines = [current, manual, future];
  const before = structuredClone(fines);
  const date = september.toISOString();
  const updates = preparePaymentRequests(['september', 'manual-august', 'archive-august', 'future'], fines, [archive], date);
  assert.deepEqual(updates.fineUpdates, [{ ...manual, payRequest: {status:'pending',date} }]);
  assert.deepEqual(updates.archiveUpdates, [{ ...archive, payRequest: {status:'pending',date} }]);
  assert.deepEqual(fines, before);
  assert.equal(canRequestFinePayment(current, new Date('2026-10-01T00:00:00Z')), true);
  assert.equal(canRequestFinePayment({ ...archive, status:'paid' }, september), false);
  assert.equal(canRequestFinePayment({ ...archive, payRequest:{status:'pending',date} }, september), false);
  assert.equal(canRequestFinePayment({ ...archive, complaint:{status:'pending',date,reason:'Review'} }, september), false);
});

test('single payment, approval and editor cannot bypass the month rule; existing history remains editable', () => {
  const current = makeFine('september', '2026-09-01T12:00:00Z');
  const paid = { ...current, status:'paid' as const };
  const pending = { ...current, payRequest:{status:'pending' as const,date:september.toISOString()} };
  assert.equal(canSavePaymentState(paid, current, september), false);
  assert.equal(canSavePaymentState(paid, pending, september), false);
  assert.equal(canSavePaymentState(pending, current, september), false);
  assert.equal(canSavePaymentState(paid, undefined, september), false);
  assert.equal(canSavePaymentState({ ...current, description:'New note' }, current, september), true);
  assert.equal(canSavePaymentState({ ...paid, description:'Keep paid history' }, paid, september), true);
  assert.equal(canSavePaymentState({ ...pending, description:'Keep pending history' }, pending, september), true);
  assert.equal(canSavePaymentState(paid, { ...paid, date:'2026-08-01T12:00:00Z' }, september), false);
  assert.equal(canSavePaymentState(paid, current, new Date('2026-10-01T00:00:00Z')), true);
});
