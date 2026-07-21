# Open-Source Launch Plan

## Context
Preparing the `bot-cli` monorepo for public open-source release under the **klips-tooling** GitHub organization. This includes licensing, documentation, community files, a GitHub Pages landing page, and npm publication readiness.

## Goals
- Apache 2.0 license across the project
- Polished README with badges, install, usage, and contribution guide
- GitHub Pages landing page in neobrutalism style with social links
- Standard open-source community files (CONTRIBUTING, CODE_OF_CONDUCT, SECURITY)
- npm publish preparation
- Clean `.gitignore` and repo hygiene

---

## Files to create

| File | Purpose |
|------|---------|
| `LICENSE` | Apache 2.0 full text |
| `CONTRIBUTING.md` | How to contribute, dev setup, PR process |
| `CODE_OF_CONDUCT.md` | Contributor Covenant |
| `SECURITY.md` | Security policy & reporting |
| `docs/` (gh-pages) | Landing page source — HTML/CSS with neobrutalism |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Bug report template |
| `.github/ISSUE_TEMPLATE/feature_request.md` | Feature request template |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR template |

## Files to modify

| File | Change |
|------|--------|
| `README.md` | Full rewrite — badges, features, install, usage, contributing, links |
| `package.json` (root) | Update description, add repository/author/ keywords |
| `packages/cli/package.json` | Change license to Apache-2.0, update author, add repo info |
| `.gitignore` | Add gh-pages build artifacts, ensure comprehensive |

---

## Approach

### 1. Apache 2.0 LICENSE
- Add `LICENSE` file with full Apache 2.0 text
- Update `"license"` fields in root `package.json` and `packages/cli/package.json` to `"Apache-2.0"`

### 2. README overhaul
- Badges: npm version, license, node version, PRs welcome
- Clear elevator pitch
- Feature list
- Quick install (`npm install -g @klips-tooling/bot-cli`)
- Usage examples with terminal screenshots (ASCII-style)
- Available templates table
- Development setup
- Links to GitHub org, author's GitHub, and Twitter/X

### 3. GitHub Pages (neobrutalism)
- Create a `docs/` directory with a standalone `index.html`
- Style it using the neobrutalism design language from the project templates:
  - Bold borders, offset shadows, yellow/black/green palette
  - BOT Chain brand colors: `#FFE01B` (yellow), `#10A37F` (green), `#0A0A0A` (black)
  - Space Grotesk + Space Mono fonts
- Sections: Hero, Features, Quick Start, Commands, Templates
- Footer with:
  - "Created by [Eldevode](https://github.com/Eldevode)"
  - Twitter/X link: [@Eldevode_](https://x.com/Eldevode_)
  - GitHub org: [klips-tooling](https://github.com/klips-tooling)
- Configure GitHub Pages in repo settings to serve from `docs/` on main branch

### 4. Community files
- `CONTRIBUTING.md` — dev setup (pnpm, build, test), PR flow, commit conventions
- `CODE_OF_CONDUCT.md` — standard Contributor Covenant 2.1
- `SECURITY.md` — where to report vulnerabilities
- GitHub issue/PR templates under `.github/`

### 5. npm deployment prep
- Ensure `packages/cli/package.json` has correct `name`, `version`, `description`, `keywords`, `repository`, `author`, `license`, `bin`, `files`
- Add `.npmignore` if needed (currently `files: ["dist"]` handles it)
- Add `prepublishOnly` script if needed
- Ensure `bot-cli` name is available on npm

### 6. .gitignore cleanup
- Add entries for gh-pages build output
- Ensure no secrets or env files can be committed

---

## Steps

### Phase 1 — License & Metadata
- [x] Create `LICENSE` (Apache 2.0)
- [x] Update root `package.json` license and metadata
- [x] Update `packages/cli/package.json` license, author, repository

### Phase 2 — README
- [x] Rewrite `README.md` with full project documentation

### Phase 3 — Community Files
- [x] Create `CONTRIBUTING.md`
- [x] Create `CODE_OF_CONDUCT.md`
- [x] Create `SECURITY.md`
- [x] Create `.github/ISSUE_TEMPLATE/bug_report.md`
- [x] Create `.github/ISSUE_TEMPLATE/feature_request.md`
- [x] Create `.github/PULL_REQUEST_TEMPLATE.md`

### Phase 4 — GitHub Pages
- [x] Create `docs/index.html` (neobrutalism landing page)
- [x] Create `docs/style.css` (embeddable or inline)
- [x] Include social links (GitHub: Eldevode, X: Eldevode_, org: klips-tooling)
- [x] Add dark mode toggle
- [x] Fix hero subtitle width / centering

### Phase 5 — Final Cleanup
- [x] Review and update `.gitignore`
- [x] Verify `packages/cli/package.json` is npm-ready
- [x] Transfer repo to `klips-tooling` org
- [x] Update explorer URLs (testnet: scan.bohr.life)

---

## Reuse
- Brand colors and fonts from `templates/nextjs-react/src/style.css`
- Logo SVG from `templates/nextjs-react/src/App.tsx` (the `Logo` component)
- CLI command descriptions from `packages/cli/src/index.ts`

## Verification
- `pnpm build` passes
- `pnpm test` passes
- README renders correctly on GitHub
- `docs/index.html` renders correctly locally (`npx serve docs/`)
- Social links all work
- License file is valid
