/**
 * Create an Orca upload ZIP (source only — no node_modules, sdk, or preview).
 * Zero runtime deps (works after clone without installing fflate).
 *
 * Usage: pnpm zip
 * Output: dist-pack/<name>-orca-block.zip
 */

import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
} from "node:fs"
import { join, relative, extname } from "node:path"
import { fileURLToPath } from "node:url"
import { deflateRawSync, crc32 } from "node:zlib"

const root = join(fileURLToPath(new URL("..", import.meta.url)))
const outDir = join(root, "dist-pack")

const ALLOWED_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".css",
  ".json",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".woff",
  ".woff2",
  ".txt",
  ".md",
])

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "dist-pack",
  "sdk",
  "preview",
  "scripts",
  ".git",
  ".github",
])

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".") && name !== ".gitkeep") continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue
      walk(full, files)
    } else {
      files.push(full)
    }
  }
  return files
}

function u16(n) {
  const b = Buffer.alloc(2)
  b.writeUInt16LE(n, 0)
  return b
}

function u32(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(n >>> 0, 0)
  return b
}

/** Minimal ZIP (deflate) writer. */
function buildZip(files) {
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const [name, data] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, "utf8")
    const compressed = deflateRawSync(data, { level: 6 })
    const crc = crc32(data)

    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(8),
      u16(0),
      u16(0),
      u32(crc),
      u32(compressed.length),
      u32(data.length),
      u16(nameBuf.length),
      u16(0),
      nameBuf,
      compressed,
    ])

    const central = Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(8),
      u16(0),
      u16(0),
      u32(crc),
      u32(compressed.length),
      u32(data.length),
      u16(nameBuf.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBuf,
    ])

    localParts.push(local)
    centralParts.push(central)
    offset += local.length
  }

  const centralDir = Buffer.concat(centralParts)
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(Object.keys(files).length),
    u16(Object.keys(files).length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ])

  return Buffer.concat([...localParts, centralDir, end])
}

const manifestPath = join(root, "orca-block.json")
if (!existsSync(manifestPath)) {
  console.error("Missing orca-block.json")
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
const entry = String(manifest.entry || "src/index.tsx").replace(/^\.\//, "")
const entryAbs = join(root, entry)
if (!existsSync(entryAbs)) {
  console.error(`Entry missing: ${entry}`)
  process.exit(1)
}

const candidates = [
  "orca-block.json",
  "definition.json",
  "styles.css",
  ...walk(join(root, "src")).map((f) => relative(root, f)),
]

if (existsSync(join(root, "assets"))) {
  candidates.push(...walk(join(root, "assets")).map((f) => relative(root, f)))
}

const zipFiles = {}
let count = 0
for (const rel of candidates) {
  const abs = join(root, rel)
  if (!existsSync(abs)) continue
  const ext = extname(rel).toLowerCase()
  if (rel !== "orca-block.json" && rel !== "definition.json" && !ALLOWED_EXT.has(ext)) {
    console.warn(`Skipping unsupported file: ${rel}`)
    continue
  }
  const key = rel.replace(/\\/g, "/")
  zipFiles[key] = readFileSync(abs)
  count += 1
}

if (!zipFiles["orca-block.json"] || !zipFiles[entry.replace(/\\/g, "/")]) {
  console.error("ZIP must include orca-block.json and the entry file")
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })
const safeName = String(manifest.name || "block")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
const outPath = join(outDir, `${safeName || "block"}-orca-block.zip`)
writeFileSync(outPath, buildZip(zipFiles))

console.log(`Packed ${count} files → ${outPath}`)
console.log("Upload this ZIP in Orca → Developer Block Lab.")
