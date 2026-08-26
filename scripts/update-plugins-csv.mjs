import { writeFile } from 'node:fs/promises';
import { createCsv } from './csv.mjs';
import {
  githubRequest,
  listOrganizationRepositories,
  mapWithConcurrency,
} from './github-api.mjs';

const token = process.env.GITHUB_TOKEN;
const organization = process.env.ORGANIZATION || process.env.GITHUB_REPOSITORY?.split('/')[0];
const blocklist = new Set(['.github', 'security-checker', 'www', 'wpfleet', 'mu-plugin']);

if (!organization) {
  throw new Error('ORGANIZATION or GITHUB_REPOSITORY is required');
}

const repositories = (await listOrganizationRepositories(organization, token))
  .filter((repository) => !repository.archived && !blocklist.has(repository.name));

const rows = await mapWithConcurrency(repositories, 8, async (repository) => {
  const release = await githubRequest(
    `/repos/${encodeURIComponent(organization)}/${encodeURIComponent(repository.name)}/releases/latest`,
    token,
    { allowNotFound: true },
  );

  return {
    repo_name: repository.name,
    display_name: repository.name
      .split('-')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
    description: repository.description || 'No description available',
    version: release?.tag_name?.replace(/^v/, '') || 'N/A',
    repo_url: repository.html_url,
  };
});

const headers = [
  { id: 'repo_name', title: 'repo-name' },
  { id: 'display_name', title: 'Display Name' },
  { id: 'description', title: 'Description', forceQuote: true },
  { id: 'version', title: 'Version' },
  { id: 'repo_url', title: 'Repo URL' },
];

await writeFile('plugins.csv', createCsv(headers, rows), 'utf8');
console.log(`Updated plugins.csv with ${rows.length} repositories`);
