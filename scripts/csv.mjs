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

export function parseCsv(content) {
  const records = [];
  let record = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (quoted) {
      if (character === '"' && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field === '') {
      quoted = true;
    } else if (character === ',') {
      record.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && content[index + 1] === '\n') {
        index += 1;
      }
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new Error('Invalid CSV: unterminated quoted field');
  }
  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  return records;
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
