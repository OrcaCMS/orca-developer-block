# Orca developer block template

Starter for **OrcaCMS Developer Blocks** — stateful React micro-apps that run in a sandboxed iframe on customer sites.

Official org: [github.com/OrcaCMS](https://github.com/OrcaCMS)  
This repo: [github.com/OrcaCMS/orca-developer-block](https://github.com/OrcaCMS/orca-developer-block)

Clone this repo, edit the block, pack a ZIP, upload in **Developer Block Lab**.

## Quick start

```bash
git clone https://github.com/OrcaCMS/orca-developer-block.git
cd orca-developer-block
pnpm install   # or npm install / yarn
pnpm dev       # http://localhost:5177 — local preview with mock Orca bridge
```

When ready to upload:

```bash
pnpm zip
# → dist-pack/domain-search-orca-block.zip
```

Then in Orca Studio (with the target **site** selected): **Developer Block Lab → Upload block ZIP**.

Developer blocks are **site-scoped**. The same ZIP on another site is a separate upload (new block id / versions). There is no shared workspace library in v1 — keep the ZIP and re-upload to copy.

## What’s in the box

| Path | Purpose |
|------|---------|
| `orca-block.json` | Manifest (permissions, network allowlist, named actions) |
| `definition.json` | Studio field editors (heading, text, …) |
| `src/index.tsx` | Your React block (`defineBlock`) |
| `styles.css` | Styles bundled with the block |
| `sdk/` | Local `@orca/blocks` for preview only (**not** uploaded) |
| `preview/` | Vite preview shell (**not** uploaded) |
| `scripts/pack.mjs` | Builds the Orca upload ZIP |

## Developing your block

```tsx
import { defineBlock, useOrca } from "@orca/blocks"

export default defineBlock({
  name: "My Block",
  props: {
    heading: { type: "heading", default: "Hello" },
  },
  Component({ heading }) {
    const orca = useOrca()
    // useState, useEffect, … — normal React
    return <h2 style={{ fontFamily: "var(--theme-font-heading)" }}>{heading}</h2>
  },
})
```

### Theme + fonts (site Appearance)

With `"context:theme"` in `orca-block.json`, the runtime applies the **current site’s** Appearance as CSS variables (`--primary`, `--theme-font-body`, …) and injects font CSS / a Google Fonts link. Prefer those variables over hard-coded brand colors.

Keep the block root **transparent** so the host page background shows through (the artifact shell already uses a transparent `html`/`body`).

### Calling *your* backend

**A. Public HTTPS API (browser-safe)**  
Add origins to `orca-block.json`:

```json
"network": ["https://api.yourcompany.com"]
```

Then `fetch("https://api.yourcompany.com/…")` from the block. Your API must allow CORS from the artifact origin.

**B. Secret API key (recommended for Whois / private APIs)**  
1. Declare `"actions": ["domain-whois"]` and permission `actions:execute`  
2. In Orca: **Site Settings → Dev block APIs** → create action `domain-whois` + URL + secret  
3. Call:

```ts
const data = await orca.actions.execute("domain-whois", { domain })
```

Orca proxies the request; the secret never ships in the ZIP.

### Allowed imports (v1)

Orca’s compiler only allows:

- `react` / `react-dom`
- `@orca/blocks`
- `clsx`
- `zod`

No `package.json` scripts, no `node_modules` in the upload, no Node APIs (`fs`, etc.).

## Use as a GitHub template

This repository is meant to be a **template** under the OrcaCMS org:

1. Repo settings → **Template repository** → enable  
2. Users click **Use this template** (or `git clone`)

Suggested topics: `orcacms`, `react`, `developer-blocks`.

## Upload checklist

- [ ] Correct **site** selected in Studio (blocks are per site)
- [ ] `orca-block.json` valid (`schemaVersion: 1`, `runtime: "react"`)
- [ ] Entry file exists (`src/index.tsx`)
- [ ] No `node_modules` / lockfiles in the ZIP (`pnpm zip` excludes them)
- [ ] Permissions match what you call (`context:theme`, `actions:execute`, `layout:resize`, …)
- [ ] Named actions configured on **this site** if you use `orca.actions.execute`
- [ ] Workspace plan has `max_developer_blocks` > 0

## Docs

Platform architecture (Orca monorepo): [developer-blocks.md](https://github.com/OrcaCMS) — see the private `orca-admin` docs when contributing to the product.

## License

MIT
