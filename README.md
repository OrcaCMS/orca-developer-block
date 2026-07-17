# Orca developer block template

Starter for **OrcaCMS Developer Blocks** — stateful React micro-apps that run in a sandboxed iframe on customer sites.

Clone this repo, edit the block, pack a ZIP, upload in **Developer Block Lab**.

## Quick start

```bash
git clone https://github.com/<your-org>/orca-developer-block.git
cd orca-developer-block
pnpm install   # or npm install / yarn
pnpm dev       # http://localhost:5177 — local preview with mock Orca bridge
```

When ready to upload:

```bash
pnpm zip
# → dist-pack/domain-search-orca-block.zip
```

Then in Orca Studio: **Developer Block Lab → Upload block ZIP**.

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
    return <h2>{heading}</h2>
  },
})
```

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

## Publishing this template on GitHub

From the Orca monorepo (or after copying this folder elsewhere):

```bash
# Option A — new repo from this folder
cd templates/orca-developer-block
git init
git add .
git commit -m "Initial Orca developer block template"
gh repo create orca-developer-block --public --source=. --remote=origin --push

# Option B — copy files into an empty clone, then push
```

Then in GitHub → **Settings → General → Template repository** → enable so users can click **Use this template**.

Suggested topics: `orcacms`, `react`, `developer-blocks`.

## Upload checklist

- [ ] `orca-block.json` valid (`schemaVersion: 1`, `runtime: "react"`)
- [ ] Entry file exists (`src/index.tsx`)
- [ ] No `node_modules` / lockfiles in the ZIP (`pnpm zip` excludes them)
- [ ] Permissions match what you call (`actions:execute`, `layout:resize`, …)
- [ ] Named actions configured in Orca if you use `orca.actions.execute`
- [ ] Workspace plan has `max_developer_blocks` &gt; 0

## Docs

See Orca monorepo: [`docs/developer-blocks.md`](../../docs/developer-blocks.md) (architecture, env, trust model).

## License

MIT
