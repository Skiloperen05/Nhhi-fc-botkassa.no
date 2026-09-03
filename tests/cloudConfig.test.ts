import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { resolveCloudConfig } from '../services/cloudConfig';

test('retired GitHub environment never selects the retired database or its mismatched key', () => {
  const expected = resolveCloudConfig();
  assert.equal(expected.url, 'https://qnwjhheoekpqqqhevztw.supabase.co');
  assert.deepEqual(resolveCloudConfig('https://wcvkrhjyubuzngsswbea.supabase.co', 'old-project-public-key'), expected);
  assert.deepEqual(resolveCloudConfig('https://wcvkrhjyubuzngsswbea.supabase.co/', 'old-project-public-key'), expected);
});

test('environment config is accepted as a complete valid pair only', () => {
  const url = 'https://new-project.supabase.co';
  assert.deepEqual(resolveCloudConfig(url, 'valid-public-key'), { url, key: 'valid-public-key' });
  assert.deepEqual(resolveCloudConfig(url, undefined), resolveCloudConfig());
  assert.deepEqual(resolveCloudConfig(undefined, 'valid-public-key'), resolveCloudConfig());
  assert.deepEqual(resolveCloudConfig(url, 'sb_secret_test'), resolveCloudConfig());
});
