# Repository automation

The scripts in this directory power the scheduled GitHub Actions workflows.
They require Node.js 24 or newer and intentionally use only built-in Node APIs,
so there are no runtime packages to install or audit.

## Product catalog

`update-catalog.mjs` uses a paginated GraphQL query to fetch up to 100
repositories per API call, then writes the shared `catalog.json` and refreshes
the generated sections in `profile/README.md`. The weekly traffic job runs this
reconciliation only on the first Sunday of each month. It can also be run
manually from the product catalog workflow.

```sh
GITHUB_TOKEN="$(gh auth token)" ORGANIZATION=Open-WP-Club \
  node scripts/update-catalog.mjs
```

`catalog.json` is the single source of truth for the organization profile,
website, `plugin-hub`, and every other consumer. There is no CSV feed anymore
— read `catalog.json` directly (raw URL:
`https://raw.githubusercontent.com/Open-WP-Club/.github/main/catalog.json`).

Classification is automatic. Repository topics such as `desktop-app`,
`mobile-app`, `electron-app`, `react-native`, `wordpress-plugin`,
`woocommerce-plugin`, and platform names are preferred; PHP and conventional
WordPress repository names provide a fallback. Exceptional repositories and
editorial app metadata live in `data/product-overrides.json`.

Featured apps and plugins are selected automatically from product type, stars,
forks, topics, and description completeness. Release data is not used, and the
profile intentionally contains no recent-release section or versions, so
publishing a release does not cause profile churn.

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
    version: ${{ github.event.release.tag_name }}
    release-url: ${{ github.event.release.html_url }}
```

The GitHub App should be installed only on `Open-WP-Club/.github` with
`Contents: write`. Store its client ID as the organization variable
`CATALOG_APP_CLIENT_ID` and its private key as the organization secret
`CATALOG_APP_PRIVATE_KEY`, scoped to the plugin repositories. The installation
token is short-lived and automatically revoked after the job. The catalog
action uses the existing release runner, updates the product's `catalog.json`
row, makes no catalog read API requests, and retries a rebased push if two
releases update concurrently.

## Traffic tracking

`track-repository-traffic.mjs` updates `stats.csv` and `traffic-state.json`.
GitHub only exposes repository traffic for the trailing
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
