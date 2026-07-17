import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@orca/blocks": path.resolve(root, "sdk/index.ts"),
    },
  },
  server: {
    port: 5177,
  },
})
