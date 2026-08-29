import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildProductCatalog,
  classifyRepository,
  inferPlatforms,
  updateCatalogRelease,
} from '../scripts/product-catalog.mjs';

function repository(name, options = {}) {
  return {
    name,
    description: `${name} description`,
    url: `https://github.com/Open-WP-Club/${name}`,
    isArchived: false,
    isFork: false,
    isPrivate: false,
    stargazerCount: options.stars || 0,
    forkCount: options.forks || 0,
    primaryLanguage: { name: options.language || 'PHP' },
    repositoryTopics: {
      nodes: (options.topics || []).map((topicName) => ({ topic: { name: topicName } })),
    },
    latestRelease: options.version
      ? { tagName: options.version, url: `https://example.test/${options.version}` }
      : null,
  };
}

test('repository classification prefers overrides and recognized topics', () => {
  const app = repository('desktop-client', {
    language: 'TypeScript',
    topics: ['desktop-app', 'windows'],
  });
  assert.equal(classifyRepository(app), 'app');
  assert.deepEqual(inferPlatforms(app), ['windows']);
  assert.deepEqual(inferPlatforms(app, { platforms: ['windows', 'linux'] }), ['windows', 'linux']);
  assert.equal(classifyRepository(repository('plain-php-project')), 'plugin');
  assert.equal(classifyRepository(app, { type: 'website' }), 'website');
});

test('catalog selects apps and plugins automatically without using release data', () => {
  const catalog = buildProductCatalog([
    repository('desktop-client', { language: 'TypeScript', topics: ['desktop-app'], stars: 2 }),
    repository('popular-plugin', { stars: 5, version: 'v1.0.0' }),
    repository('small-plugin', { stars: 1, version: 'v9.0.0' }),
  ]);
  assert.deepEqual(
    catalog.products.filter(({ featured }) => featured).map(({ repo_name }) => repo_name),
    ['desktop-client', 'popular-plugin', 'small-plugin'],
  );
  assert.equal(catalog.products.find(({ repo_name }) => repo_name === 'popular-plugin').version, '1.0.0');
});

test('updateCatalogRelease changes only release fields for an existing product', () => {
  const content = `${JSON.stringify(buildProductCatalog([repository('my-plugin')]), null, 2)}\n`;
  const result = updateCatalogRelease(content, 'my-plugin', 'v2.0.0', 'https://example.test/v2');
  assert.equal(result.product.version, '2.0.0');
  assert.equal(result.product.release_url, 'https://example.test/v2');
  assert.equal(updateCatalogRelease(content, 'missing', '1.0.0').content, content);
});
