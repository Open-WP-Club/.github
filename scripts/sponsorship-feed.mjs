export const SPONSORSHIP_FEED_URL = 'https://openwpclub.com/sponsorship.json';

export function validateSponsorshipFeed(data) {
  if (!data || data.schemaVersion !== 1 || data.maxPositions !== 3) throw new Error('Unsupported sponsorship feed');
  const result = { schemaVersion: 1, maxPositions: 3, supporters: [], campaigns: [] };
  const ids = new Set();
  for (const group of ['supporters', 'campaigns']) {
    if (!Array.isArray(data[group]) || data[group].length > 100) throw new Error('Invalid sponsorship list');
    for (const entry of data[group]) {
      if (!entry || !/^[a-z0-9-]+$/.test(entry.id) || ids.has(entry.id)) throw new Error('Invalid sponsorship identity');
      ids.add(entry.id);
      if (typeof entry.name !== 'string' || !entry.name.trim() || entry.name.length > 240 || /[<>\r\n]/.test(entry.name)) throw new Error('Invalid sponsor name');
      if (typeof entry.description !== 'string' || entry.description.length > 240 || /[<>\r\n]/.test(entry.description)) throw new Error('Invalid sponsor description');
      if (!['supporter', 'partner', 'champion'].includes(entry.tier)) throw new Error('Invalid sponsor tier');
      const url = new URL(entry.url);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid sponsor URL');
      if (typeof entry.active !== 'boolean' || !Number.isFinite(entry.priority)) throw new Error('Invalid sponsor status');
      for (const date of [entry.startsAt, entry.endsAt]) {
        if (date !== null && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().replace('.000', '') !== date)) throw new Error('Invalid sponsor period');
      }
      if (!entry.startsAt || (entry.endsAt && Date.parse(entry.endsAt) <= Date.parse(entry.startsAt))) throw new Error('Invalid sponsor period');
      if (typeof entry.logoData !== 'string' || entry.logoData.length > 65536 || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(entry.logoData)) throw new Error('Invalid embedded logo');
      const png = Buffer.from(entry.logoData.slice(22), 'base64');
      if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Not a PNG logo');
      result[group].push({ tier: entry.tier, id: entry.id, name: entry.name, url: url.href, description: entry.description, logoData: entry.logoData, active: entry.active, priority: entry.priority, startsAt: entry.startsAt, endsAt: entry.endsAt });
    }
  }
  return result;
}

/** An unavailable sponsor feed must never stop plugin catalog maintenance. */
export async function refreshSponsorship(previous, request = fetch) {
  try {
    const response = await request(SPONSORSHIP_FEED_URL, { signal: AbortSignal.timeout(10000), redirect: 'error' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (Buffer.byteLength(text) > 262144) throw new Error('Sponsorship feed too large');
    return validateSponsorshipFeed(JSON.parse(text));
  } catch (error) {
    console.warn(`Sponsorship refresh failed; preserving last validated data: ${error.message}`);
    try { return validateSponsorshipFeed(previous); } catch { return { schemaVersion: 1, maxPositions: 3, supporters: [], campaigns: [] }; }
  }
}
