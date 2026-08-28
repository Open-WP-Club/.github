import { readFile, writeFile } from 'node:fs/promises';
import { updatePluginCatalog } from '../../scripts/plugin-catalog.mjs';

const catalogPath = process.env.CATALOG_PATH;
if (!catalogPath) {
  throw new Error('CATALOG_PATH is required');
}

const currentCatalog = await readFile(catalogPath, 'utf8');
const nextCatalog = updatePluginCatalog(currentCatalog, {
  repo_name: process.env.PLUGIN_REPO_NAME,
  description: process.env.PLUGIN_DESCRIPTION,
  version: process.env.PLUGIN_VERSION,
  repo_url: process.env.PLUGIN_REPO_URL,
});

if (nextCatalog === currentCatalog) {
  console.log(`No catalog change for ${process.env.PLUGIN_REPO_NAME}`);
} else {
  await writeFile(catalogPath, nextCatalog, 'utf8');
  console.log(`Updated catalog row for ${process.env.PLUGIN_REPO_NAME}`);
}
