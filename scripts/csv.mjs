export function escapeCsv(value, forceQuote = false) {
  const stringValue = value == null ? '' : String(value);
  return forceQuote || /[",\r\n]/.test(stringValue)
    ? `"${stringValue.replaceAll('"', '""')}"`
    : stringValue;
}

export function createCsv(headers, rows) {
  return [
    headers.map(({ title }) => escapeCsv(title)).join(','),
    ...rows.map((row) =>
      headers.map(({ id, forceQuote }) => escapeCsv(row[id], forceQuote)).join(','),
    ),
  ].join('\n') + '\n';
}

export function appendCsvRecords(existingContent, headers, rows) {
  const records = rows
    .map((row) =>
      headers.map(({ id, forceQuote }) => escapeCsv(row[id], forceQuote)).join(','),
    )
    .join('\n');

  if (!existingContent) {
    return createCsv(headers, rows);
  }
  if (!records) {
    return existingContent;
  }
  return `${existingContent.trimEnd()}\n${records}\n`;
}
