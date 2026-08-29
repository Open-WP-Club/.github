function escapeMarkdown(value) {
  return String(value).replaceAll('|', '\\|').replaceAll(/\s+/g, ' ').trim();
}

function platformLabels(platforms) {
  const labels = { android: 'Android', ios: 'iOS', linux: 'Linux', macos: 'macOS', windows: 'Windows' };
  return platforms.map((platform) => labels[platform] || platform).join(' · ') || 'Cross-platform';
}

function productLink(product) {
  return `[${escapeMarkdown(product.display_name)}](${product.repo_url})`;
}

function typeLabel(type) {
  return { infrastructure: 'Infrastructure', tool: 'Tool' }[type] || type;
}

function replaceSection(readme, name, content, { inline = false } = {}) {
  const start = `<!-- AUTO:${name}:START -->`;
  const end = `<!-- AUTO:${name}:END -->`;
  const startIndex = readme.indexOf(start);
  const endIndex = readme.indexOf(end);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`Missing or invalid generated README section: ${name}`);
  }
  const separator = inline ? '' : '\n';
  return `${readme.slice(0, startIndex + start.length)}${separator}${content.trim()}${separator}${readme.slice(endIndex)}`;
}

export function renderProfileReadme(readme, catalog) {
  const plugins = catalog.products.filter(({ type }) => type === 'plugin');
  const apps = catalog.products.filter(({ type, featured }) => type === 'app' && featured);
  const featuredPlugins = plugins.filter(({ featured }) => featured);
  const otherProjects = catalog.products.filter(({ type }) => ['infrastructure', 'tool'].includes(type));

  const appRows = apps.length
    ? apps.map((product) => `| ${productLink(product)} | ${platformLabels(product.platforms)} | ${escapeMarkdown(product.description)} |`).join('\n')
    : '| — | — | More applications are coming. |';
  const pluginRows = featuredPlugins
    .map((product) => `| ${productLink(product)} | ${escapeMarkdown(product.description)} |`).join('\n');
  const projectRows = otherProjects
    .map((product) => `| ${productLink(product)} | ${typeLabel(product.type)} | ${escapeMarkdown(product.description)} |`).join('\n');

  const appTable = `| Product | Platforms | What it does |\n|---|---|---|\n${appRows}`;
  const pluginTable = `| Plugin | What it does |\n|---|---|\n${pluginRows}`;
  const projectTable = `| Project | Type | What it does |\n|---|---|---|\n${projectRows}`;

  let result = replaceSection(readme, 'APPS', appTable);
  result = replaceSection(result, 'PLUGIN_COUNT', String(plugins.length), { inline: true });
  result = replaceSection(result, 'PLUGINS', pluginTable);
  return replaceSection(result, 'PROJECTS', projectTable);
}
