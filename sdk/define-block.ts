import type { ComponentType } from "react"

/** Studio-supported field types only (must match a floating-panel editor). */
export type BlockPropSpec = {
  type: "heading" | "paragraph" | "plaintext" | "number" | "boolean" | "media"
  label?: string
  default?: unknown
  defaultValue?: unknown
}

export type DefineBlockConfig<P extends Record<string, unknown> = Record<string, unknown>> = {
  name: string
  description?: string
  category?: string
  props?: Record<string, BlockPropSpec>
  permissions?: string[]
  Component: ComponentType<P>
}

export type DefinedBlock<P extends Record<string, unknown> = Record<string, unknown>> =
  ComponentType<P> & {
    __orcaBlock: {
      name: string
      description?: string
      category?: string
      props: Record<string, BlockPropSpec>
      permissions: string[]
    }
  }

export function defineBlock<P extends Record<string, unknown>>(
  config: DefineBlockConfig<P>,
): DefinedBlock<P> {
  const Comp = config.Component as DefinedBlock<P>
  Comp.__orcaBlock = {
    name: config.name,
    description: config.description,
    category: config.category,
    props: config.props ?? {},
    permissions: config.permissions ?? [],
  }
  Comp.displayName = config.name
  return Comp
}
