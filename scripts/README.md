# Repository automation

The scripts in this directory power the scheduled GitHub Actions workflows.
They require Node.js 24 or newer and intentionally use only built-in Node APIs,
so there are no runtime packages to install or audit.

## Plugin catalog

`update-plugins-csv.mjs` lists the organization's active repositories, skips the
configured non-plugin repositories, fetches each latest release, and rewrites
`plugins.csv`. GitHub Actions supplies `GITHUB_TOKEN`; public data can also be
refreshed locally without a token, subject to GitHub's lower anonymous rate
limit:

```sh
ORGANIZATION=Open-WP-Club node scripts/update-plugins-csv.mjs
```

## Traffic tracking

`track-repository-traffic.mjs` updates `downloads.csv`, `stats.csv`, and
`traffic-state.json`. GitHub only exposes repository traffic for the trailing
14 days, so the state file records the last counted clone and view dates to
avoid double-counting overlapping weekly windows.

The default workflow token can list public repositories but normally cannot
read organization-wide traffic. Add a `WORKFLOW_TOKEN` repository secret with
access to the organization's repositories to enable clone, view, and referrer
metrics. The workflow falls back to `github.token` when the secret is absent.

Run the local checks with:

```sh
npm run check
```
