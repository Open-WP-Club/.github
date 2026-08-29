import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createCsv } from './csv.mjs';
import { githubGraphqlRequest } from './github-api.mjs';
import {
  orderPluginRows,
  pluginCatalogHeaders,
} from './plugin-catalog.mjs';
import { buildProductCatalog } from './product-catalog.mjs';
import { renderProfileReadme } from './profile-readme.mjs';

const token = process.env.GITHUB_TOKEN;
const organization = process.env.ORGANIZATION || process.env.GITHUB_REPOSITORY?.split('/')[0];
if (!token || !organization) {
  throw new Error('GITHUB_TOKEN and ORGANIZATION or GITHUB_REPOSITORY are required');
}

const query = `
  query PluginCatalog($organization: String!, $after: String) {
    organization(login: $organization) {
      repositories(first: 100, after: $after, orderBy: {field: NAME, direction: ASC}) {
        nodes {
          name
          description
          url
          isArchived
          isFork
          isPrivate
          stargazerCount
          forkCount
          primaryLanguage { name }
          repositoryTopics(first: 20) { nodes { topic { name } } }
          latestRelease { tagName url }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

const repositories = [];
let after = null;
do {
  const data = await githubGraphqlRequest(query, { organization, after }, token);
  const connection = data.organization?.repositories;
  if (!connection) {
    throw new Error(`Organization not found or inaccessible: ${organization}`);
  }
  repositories.push(...connection.nodes);
  after = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
  console.log(`Fetched ${connection.nodes.length} repositories with one GraphQL query`);
} while (after);

const overrides = JSON.parse(await readFile('data/product-overrides.json', 'utf8'));
const catalog = buildProductCatalog(repositories, overrides);
const rows = catalog.products
  .filter(({ type }) => ['app', 'plugin', 'website'].includes(type))
  .map((product) => ({
    repo_name: product.repo_name,
    display_name: product.display_name,
    description: product.description,
    version: product.version,
    repo_url: product.repo_url,
  }));

const existingCatalog = existsSync('plugins.csv') ? await readFile('plugins.csv', 'utf8') : '';
await writeFile(
  'plugins.csv',
  createCsv(pluginCatalogHeaders, orderPluginRows(rows, existingCatalog)),
  'utf8',
);
await writeFile('catalog.json', `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');

const profileReadme = await readFile('profile/README.md', 'utf8');
await writeFile('profile/README.md', renderProfileReadme(profileReadme, catalog), 'utf8');

const pluginCount = catalog.products.filter(({ type }) => type === 'plugin').length;
console.log(
  `Updated catalog with ${catalog.products.length} products, ${pluginCount} plugins, `
  + `and ${rows.length} compatibility rows`,
);
