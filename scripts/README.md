# Repository automation

The scripts in this directory power the scheduled GitHub Actions workflows.
They require Node.js 24 or newer and intentionally use only built-in Node APIs,
so there are no runtime packages to install or audit.

## Plugin catalog

`update-plugins-csv.mjs` uses a paginated GraphQL query to fetch up to 100
repositories and their latest releases per API call, then rewrites `plugins.csv`.
The weekly traffic job runs this reconciliation only on the first Sunday of each
month. It can also be run manually from the `Update plugins.csv` workflow.

```sh
GITHUB_TOKEN="$(gh auth token)" ORGANIZATION=Open-WP-Club \
  node scripts/update-plugins-csv.mjs
```

Published releases should normally update only their own catalog row from the
existing release job. Add the following step after a successful release build:

```yaml
- name: Create a catalog-only token
  id: catalog-token
  uses: actions/create-github-app-token@v3
  with:
    client-id: ${{ vars.CATALOG_APP_CLIENT_ID }}
    private-key: ${{ secrets.CATALOG_APP_PRIVATE_KEY }}
    owner: Open-WP-Club
    repositories: .github
    permission-contents: write

- name: Update plugin catalog
  uses: Open-WP-Club/.github/actions/update-plugin-catalog@main
  with:
    token: ${{ steps.catalog-token.outputs.token }}
    repo-name: ${{ github.event.repository.name }}
    description: ${{ github.event.repository.description }}
    version: ${{ github.event.release.tag_name }}
    repo-url: ${{ github.event.repository.html_url }}
```

The GitHub App should be installed only on `Open-WP-Club/.github` with
`Contents: write`. Store its client ID as the organization variable
`CATALOG_APP_CLIENT_ID` and its private key as the organization secret
`CATALOG_APP_PRIVATE_KEY`, scoped to the plugin repositories. The installation
token is short-lived and automatically revoked after the job. The catalog
action uses the existing release runner, makes no catalog read API requests,
and retries a rebased push if two releases update the catalog concurrently.

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
