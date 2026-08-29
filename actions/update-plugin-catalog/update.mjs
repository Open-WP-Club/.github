import { readFile, writeFile } from 'node:fs/promises';
import { updatePluginCatalog } from '../../scripts/plugin-catalog.mjs';
import { updateCatalogRelease } from '../../scripts/product-catalog.mjs';

const catalogPath = process.env.CATALOG_PATH;
const productCatalogPath = process.env.PRODUCT_CATALOG_PATH;
if (!catalogPath || !productCatalogPath) {
  throw new Error('CATALOG_PATH and PRODUCT_CATALOG_PATH are required');
}

const currentProductCatalog = await readFile(productCatalogPath, 'utf8');
const releaseUpdate = updateCatalogRelease(
  currentProductCatalog,
  process.env.PRODUCT_REPO_NAME,
  process.env.PRODUCT_VERSION,
  process.env.PRODUCT_RELEASE_URL,
);
if (!releaseUpdate.product) {
  console.warn(
    `Product is not catalogued yet; run the full reconciliation: ${process.env.PRODUCT_REPO_NAME}`,
  );
  process.exit(0);
}

if (releaseUpdate.content !== currentProductCatalog) {
  await writeFile(productCatalogPath, releaseUpdate.content, 'utf8');
}

if (['app', 'plugin', 'website'].includes(releaseUpdate.product.type)) {
  const currentPlugins = await readFile(catalogPath, 'utf8');
  const nextPlugins = updatePluginCatalog(currentPlugins, {
    repo_name: process.env.PRODUCT_REPO_NAME,
    display_name: releaseUpdate.product.display_name,
    description: releaseUpdate.product.description,
    version: process.env.PRODUCT_VERSION,
    repo_url: releaseUpdate.product.repo_url,
  });
  if (nextPlugins !== currentPlugins) {
    await writeFile(catalogPath, nextPlugins, 'utf8');
  }
}

console.log(`Updated ${releaseUpdate.product.type} catalog entry for ${process.env.PRODUCT_REPO_NAME}`);
