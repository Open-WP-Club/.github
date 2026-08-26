import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { appendCsvRecords } from './csv.mjs';
import {
  GitHubApiError,
  githubRequest,
  listOrganizationRepositories,
  mapWithConcurrency,
} from './github-api.mjs';

const DOWNLOADS_FILE = 'downloads.csv';
const STATS_FILE = 'stats.csv';
const STATE_FILE = 'traffic-state.json';
const token = process.env.GITHUB_TOKEN;
const organization = process.env.GITHUB_REPOSITORY?.split('/')[0];

if (!token || !organization) {
  throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required');
}

const downloadsHeaders = [
  { id: 'week_id', title: 'Week ID' },
  { id: 'week_start', title: 'Week Start' },
  { id: 'week_end', title: 'Week End' },
  { id: 'recorded_date', title: 'Recorded Date' },
  { id: 'repo_name', title: 'Repository Name' },
  { id: 'repo_full_name', title: 'Repository Full Name' },
  { id: 'entry_type', title: 'Entry Type' },
  { id: 'clone_count', title: 'Clones (14d)' },
  { id: 'unique_clones', title: 'Unique Clones' },
  { id: 'view_count', title: 'Views (14d)' },
  { id: 'unique_views', title: 'Unique Views' },
  { id: 'top_referrer', title: 'Top Referrer' },
  { id: 'top_referrer_count', title: 'Top Referrer Count' },
  { id: 'repo_stars', title: 'Repository Stars' },
  { id: 'repo_forks', title: 'Repository Forks' },
  { id: 'repo_watchers', title: 'Repository Watchers' },
  { id: 'repo_language', title: 'Primary Language' },
  { id: 'repo_private', title: 'Is Private' },
  { id: 'repo_size', title: 'Repository Size (KB)' },
  { id: 'repo_open_issues', title: 'Open Issues' },
  { id: 'repo_created_at', title: 'Repository Created' },
  { id: 'repo_updated_at', title: 'Repository Updated' },
  { id: 'repo_pushed_at', title: 'Last Push' },
  { id: 'specific_date', title: 'Specific Date' },
  { id: 'daily_clones', title: 'Daily Clones' },
  { id: 'daily_views', title: 'Daily Views' },
];

const statsHeaders = [
  { id: 'total_clones', title: 'Clones (14d)' },
  { id: 'total_views', title: 'Views (14d)' },
  { id: 'total_stars', title: 'Total Stars' },
  { id: 'total_clones_alltime', title: 'Total Clones (All-Time)' },
  { id: 'total_views_alltime', title: 'Total Views (All-Time)' },
];

function getIsoWeekId(date) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((day - yearStart) / 86_400_000) + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

function getCurrentWeekRange(now = new Date()) {
  const start = new Date(now);
  start.setUTCDate(now.getUTCDate() - now.getUTCDay());
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);

  return { start, end, weekId: getIsoWeekId(start) };
}

async function readTextIfPresent(path) {
  return existsSync(path) ? readFile(path, 'utf8') : '';
}

async function getOptionalTraffic(repository, endpoint, fallback) {
  try {
    return await githubRequest(
      `/repos/${encodeURIComponent(repository.owner.login)}/${encodeURIComponent(repository.name)}/traffic/${endpoint}`,
      token,
    );
  } catch (error) {
    const isUnavailable = error instanceof GitHubApiError
      && [403, 404].includes(error.status)
      && !/rate limit/i.test(error.body);
    if (!isUnavailable) {
      throw error;
    }
    console.warn(`No ${endpoint} data for ${repository.full_name}: ${error.message}`);
    return fallback;
  }
}

async function getRepositoryData(repository) {
  const [clones, views, referrers] = await Promise.all([
    getOptionalTraffic(repository, 'clones?per=day', { count: 0, uniques: 0, clones: [] }),
    getOptionalTraffic(repository, 'views?per=day', { count: 0, uniques: 0, views: [] }),
    getOptionalTraffic(repository, 'popular/referrers', []),
  ]);

  return { repository, clones, views, referrers };
}

function addDailyCounts(target, entries = []) {
  for (const entry of entries) {
    const date = entry.timestamp.slice(0, 10);
    target[date] = (target[date] || 0) + entry.count;
  }
}

function addNewDailyTotals(state, dailyTotals, stateKey) {
  let lastDate = state[stateKey] || state.lastRecordedDate || null;
  let added = 0;

  for (const date of Object.keys(dailyTotals).sort()) {
    if (!lastDate || date > lastDate) {
      added += dailyTotals[date];
      lastDate = date;
    }
  }

  state[stateKey] = lastDate;
  return added;
}

