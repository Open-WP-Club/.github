import assert from 'node:assert/strict';
import test from 'node:test';
import { mapWithConcurrency } from '../scripts/github-api.mjs';

test('mapWithConcurrency preserves order and respects its limit', async () => {
  let active = 0;
  let peak = 0;
  const values = await mapWithConcurrency([3, 1, 2, 4], 2, async (value) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, value));
    active -= 1;
    return value * 2;
  });

  assert.deepEqual(values, [6, 2, 4, 8]);
  assert.equal(peak, 2);
});
