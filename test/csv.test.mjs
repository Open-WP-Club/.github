import assert from 'node:assert/strict';
import test from 'node:test';
import { appendCsvRecords, createCsv, escapeCsv, parseCsv } from '../scripts/csv.mjs';

const headers = [
  { id: 'name', title: 'Name' },
  { id: 'description', title: 'Description' },
];

test('escapeCsv quotes commas, quotes, and newlines', () => {
  assert.equal(escapeCsv('plain'), 'plain');
  assert.equal(escapeCsv('plain', true), '"plain"');
  assert.equal(escapeCsv('one, two'), '"one, two"');
  assert.equal(escapeCsv('say "hello"'), '"say ""hello"""');
  assert.equal(escapeCsv('two\nlines'), '"two\nlines"');
});

test('createCsv writes a header and a trailing newline', () => {
  assert.equal(
    createCsv(headers, [{ name: 'Plugin', description: 'Fast, small' }]),
    'Name,Description\nPlugin,"Fast, small"\n',
  );
});

test('appendCsvRecords preserves the existing header', () => {
  assert.equal(
    appendCsvRecords('Name,Description\nOld,Entry\n', headers, [
      { name: 'New', description: 'Entry' },
    ]),
    'Name,Description\nOld,Entry\nNew,Entry\n',
  );
});

test('parseCsv handles quoted commas, quotes, and newlines', () => {
  assert.deepEqual(
    parseCsv('Name,Description\r\nPlugin,"One, ""quoted""\nline"\r\n'),
    [['Name', 'Description'], ['Plugin', 'One, "quoted"\nline']],
  );
});

test('parseCsv rejects an unfinished quoted field', () => {
  assert.throws(() => parseCsv('Name\n"unfinished'), /unterminated/);
});