const week = getCurrentWeekRange();
const recordedDate = new Date().toISOString();
const existingDownloads = await readTextIfPresent(DOWNLOADS_FILE);
const weekExists = existingDownloads
  .split(/\r?\n/)
  .some((line) => line.startsWith(`${week.weekId},`));

console.log(`Tracking ${organization} for ${week.weekId}`);
if (weekExists) {
  console.log(`${DOWNLOADS_FILE} already contains ${week.weekId}; detailed rows will not be duplicated`);
}

const repositories = await listOrganizationRepositories(organization, token);
const trafficResults = await mapWithConcurrency(repositories, 6, getRepositoryData);
const dailyClones = {};
const dailyViews = {};
let totalClones = 0;
let totalViews = 0;
let totalStars = 0;
let totalForks = 0;
let totalWatchers = 0;
let repositoriesWithTraffic = 0;

const downloadRows = trafficResults.map(({ repository, clones, views, referrers }) => {
  addDailyCounts(dailyClones, clones.clones);
  addDailyCounts(dailyViews, views.views);

  const cloneCount = clones.count || 0;
  const viewCount = views.count || 0;
  totalClones += cloneCount;
  totalViews += viewCount;
  totalStars += repository.stargazers_count;
  totalForks += repository.forks_count;
  totalWatchers += repository.watchers_count;
  repositoriesWithTraffic += Number(cloneCount > 0 || viewCount > 0);

  return {
    week_id: week.weekId,
    week_start: week.start.toISOString(),
    week_end: week.end.toISOString(),
    recorded_date: recordedDate,
    repo_name: repository.name,
    repo_full_name: repository.full_name,
    entry_type: 'REPO_SUMMARY',
    clone_count: cloneCount,
    unique_clones: clones.uniques || 0,
    view_count: viewCount,
    unique_views: views.uniques || 0,
    top_referrer: referrers[0]?.referrer || '',
    top_referrer_count: referrers[0]?.count || 0,
    repo_stars: repository.stargazers_count,
    repo_forks: repository.forks_count,
    repo_watchers: repository.watchers_count,
    repo_language: repository.language || 'None',
    repo_private: repository.private,
    repo_size: repository.size,
    repo_open_issues: repository.open_issues_count,
    repo_created_at: repository.created_at,
    repo_updated_at: repository.updated_at,
    repo_pushed_at: repository.pushed_at,
    specific_date: '',
    daily_clones: '',
    daily_views: '',
  };
});

if (!weekExists) {
  await writeFile(
    DOWNLOADS_FILE,
    appendCsvRecords(existingDownloads, downloadsHeaders, downloadRows),
    'utf8',
  );
}

const state = existsSync(STATE_FILE)
  ? JSON.parse(await readFile(STATE_FILE, 'utf8'))
  : { cumulativeClones: 0, cumulativeViews: 0 };

state.cumulativeClones = (state.cumulativeClones || 0)
  + addNewDailyTotals(state, dailyClones, 'lastRecordedCloneDate');
state.cumulativeViews = (state.cumulativeViews || 0)
  + addNewDailyTotals(state, dailyViews, 'lastRecordedViewDate');
state.lastRecordedDate = [state.lastRecordedCloneDate, state.lastRecordedViewDate]
  .filter(Boolean)
  .sort()
  .at(-1) || state.lastRecordedDate || null;
state.totalStars = totalStars;
state.totalForks = totalForks;
state.totalWatchers = totalWatchers;
state.totalRepos = repositories.length;
state.updatedAt = recordedDate;

await writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

const existingStats = await readTextIfPresent(STATS_FILE);
await writeFile(
  STATS_FILE,
  appendCsvRecords(existingStats, statsHeaders, [{
    total_clones: totalClones,
    total_views: totalViews,
    total_stars: totalStars,
    total_clones_alltime: state.cumulativeClones,
    total_views_alltime: state.cumulativeViews,
  }]),
  'utf8',
);

const outputs = {
  week_id: week.weekId,
  total_clones: totalClones,
  total_views: totalViews,
  total_clones_alltime: state.cumulativeClones,
  total_views_alltime: state.cumulativeViews,
  total_stars: totalStars,
  total_forks: totalForks,
  repos_with_traffic: repositoriesWithTraffic,
  total_repos: repositories.length,
  skipped: weekExists,
};

if (process.env.GITHUB_OUTPUT) {
  await appendFile(
    process.env.GITHUB_OUTPUT,
    Object.entries(outputs).map(([key, value]) => `${key}=${value}\n`).join(''),
    'utf8',
  );
}

console.log(
  `Processed ${repositories.length} repositories: ${totalStars} stars, ${totalForks} forks, `
  + `${totalClones} clones and ${totalViews} views in the trailing 14 days`,
);
console.log(`All-time observed traffic: ${state.cumulativeClones} clones, ${state.cumulativeViews} views`);
