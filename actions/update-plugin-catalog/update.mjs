import { readFile, writeFile } from 'node:fs/promises';
import { updateCatalogRelease } from '../../scripts/product-catalog.mjs';

const productCatalogPath = process.env.PRODUCT_CATALOG_PATH;
if (!productCatalogPath) {
  throw new Error('PRODUCT_CATALOG_PATH is required');
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

console.log(`Updated ${releaseUpdate.product.type} catalog entry for ${process.env.PRODUCT_REPO_NAME}`);
