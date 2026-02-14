# Security Policy

## Supported Versions

We only provide security fixes for the **latest release** of each plugin. We do not backport fixes to older versions.

If you're running an outdated version, please update first — your issue may already be resolved.

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Instead, please report them privately:

1. **GitHub Security Advisories** (preferred): Go to the affected plugin's repository > Security tab > "Report a vulnerability"
2. **Email**: Reach out through [openwpclub.com](https://openwpclub.com) with "Security" in the subject

### What to include

- Which plugin and version is affected
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### What to expect

- We'll acknowledge your report within **48 hours**
- We'll provide an initial assessment within **1 week**
- We aim to release a fix within **2 weeks** for confirmed vulnerabilities
- We'll credit you in the release notes (unless you prefer to remain anonymous)

## Scope

This policy covers all public repositories under the [Open-WP-Club](https://github.com/Open-WP-Club) organization.

## General Security Practices

Our plugins follow WordPress security best practices:

- All user input is sanitized (`sanitize_text_field`, `absint`, etc.)
- All output is escaped (`esc_html`, `esc_attr`, `wp_kses`, etc.)
- All form submissions use nonces
- Database queries use `$wpdb->prepare()`
- File operations use the WordPress Filesystem API
- Capabilities are checked before privileged actions
