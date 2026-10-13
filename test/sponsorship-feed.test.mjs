import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refreshSponsorship, validateSponsorshipFeed } from '../scripts/sponsorship-feed.mjs';
const empty = { schemaVersion: 1, maxPositions: 3, supporters: [], campaigns: [] };
test('successful empty feed removes previous supporters', async () => {
  assert.deepEqual(await refreshSponsorship({ invalid: true }, async () => new Response(JSON.stringify(empty))), empty);
});
test('network/schema failures preserve the last valid dataset', async () => {
  assert.deepEqual(await refreshSponsorship(empty, async () => { throw new Error('offline'); }), empty);
  assert.deepEqual(await refreshSponsorship(empty, async () => new Response('{"schemaVersion":2}')), empty);
});
test('unsafe advertiser URLs and non-PNG assets cannot enter the catalog', () => {
  const entry = { tier: 'partner', id: 'test', name: 'Test', description: 'Test', url: 'javascript:alert(1)', active: true, priority: 1, startsAt: '2026-10-12T00:00:00Z', endsAt: null, logoData: 'data:image/png;base64,aQ==' };
  assert.throws(() => validateSponsorshipFeed({ ...empty, supporters: [entry] }));
  entry.url = 'https://example.com/';
  assert.throws(() => validateSponsorshipFeed({ ...empty, supporters: [entry] }));
});
