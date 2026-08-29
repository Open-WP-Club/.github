import assert from 'node:assert/strict';
import test from 'node:test';
import { renderProfileReadme } from '../scripts/profile-readme.mjs';

const template = `Apps
<!-- AUTO:APPS:START -->old<!-- AUTO:APPS:END -->
Count <!-- AUTO:PLUGIN_COUNT:START -->0<!-- AUTO:PLUGIN_COUNT:END -->
Plugins
<!-- AUTO:PLUGINS:START -->old<!-- AUTO:PLUGINS:END -->
Projects
<!-- AUTO:PROJECTS:START -->old<!-- AUTO:PROJECTS:END -->
`;

test('profile generator renders featured products without release information', () => {
  const result = renderProfileReadme(template, { products: [
    {
      repo_name: 'desktop-app', display_name: 'Desktop App', type: 'app', featured: true,
      platforms: ['windows', 'macos'], description: 'Desktop | manager', repo_url: 'https://example.test/app',
      version: '9.9.9',
    },
    {
      repo_name: 'plugin', display_name: 'Plugin', type: 'plugin', featured: true,
      platforms: [], description: 'Useful plugin', repo_url: 'https://example.test/plugin', version: '1.2.3',
    },
    {
      repo_name: 'infra', display_name: 'Infra', type: 'infrastructure', featured: false,
      platforms: [], description: 'Hosting', repo_url: 'https://example.test/infra', version: '3.0.0',
    },
  ] });

  assert.match(result, /Desktop App.*Windows · macOS.*Desktop \\| manager/);
  assert.match(result, /Count <!-- AUTO:PLUGIN_COUNT:START -->1<!-- AUTO:PLUGIN_COUNT:END -->/);
  assert.match(result, /Useful plugin/);
  assert.doesNotMatch(result, /9\.9\.9|1\.2\.3|3\.0\.0|recent/i);
});

test('profile generator requires all managed section markers', () => {
  assert.throws(() => renderProfileReadme('', { products: [] }), /missing or invalid/i);
});
