import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { monthAtOffset, isDateInPeriod } from '../services/dateService';

test('month navigation never skips short months or year boundaries', () => {
  for (const day of [29, 30, 31]) {
    const february = monthAtOffset(1, new Date(2026, 0, day));
    assert.equal(february.getMonth(), 1);
    assert.equal(february.getDate(), 1);
    assert.equal(monthAtOffset(-1, new Date(2026, 2, day)).getMonth(), 1);
  }
  assert.equal(monthAtOffset(1, new Date(2026, 11, 31)).getFullYear(), 2027);
  assert.equal(monthAtOffset(-1, new Date(2026, 0, 31)).getFullYear(), 2025);
});

test('period filters honor local calendar boundaries and all-history selection', () => {
  const ref = new Date(2026, 7, 1);
  assert.equal(isDateInPeriod(new Date(2026, 7, 1, 0, 1).toISOString(), 'month', ref), true);
  assert.equal(isDateInPeriod(new Date(2026, 6, 31, 23, 59).toISOString(), 'month', ref), false);
  assert.equal(isDateInPeriod(new Date(2026, 6, 31).toISOString(), 'semester', ref), false);
  assert.equal(isDateInPeriod(new Date(2026, 11, 31).toISOString(), 'semester', ref), true);
  assert.equal(isDateInPeriod('2025-12-01', 'year', ref), false);
  assert.equal(isDateInPeriod('invalid-legacy-date', 'all', ref), true);
});
