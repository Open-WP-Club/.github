import assert from 'node:assert/strict';
import test from 'node:test';
import {
  displayNameFromRepository,
  normalizeVersion,
  pluginRowsFromCsv,
  updatePluginCatalog,
} from '../scripts/plugin-catalog.mjs';

const catalog = `repo-name,Display Name,Description,Version,Repo URL
z-plugin,Z Plugin,"Old description",1.0.0,https://github.com/Open-WP-Club/z-plugin
`;

test('catalog helpers normalize display names and versions', () => {
  assert.equal(displayNameFromRepository('my-plugin'), 'My Plugin');
  assert.equal(normalizeVersion('v2.1.0'), '2.1.0');
  assert.equal(normalizeVersion(''), 'N/A');
});

test('updatePluginCatalog replaces one row and preserves valid CSV quoting', () => {
  const updated = updatePluginCatalog(catalog, {
    repo_name: 'z-plugin',
    description: 'New, "better" description',
    version: 'v2.0.0',
    repo_url: 'https://github.com/Open-WP-Club/z-plugin',
  });
  assert.deepEqual(pluginRowsFromCsv(updated), [{
    repo_name: 'z-plugin',
    display_name: 'Z Plugin',
    description: 'New, "better" description',
    version: '2.0.0',
    repo_url: 'https://github.com/Open-WP-Club/z-plugin',
  }]);
});

test('updatePluginCatalog preserves existing order and appends a new row', () => {
  const updated = updatePluginCatalog(catalog, {
    repo_name: 'a-plugin',
    description: 'First',
    version: '1.0.0',
    repo_url: 'https://github.com/Open-WP-Club/a-plugin',
  });
  assert.deepEqual(
    pluginRowsFromCsv(updated).map(({ repo_name }) => repo_name),
    ['z-plugin', 'a-plugin'],
  );
});

test('updatePluginCatalog ignores blocked repositories', () => {
  assert.equal(updatePluginCatalog(catalog, {
    repo_name: '.github',
    version: '1.0.0',
  }), catalog);
});
