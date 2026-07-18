# Orca developer block template

Starter for **OrcaCMS Developer Blocks** — sandboxed React micro-apps you upload per site.

Official org: [github.com/OrcaCMS](https://github.com/OrcaCMS)  
This repo: [github.com/OrcaCMS/orca-developer-block](https://github.com/OrcaCMS/orca-developer-block)

Use this as a base: clone → edit `src/index.tsx` → `pnpm zip` → upload in **Developer Block Lab**.

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
# → dist-pack/my-block-orca-block.zip
```

Then in Orca Studio (with the target **site** selected): **Developer Block Lab → Upload block ZIP**.

Developer blocks are **site-scoped**. The same ZIP on another site is a separate upload. There is no shared workspace library in v1 — keep the ZIP and re-upload to copy.

## What’s in the box

| Path | Purpose |
|------|---------|
| `orca-block.json` | Manifest (permissions, network allowlist, named actions) |
| `definition.json` | Studio field editors |
| `src/index.tsx` | Your React block (`defineBlock`) — start here |
| `styles.css` | Styles bundled with the block |
| `sdk/` | Local `@orca/blocks` for preview only (**not** uploaded) |
| `preview/` | Vite preview shell (**not** uploaded) |
| `scripts/pack.mjs` | Builds the Orca upload ZIP |

The starter includes heading, body, optional image, a button, and a sample `my-api` action call. Replace those with your own fields and logic.

## Developing your block

```tsx
import { asText, defineBlock, useOrca } from "@orca/blocks"

export default defineBlock({
  name: "My Block",
  props: {
    heading: { type: "heading", default: "Hello" },
    body: { type: "paragraph", default: "Supporting copy." },
  },
  Component({ heading, body }) {
    const orca = useOrca()
    return (
      <>
        <h2 style={{ fontFamily: "var(--theme-font-heading)" }}>{asText(heading)}</h2>
        <p>{asText(body)}</p>
      </>
    )
  },
})
```

Also rename the block in `orca-block.json` and `definition.json` so the packed ZIP name matches.

### Studio prop types

| Type | Studio editor | Value in your block |
|------|---------------|---------------------|
| `heading` | Heading | Prefer `asText(value)` |
| `paragraph` | Body / rich text | Prefer `asText(value)` |
| `string` / `text` | Single-line text | string |
| `number` / `boolean` | Number / toggle | number / boolean |
| `media` | Media picker | object — `imageSrc` or `url`, plus `alt` |
| `button` | Button (label + link) | Host currently passes the **label string** only |

### Theme + fonts (site Appearance)

With `"context:theme"` in `orca-block.json`, the runtime applies the site’s Appearance as CSS variables (`--primary`, `--theme-font-body`, …) and injects fonts. Prefer those over hard-coded brand colors.

Keep the block root **transparent** so the host page background shows through.

### Calling *your* backend

**A. Public HTTPS API (browser-safe)**  
Add origins to `orca-block.json`:

```json
"network": ["https://api.yourcompany.com"]
```

Then `fetch("https://api.yourcompany.com/…")` from the block. Your API must allow CORS from the artifact origin.

**B. Secret API key (recommended)**  
1. Declare `"actions": ["my-api"]` and permission `actions:execute`  
2. In Orca: **Site Settings → Dev block APIs** → create action `my-api` + URL + secret  
3. Call:

```ts
const data = await orca.actions.execute("my-api", { /* your payload */ })
```

Orca proxies the request; the secret never ships in the ZIP. Rename `my-api` to whatever keys you need.

### Allowed imports (v1)

- `react` / `react-dom`
- `@orca/blocks`
- `clsx`
- `zod`

No arbitrary npm, no Node APIs (`fs`, etc.), no `node_modules` in the upload.

## Use as a GitHub template

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

## License

MIT
