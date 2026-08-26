const API_ROOT = 'https://api.github.com';

export class GitHubApiError extends Error {
  constructor(status, path, body) {
    super(`GitHub API ${status} for ${path}: ${body.slice(0, 500)}`);
    this.name = 'GitHubApiError';
    this.status = status;
    this.body = body;
  }
}

function apiHeaders(token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Open-WP-Club-automation',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function githubRequest(path, token, { allowNotFound = false } = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: apiHeaders(token),
    signal: AbortSignal.timeout(30_000),
  });

  if (allowNotFound && response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text();
    throw new GitHubApiError(response.status, path, body);
  }

  return response.json();
}

export async function listOrganizationRepositories(organization, token) {
  const repositories = [];

  for (let page = 1; ; page += 1) {
    const batch = await githubRequest(
      `/orgs/${encodeURIComponent(organization)}/repos?type=all&per_page=100&page=${page}`,
      token,
    );
    repositories.push(...batch);
    console.log(`Fetched repository page ${page} (${batch.length} items)`);

    if (batch.length < 100) {
      return repositories;
    }
  }
}

export async function mapWithConcurrency(items, concurrency, callback) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await callback(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}
