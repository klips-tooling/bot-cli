# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in **bot-cli** or any of its templates, please report it responsibly.

**Do not open a public GitHub issue.**

Instead, send an email to:

📧 **security@botchain.ai** (or **hello@botchain.ai** as fallback)

Please include:

- A clear description of the vulnerability
- Steps to reproduce
- Affected versions (CLI version, template version)
- Any potential impact

We aim to:

- Acknowledge your report within **48 hours**
- Provide a timeline for a fix within **7 days**
- Credit you in the release notes (unless you prefer to remain anonymous)

---

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | ✅ Active support  |

We release patches for the latest minor version. Older versions are not supported.

---

## Scope

The security policy covers:

- The `bot-cli` npm package (`packages/cli/`)
- All bundled templates (`templates/`)
- The monorepo tooling and build scripts

---

## Best Practices for Users

- Always verify the package source: `npm install -g bot-cli`
- Keep the CLI updated: `npm update -g bot-cli`
- Do not commit `.env` files — they are gitignored by default in scaffolded projects
- Use environment variables for sensitive keys (WalletConnect project ID, RPC URLs)
