import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { connectOrcaBridge, type OrcaBridgeClient } from "./bridge-client"

export type OrcaFontsPayload = {
  href: string | null
  css: string | null
}

export type OrcaBridgeApi = {
  getTheme: () => Promise<Record<string, string>>
  getFonts: () => Promise<OrcaFontsPayload>
  getLocale: () => Promise<string>
  setHeight: (height: number) => Promise<void>
  storage: {
    get: (key: string) => Promise<unknown>
    set: (key: string, value: unknown) => Promise<void>
    remove: (key: string) => Promise<void>
  }
  analytics: {
    emit: (event: string, payload?: Record<string, unknown>) => Promise<void>
  }
  navigation: {
    open: (path: string) => Promise<void>
  }
  actions: {
    execute: (actionKey: string, input?: unknown) => Promise<unknown>
  }
}

const OrcaCtx = createContext<OrcaBridgeApi | null>(null)

const FONT_STYLE_ID = "orca-bridge-font-css"
const FONT_LINK_ID = "orca-bridge-font-link"

function applyThemeVars(theme: Record<string, string>) {
  const root = document.documentElement
  for (const [key, value] of Object.entries(theme)) {
    if (!key.startsWith("--") || typeof value !== "string") continue
    root.style.setProperty(key, value)
  }
}

function injectFonts(fonts: OrcaFontsPayload) {
  document.getElementById(FONT_STYLE_ID)?.remove()
  document.getElementById(FONT_LINK_ID)?.remove()

  if (fonts.css && fonts.css.trim()) {
    const style = document.createElement("style")
    style.id = FONT_STYLE_ID
    style.textContent = fonts.css
    document.head.appendChild(style)
    return
  }

  if (fonts.href) {
    const link = document.createElement("link")
    link.id = FONT_LINK_ID
    link.rel = "stylesheet"
    link.href = fonts.href
    document.head.appendChild(link)
  }
}

async function bootstrapHostAppearance(api: OrcaBridgeApi) {
  const [theme, fonts] = await Promise.all([
    api.getTheme().catch(() => ({}) as Record<string, string>),
    api.getFonts().catch(() => ({ href: null, css: null }) as OrcaFontsPayload),
  ])
  applyThemeVars(theme)
  injectFonts(fonts)
}

function createApi(client: OrcaBridgeClient): OrcaBridgeApi {
  return {
    getTheme: () => client.call("context.getTheme") as Promise<Record<string, string>>,
    getFonts: () => client.call("context.getFonts") as Promise<OrcaFontsPayload>,
    getLocale: () => client.call("context.getLocale") as Promise<string>,
    setHeight: (height) => client.call("layout.setHeight", { height }).then(() => undefined),
    storage: {
      get: (key) => client.call("storage.get", { key }),
      set: (key, value) => client.call("storage.set", { key, value }).then(() => undefined),
      remove: (key) => client.call("storage.remove", { key }).then(() => undefined),
    },
    analytics: {
      emit: (event, payload) =>
        client.call("analytics.emit", { event, payload }).then(() => undefined),
    },
    navigation: {
      open: (path) => client.call("navigation.open", { path }).then(() => undefined),
    },
    actions: {
      execute: (actionKey, input) => client.call("actions.execute", { actionKey, input }),
    },
  }
}

function measureContentHeight(): number {
  const root = document.getElementById("root")
  if (!root) return 0

  let max = 0
  const consider = (el: Element | null) => {
    if (!(el instanceof HTMLElement)) return
    max = Math.max(
      max,
      el.offsetHeight,
      Math.ceil(el.getBoundingClientRect().height),
    )
  }

  consider(root)
  for (const child of root.children) consider(child)

  return max
}

function reportContentHeight(api: OrcaBridgeApi) {
  const height = Math.ceil(measureContentHeight())
  if (height >= 40) void api.setHeight(height)
}

/** Production runtime inside Orca’s iframe. */
export function OrcaBridgeProvider(props: {
  nonce: string
  instanceId: string
  children: ReactNode
}) {
  const [api, setApi] = useState<OrcaBridgeApi | null>(null)

  useEffect(() => {
    const client = connectOrcaBridge({
      nonce: props.nonce,
      instanceId: props.instanceId,
    })
    const next = createApi(client)
    setApi(next)

    let ro: ResizeObserver | null = null
    const onWindowResize = () => reportContentHeight(next)

    void client.whenReady().then(async () => {
      await bootstrapHostAppearance(next)
      reportContentHeight(next)
      const root = document.getElementById("root")
      if (root) {
        ro = new ResizeObserver(() => reportContentHeight(next))
        ro.observe(root)
        for (const child of root.children) ro.observe(child)
      }
      window.addEventListener("resize", onWindowResize)
      window.setTimeout(() => reportContentHeight(next), 100)
      window.setTimeout(() => reportContentHeight(next), 500)
    })

    return () => {
      ro?.disconnect()
      window.removeEventListener("resize", onWindowResize)
      client.destroy()
    }
  }, [props.nonce, props.instanceId])

  const value = useMemo(() => api, [api])
  if (!value) return null
  return <OrcaCtx.Provider value={value}>{props.children}</OrcaCtx.Provider>
}

const PREVIEW_THEME: Record<string, string> = {
  "--primary": "173 80% 40%",
  "--primary-foreground": "0 0% 100%",
  "--foreground": "222 47% 11%",
  "--background": "0 0% 100%",
  "--muted": "210 40% 96%",
  "--muted-foreground": "215 16% 47%",
  "--border": "214 32% 91%",
  "--theme-font-heading": '"Inter", system-ui, sans-serif',
  "--theme-font-body": '"Inter", system-ui, sans-serif',
  "--theme-font-accent": '"Inter", system-ui, sans-serif',
}

/** Local `pnpm dev` preview — no parent iframe. */
export function PreviewOrcaProvider(props: {
  children: ReactNode
  mockActions?: Record<string, (input: unknown) => Promise<unknown> | unknown>
}) {
  const storage = useMemo(() => new Map<string, unknown>(), [])
  const api = useMemo<OrcaBridgeApi>(
    () => ({
      getTheme: async () => ({ ...PREVIEW_THEME }),
      getFonts: async () => ({
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap",
        css: null,
      }),
      getLocale: async () => "en",
      setHeight: async () => undefined,
      storage: {
        get: async (key) => storage.get(key) ?? null,
        set: async (key, value) => {
          storage.set(key, value)
        },
        remove: async (key) => {
          storage.delete(key)
        },
      },
      analytics: {
        emit: async (event, payload) => {
          console.info("[preview analytics]", event, payload)
        },
      },
      navigation: {
        open: async (path) => {
          console.info("[preview navigation.open]", path)
        },
      },
      actions: {
        execute: async (actionKey, input) => {
          const handler = props.mockActions?.[actionKey]
          if (handler) return handler(input)
          return {
            ok: true,
            mock: true,
            actionKey,
            input,
            message:
              "Mock action response. Configure a real action in Orca Site Settings → Dev block APIs.",
          }
        },
      },
    }),
    [props.mockActions, storage],
  )

  useEffect(() => {
    void bootstrapHostAppearance(api)
  }, [api])

  return <OrcaCtx.Provider value={api}>{props.children}</OrcaCtx.Provider>
}

export function useOrca(): OrcaBridgeApi {
  const ctx = useContext(OrcaCtx)
  if (!ctx) {
    throw new Error("useOrca must be used within an Orca developer block runtime")
  }
  return ctx
}
