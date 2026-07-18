import { useState } from "react"
import { asText, defineBlock, useOrca } from "@orca/blocks"
import "../styles.css"

type MediaProp = {
  imageSrc?: string
  url?: string
  src?: string
  alt?: string
}

type Props = {
  heading?: unknown
  body?: unknown
  image?: MediaProp | null
  ctaLabel?: unknown
}

function mediaSrc(value: MediaProp | null | undefined): string | null {
  if (!value || typeof value !== "object") return null
  const src = value.imageSrc || value.url || value.src
  return typeof src === "string" && src.trim() ? src.trim() : null
}

/**
 * Starter block — replace this with your own UI and logic.
 * Default export must be a defineBlock(...) component.
 * Orca compiles this file (plus siblings) — do not import Node APIs or arbitrary npm packages.
 */
export default defineBlock({
  name: "My Block",
  description: "Starter developer block — edit props, UI, and API calls to build your own.",
  category: "Developer",
  permissions: ["layout:resize", "actions:execute", "analytics:emit"],
  props: {
    heading: {
      type: "heading",
      label: "Heading",
      default: "Hello from your developer block",
    },
    body: {
      type: "paragraph",
      label: "Body",
      default: "Edit src/index.tsx, pack with pnpm zip, then upload in Developer Block Lab.",
    },
    image: {
      type: "media",
      label: "Image",
      default: null,
    },
    ctaLabel: {
      type: "button",
      label: "Button",
      default: "Call API",
    },
  },
  Component({ heading, body, image, ctaLabel }: Props) {
    const orca = useOrca()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<unknown>(null)

    const headingText = asText(heading)
    const bodyText = asText(body)
    const buttonLabel = asText(ctaLabel) || "Call API"
    const src = mediaSrc(image)
    const alt = typeof image?.alt === "string" ? image.alt : ""

    async function onCallApi() {
      setError(null)
      setResult(null)
      setLoading(true)
      try {
        // Named action (secrets stay in Orca): configure key "my-api" in Site Settings → Dev block APIs.
        // Public HTTPS: add origins to orca-block.json "network" and use fetch() instead.
        const data = await orca.actions.execute("my-api", { ping: true })
        setResult(data)
        await orca.analytics.emit("api_call", { action: "my-api" })
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    }

    return (
      <section className="odb-root">
        {src ? <img className="odb-image" src={src} alt={alt} /> : null}
        {headingText ? <h2 className="odb-heading">{headingText}</h2> : null}
        {bodyText ? <p className="odb-body">{bodyText}</p> : null}
        <button
          className="odb-button"
          type="button"
          onClick={() => void onCallApi()}
          disabled={loading}
        >
          {loading ? "…" : buttonLabel}
        </button>
        {error ? <p className="odb-error">{error}</p> : null}
        {result != null ? (
          <pre className="odb-result">{JSON.stringify(result, null, 2)}</pre>
        ) : null}
      </section>
    )
  },
})
