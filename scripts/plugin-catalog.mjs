import { createCsv, parseCsv } from './csv.mjs';

export const pluginCatalogHeaders = [
  { id: 'repo_name', title: 'repo-name' },
  { id: 'display_name', title: 'Display Name' },
  { id: 'description', title: 'Description', forceQuote: true },
  { id: 'version', title: 'Version' },
  { id: 'repo_url', title: 'Repo URL' },
];

export const pluginRepositoryBlocklist = new Set([
  '.github',
  'security-checker',
  'www',
  'wpfleet',
  'mu-plugin',
]);

export function displayNameFromRepository(repositoryName) {
  return repositoryName
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function normalizeVersion(tagName) {
  return tagName?.replace(/^v/, '') || 'N/A';
}

export function sortPluginRows(rows) {
  return rows.sort((left, right) => left.repo_name.localeCompare(right.repo_name, 'en', {
    sensitivity: 'base',
  }));
}

export function orderPluginRows(rows, existingContent = '') {
  if (!existingContent) {
    return sortPluginRows(rows);
  }

  const existingOrder = new Map(
    pluginRowsFromCsv(existingContent).map(({ repo_name }, index) => [repo_name, index]),
  );
  return rows.sort((left, right) => {
    const leftIndex = existingOrder.get(left.repo_name);
    const rightIndex = existingOrder.get(right.repo_name);
    if (leftIndex != null && rightIndex != null) {
      return leftIndex - rightIndex;
    }
    if (leftIndex != null) {
      return -1;
    }
    if (rightIndex != null) {
      return 1;
    }
    return left.repo_name.localeCompare(right.repo_name, 'en', { sensitivity: 'base' });
  });
}

export function pluginRowsFromCsv(content) {
  const [header = [], ...records] = parseCsv(content);
  const expectedHeader = pluginCatalogHeaders.map(({ title }) => title);
  if (header.length !== expectedHeader.length
    || header.some((value, index) => value !== expectedHeader[index])) {
    throw new Error(`Unexpected plugins.csv header: ${header.join(',')}`);
  }

  return records
    .filter((record) => record.some((value) => value !== ''))
    .map((record) => Object.fromEntries(
      pluginCatalogHeaders.map(({ id }, index) => [id, record[index] ?? '']),
    ));
}

export function updatePluginCatalog(content, plugin) {
  if (!plugin.repo_name) {
    throw new Error('repo_name is required');
  }
  if (pluginRepositoryBlocklist.has(plugin.repo_name)) {
    return content;
  }

  const rows = pluginRowsFromCsv(content);
  const nextRow = {
    repo_name: plugin.repo_name,
    display_name: plugin.display_name || displayNameFromRepository(plugin.repo_name),
    description: plugin.description || 'No description available',
    version: normalizeVersion(plugin.version),
    repo_url: plugin.repo_url || `https://github.com/Open-WP-Club/${plugin.repo_name}`,
  };
  const existingIndex = rows.findIndex(({ repo_name }) => repo_name === plugin.repo_name);

  if (existingIndex === -1) {
    rows.push(nextRow);
  } else {
    rows[existingIndex] = nextRow;
  }

  return createCsv(pluginCatalogHeaders, rows);
}
