# Contributing to Open WP Club

Thanks for your interest in contributing! Whether it's a bug report, feature idea, or a pull request — every contribution helps.

## Reporting Bugs

1. Check existing issues to avoid duplicates
2. Open a new issue using the **Bug Report** template
3. Include:
   - WordPress version
   - PHP version
   - Plugin version
   - Steps to reproduce
   - Expected vs actual behavior
   - Any error messages or screenshots

## Suggesting Features

Open an issue using the **Feature Request** template. Describe the problem you're trying to solve, not just the solution you have in mind.

## Pull Requests

### Before you start

- Open an issue first to discuss the change (for non-trivial changes)
- Fork the repository and create a branch from `main`/`master`
- One pull request per feature or fix

### Coding standards

We follow the [WordPress Coding Standards](https://developer.wordpress.org/coding-standards/):

- **PHP**: Follow [WordPress PHP Coding Standards](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/php/)
- **JavaScript**: Follow [WordPress JavaScript Coding Standards](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/javascript/)
- **CSS**: Follow [WordPress CSS Coding Standards](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/css/)
- Use tabs for indentation (not spaces)
- Prefix functions and classes with the plugin slug to avoid conflicts
- Sanitize all input, escape all output
- Use nonces for form submissions
- Follow WordPress naming conventions (snake_case for functions, etc.)

### Submitting your PR

1. Make sure your code works with the latest WordPress version
2. Test with PHP 8.2 + (minimum supported version)
3. Include a clear description of what the PR does and why
4. Reference the related issue if there is one
5. Keep commits focused and write descriptive commit messages

### What we look for in reviews

- Does it follow WordPress coding standards?
- Is user input sanitized and output escaped?
- Are there any security concerns?
- Does it handle edge cases?
- Does it work within our supported version range (no legacy bloat)?
- Is the code readable and maintainable?

## Our Stance on Version Support

We intentionally **do not** support legacy environments. Here's what that means:

- **PHP**: We support the latest 4 versions only (currently 8.1+). Older versions are dropped as new ones release.
- **WordPress**: We support the current major version and 2-3 previous major releases. Anything older is unsupported.
- **We avoid backwards-compatibility bloat.** No polyfills, shims, or workarounds for environments that should have been updated years ago. We'd rather write clean, modern code than carry dead weight.

We understand this won't work for everyone, and we're sorry if it's inconvenient — but we're firm on this. Keeping WordPress sites updated is not optional. It's a security practice. If you're running a site, updating PHP and WordPress should be a weekly or monthly activity, not something you put off for years.

PRs that add backwards-compatibility for unsupported versions will be declined.

## Development Setup

1. Set up a local WordPress environment (Local, wp-env, or similar)
2. Clone the plugin into `wp-content/plugins/`
3. Activate the plugin from the WordPress admin

## Translations

We welcome translations! If you'd like to translate a plugin:

1. Use the `.pot` file in the plugin's `languages/` directory (if available)
2. Create the `.po` and `.mo` files for your language
3. Submit via pull request

## Questions?

Open a discussion in the relevant repository or reach out at [openwpclub.com](https://openwpclub.com).
