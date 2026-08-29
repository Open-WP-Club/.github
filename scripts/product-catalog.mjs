import { displayNameFromRepository } from './plugin-catalog.mjs';

const APP_TOPICS = new Set(['app', 'desktop-app', 'electron-app', 'mobile-app', 'react-native']);
const PLUGIN_TOPICS = new Set(['woocommerce-plugin', 'wordpress-plugin', 'wp-plugin']);
const PLATFORM_TOPICS = new Map([
  ['android', 'android'],
  ['ios', 'ios'],
  ['linux', 'linux'],
  ['macos', 'macos'],
  ['windows', 'windows'],
]);

function repositoryTopics(repository) {
  return repository.repositoryTopics?.nodes
    ?.map(({ topic }) => topic.name.toLowerCase())
    .sort() || [];
}

function hasAny(values, candidates) {
  return values.some((value) => candidates.has(value));
}

export function classifyRepository(repository, override = {}) {
  if (override.type) return override.type;

  const topics = repositoryTopics(repository);
  if (hasAny(topics, APP_TOPICS)) return 'app';
  if (hasAny(topics, PLUGIN_TOPICS)) return 'plugin';
  if (topics.includes('infrastructure') || topics.includes('wordpress-hosting')) {
    return 'infrastructure';
  }
  if (repository.primaryLanguage?.name === 'PHP'
    || /(?:wordpress|woocommerce|(?:^|-)wp)(?:-|$)/i.test(repository.name)) {
    return 'plugin';
  }
  return 'tool';
}

export function inferPlatforms(repository, override = {}) {
  if (override.platforms?.length) return [...override.platforms];
  return repositoryTopics(repository)
    .map((topic) => PLATFORM_TOPICS.get(topic))
    .filter(Boolean);
}

function featuredScore(product) {
  return (product.stars * 100)
    + (product.forks * 25)
    + Math.min(product.topics.length, 5)
    + (product.description !== 'No description available' ? 1 : 0);
}

function compareFeatured(left, right) {
  return featuredScore(right) - featuredScore(left)
    || left.repo_name.localeCompare(right.repo_name, 'en', { sensitivity: 'base' });
}

export function buildProductCatalog(repositories, overrides = {}) {
  const products = repositories
    .filter((repository) => !repository.isArchived && !repository.isPrivate && !repository.isFork)
    .map((repository) => {
      const override = overrides[repository.name] || {};
      return {
        repo_name: repository.name,
        display_name: override.display_name || displayNameFromRepository(repository.name),
        type: classifyRepository(repository, override),
        description: override.description || repository.description || 'No description available',
        repo_url: repository.url,
        version: repository.latestRelease?.tagName?.replace(/^v/i, '') || 'N/A',
        release_url: repository.latestRelease?.url || '',
        platforms: inferPlatforms(repository, override),
        language: repository.primaryLanguage?.name || null,
        topics: repositoryTopics(repository),
        stars: repository.stargazerCount || 0,
        forks: repository.forkCount || 0,
        featured: false,
        ...(override.icon ? { icon: override.icon } : {}),
        ...(override.features ? { features: override.features } : {}),
        ...(override.requirements ? { requirements: override.requirements } : {}),
      };
    })
    .sort((left, right) => left.repo_name.localeCompare(right.repo_name, 'en', {
      sensitivity: 'base',
    }));

  const featuredApps = products.filter(({ type }) => type === 'app').sort(compareFeatured).slice(0, 4);
  const featuredPlugins = products
    .filter(({ type }) => type === 'plugin')
    .sort(compareFeatured)
    .slice(0, 6);
  for (const product of [...featuredApps, ...featuredPlugins]) product.featured = true;

  return { schema_version: 1, organization: 'Open-WP-Club', products };
}

export function updateCatalogRelease(content, repositoryName, tagName, releaseUrl = '') {
  const catalog = JSON.parse(content);
  const product = catalog.products.find(({ repo_name }) => repo_name === repositoryName);
  if (!product) return { content, product: null };

  product.version = tagName?.replace(/^v/i, '') || 'N/A';
  if (releaseUrl) product.release_url = releaseUrl;
  return { content: `${JSON.stringify(catalog, null, 2)}\n`, product };
}
