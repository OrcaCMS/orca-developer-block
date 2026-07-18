# Orca developer block — agent notes

Guidance for AI coding agents working in this template.

## What this package is

A **generic starter** for site-scoped OrcaCMS Developer Blocks: React micro-apps uploaded as a ZIP, compiled by Orca, and rendered in a sandboxed iframe (`sandbox="allow-scripts"` only).

- Not a product demo — replace `src/index.tsx` props/UI/API calls with the user’s block
- Block type ids look like `devblock:{uuid}`
- Each upload belongs to **one site** (not the whole workspace)
- To reuse on another site: download/keep the ZIP → open that site → Developer Block Lab → upload again

Custom Block Lab (`custom:*` template DSL) is a different product path — do not mix models.

## Package shape

```text
orca-block.json     # manifest: permissions, network[], actions[]
definition.json     # optional Studio field editors
src/index.tsx       # entry — export default defineBlock({…})
styles.css
assets/             # optional static files
sdk/                # local preview only — NOT uploaded
preview/            # Vite shell — NOT uploaded
```

Upload with `pnpm zip` → `dist-pack/*-orca-block.zip`. Do not hand-zip `node_modules` or `sdk/`.

## Allowlisted imports (compiler)

Only:

- `react` / `react-dom`
- `@orca/blocks`
- `clsx`
- `zod`

No Node APIs (`fs`, etc.), no arbitrary npm, no `import()` of host code.

## Theme + fonts (site Appearance)

Declare `"context:theme"` in `orca-block.json` `permissions`.

At runtime, `@orca/blocks` `OrcaBridgeProvider` automatically:

1. Calls `context.getTheme` and applies CSS variables on `documentElement` (`--primary`, `--theme-font-body`, …)
2. Calls `context.getFonts` and injects self-hosted font CSS or a Google Fonts `<link>`

Prefer these in styles:

```css
color: hsl(var(--primary));
font-family: var(--theme-font-body);
```

You can still call `useOrca().getTheme()` / `getFonts()` manually if needed.

## Transparent background

Keep the block root **transparent**. The artifact shell already sets `html, body { background: transparent }`. Avoid painting a full-bleed opaque page background unless the design requires a card-like surface — the host page supplies site chrome and section backgrounds.

## Site-specific APIs and actions

- Public `fetch`: list HTTPS origins in `network[]` (CSP `connect-src`)
- Secrets: declare named `actions` + `actions:execute`, configure URL/secret in **Site Settings → Dev block APIs**, call `orca.actions.execute(key, input)`
- Starter uses action key `my-api` — rename in `orca-block.json`, `src/index.tsx`, and preview mocks

Actions and blocks are both site-scoped.

## Studio field props

Supported `defineBlock` prop types: `heading`, `paragraph`, `string`, `text`, `number`, `boolean`, `media`, `button`.

Prefer `paragraph` (not `text`) for body/subtitle copy. Heading/paragraph values may arrive as objects (`{ text, tag, … }`) — always render with `asText(value)` from `@orca/blocks`.

- `media`: object with `imageSrc` / `url` (+ `alt`) so site editors can swap files in Studio
- `button`: Studio has a full button editor; the iframe host currently coerces to the **label string** only

## Do not bake fonts into the ZIP

Site typography comes from the host bridge at runtime so the block always matches that site’s Appearance. Do not download R2/Google font files into the upload package for theming.
