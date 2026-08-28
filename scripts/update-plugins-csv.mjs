import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createCsv } from './csv.mjs';
import { githubGraphqlRequest } from './github-api.mjs';
import {
  displayNameFromRepository,
  normalizeVersion,
  orderPluginRows,
  pluginCatalogHeaders,
  pluginRepositoryBlocklist,
} from './plugin-catalog.mjs';

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
          latestRelease { tagName }
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

const rows = repositories
  .filter((repository) => !repository.isArchived && !pluginRepositoryBlocklist.has(repository.name))
  .map((repository) => ({
    repo_name: repository.name,
    display_name: displayNameFromRepository(repository.name),
    description: repository.description || 'No description available',
    version: normalizeVersion(repository.latestRelease?.tagName),
    repo_url: repository.url,
  }));

const existingCatalog = existsSync('plugins.csv') ? await readFile('plugins.csv', 'utf8') : '';
await writeFile(
  'plugins.csv',
  createCsv(pluginCatalogHeaders, orderPluginRows(rows, existingCatalog)),
  'utf8',
);
console.log(`Updated plugins.csv with ${rows.length} repositories`);
