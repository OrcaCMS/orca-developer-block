type Pending = {
  resolve: (value: unknown) => void
  reject: (err: Error) => void
}

export type OrcaBridgeClient = {
  call: (method: string, params?: unknown) => Promise<unknown>
  destroy: () => void
}

/** Used inside Orca’s sandboxed iframe — talks to the parent via MessageChannel. */
export function connectOrcaBridge(params: {
  nonce: string
  instanceId: string
}): OrcaBridgeClient {
  const pending = new Map<string, Pending>()
  let port: MessagePort | null = null
  let reqId = 0

  const onWindowMessage = (event: MessageEvent) => {
    const data = event.data
    if (!data || typeof data !== "object") return
    if ((data as { type?: string }).type !== "orca-devblock-port") return
    if ((data as { nonce?: string }).nonce !== params.nonce) return
    if (!(event.ports?.[0] instanceof MessagePort)) return
    port = event.ports[0]
    port.onmessage = (ev) => {
      const msg = ev.data
      if (!msg || msg.type !== "orca-devblock-res" || typeof msg.id !== "string") return
      const p = pending.get(msg.id)
      if (!p) return
      pending.delete(msg.id)
      if (msg.ok) p.resolve(msg.result)
      else p.reject(new Error(msg.error || "Bridge error"))
    }
    port.start()
  }

  window.addEventListener("message", onWindowMessage)
  window.parent.postMessage(
    {
      type: "orca-devblock-ready",
      protocolVersion: 1,
      nonce: params.nonce,
      instanceId: params.instanceId,
    },
    "*",
  )

  return {
    call(method, callParams) {
      return new Promise((resolve, reject) => {
        if (!port) {
          reject(new Error("Orca bridge not connected"))
          return
        }
        const id = `r${++reqId}`
        pending.set(id, { resolve, reject })
        port.postMessage({
          type: "orca-devblock-req",
          id,
          method,
          params: callParams,
        })
        setTimeout(() => {
          if (pending.has(id)) {
            pending.delete(id)
            reject(new Error(`Bridge timeout: ${method}`))
          }
        }, 15_000)
      })
    },
    destroy() {
      window.removeEventListener("message", onWindowMessage)
      port?.close()
      port = null
      pending.clear()
    },
  }
}
