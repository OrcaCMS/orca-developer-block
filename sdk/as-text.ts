/**
 * Coerce Studio-rich field values (heading/paragraph objects) or plain strings to text.
 * Prefer this when rendering props typed as `heading` / `paragraph` in defineBlock.
 */
export function asText(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (typeof value === "object" && !Array.isArray(value)) {
    const text = (value as { text?: unknown }).text
    if (typeof text === "string") {
      return text
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\n+/g, " ")
        .trim()
    }
    const label = (value as { label?: unknown }).label
    if (typeof label === "string") return label
  }
  return ""
}
