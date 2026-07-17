import { useState } from "react"
import { defineBlock, useOrca } from "@orca/blocks"
import "../styles.css"

function isValidDomain(value: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(
    value.trim(),
  )
}

type Props = {
  heading?: string
  subtitle?: string
  tip?: string
}

/**
 * Default export must be a defineBlock(...) component.
 * Orca compiles this file (plus siblings) — do not import Node APIs or arbitrary npm packages.
 */
export default defineBlock({
  name: "Domain Search",
  description: "Domain lookup micro-app with client validation + named Orca action",
  category: "Developer",
  permissions: ["layout:resize", "actions:execute", "analytics:emit"],
  props: {
    heading: {
      type: "heading",
      label: "Heading",
      default: "Enter the domain name and see the results",
    },
    subtitle: {
      type: "text",
      label: "Subtitle",
      default: "Want to check availability or ownership? Type a domain below.",
    },
    tip: {
      type: "text",
      label: "Tip",
      default: "Tip: try example.com or any registered domain.",
    },
  },
  Component({ heading, subtitle, tip }: Props) {
    const orca = useOrca()
    const [domain, setDomain] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<unknown>(null)
    const [loading, setLoading] = useState(false)

    async function onSearch() {
      setError(null)
      setResult(null)
      if (!isValidDomain(domain)) {
        setError("Enter a valid domain name")
        return
      }
      setLoading(true)
      try {
        // Secret backends: configure action key "domain-whois" in Orca Site Settings.
        // Public HTTPS APIs: add origins to orca-block.json "network" and fetch() them instead.
        const data = await orca.actions.execute("domain-whois", { domain: domain.trim() })
        setResult(data)
        await orca.analytics.emit("domain_search", { domain: domain.trim() })
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
        void orca.setHeight(document.documentElement.scrollHeight)
      }
    }

    return (
      <section className="odb-root">
        <h2 className="odb-heading">{heading}</h2>
        {subtitle ? <p className="odb-subtitle">{subtitle}</p> : null}
        <div className="odb-row">
          <input
            className="odb-input"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void onSearch()
            }}
            placeholder="Enter the domain name"
            autoComplete="off"
          />
          <button className="odb-button" type="button" onClick={() => void onSearch()} disabled={loading}>
            {loading ? "…" : "Search"}
          </button>
        </div>
        {tip ? <p className="odb-tip">{tip}</p> : null}
        {error ? <p className="odb-error">{error}</p> : null}
        {result != null ? (
          <pre className="odb-result">{JSON.stringify(result, null, 2)}</pre>
        ) : null}
      </section>
    )
  },
})
