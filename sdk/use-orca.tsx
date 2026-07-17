import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { connectOrcaBridge, type OrcaBridgeClient } from "./bridge-client"

export type OrcaBridgeApi = {
  getTheme: () => Promise<Record<string, string>>
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

function createApi(client: OrcaBridgeClient): OrcaBridgeApi {
  return {
    getTheme: () => client.call("context.getTheme") as Promise<Record<string, string>>,
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
    setApi(createApi(client))
    return () => client.destroy()
  }, [props.nonce, props.instanceId])

  const value = useMemo(() => api, [api])
  if (!value) return null
  return <OrcaCtx.Provider value={value}>{props.children}</OrcaCtx.Provider>
}

/** Local `pnpm dev` preview — no parent iframe. */
export function PreviewOrcaProvider(props: {
  children: ReactNode
  mockActions?: Record<string, (input: unknown) => Promise<unknown> | unknown>
}) {
  const storage = useMemo(() => new Map<string, unknown>(), [])
  const api = useMemo<OrcaBridgeApi>(
    () => ({
      getTheme: async () => ({
        "--orca-primary": "#0f766e",
        "--orca-foreground": "#111827",
        "--orca-background": "#ffffff",
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

  return <OrcaCtx.Provider value={api}>{props.children}</OrcaCtx.Provider>
}

export function useOrca(): OrcaBridgeApi {
  const ctx = useContext(OrcaCtx)
  if (!ctx) {
    throw new Error("useOrca must be used within an Orca developer block runtime")
  }
  return ctx
}
