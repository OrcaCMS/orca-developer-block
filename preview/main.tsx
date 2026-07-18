import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { PreviewOrcaProvider } from "@orca/blocks"
import Block from "../src/index"
import definition from "../definition.json"
import "../styles.css"

function defaultsFromDefinition(): Record<string, unknown> {
  const fields = Array.isArray(definition.fields) ? definition.fields : []
  const out: Record<string, unknown> = {}
  for (const field of fields) {
    if (field && typeof field === "object" && "name" in field) {
      const f = field as { name: string; defaultValue?: unknown }
      out[f.name] = f.defaultValue
    }
  }
  return out
}

const props = defaultsFromDefinition()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "2rem 1rem" }}>
      <p
        style={{
          maxWidth: "40rem",
          margin: "0 auto 1rem",
          color: "#64748b",
          fontSize: 13,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Local preview with a mock Orca bridge. Run <code>pnpm zip</code> and upload the ZIP in Orca →
        Developer Block Lab.
      </p>
      <PreviewOrcaProvider
        mockActions={{
          "my-api": async (input) => ({
            ok: true,
            mock: true,
            input,
            message: "Mock response. Configure the my-api action in Orca Site Settings → Dev block APIs.",
          }),
        }}
      >
        <Block {...props} />
      </PreviewOrcaProvider>
    </div>
  </StrictMode>,
)
