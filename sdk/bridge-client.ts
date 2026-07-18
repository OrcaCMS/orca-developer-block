type Pending = {
  resolve: (value: unknown) => void
  reject: (err: Error) => void
}

export type OrcaBridgeClient = {
  call: (method: string, params?: unknown) => Promise<unknown>
  destroy: () => void
  whenReady: () => Promise<void>
}

/**
 * Client-side bridge used inside the sandboxed iframe.
 * Expects parent to complete MessageChannel handshake after READY.
 * Calls made before the port arrives are queued (avoids setHeight race).
 */
export function connectOrcaBridge(params: {
  nonce: string
  instanceId: string
}): OrcaBridgeClient {
  const pending = new Map<string, Pending>()
  let port: MessagePort | null = null
  let reqId = 0
  let readyResolve: (() => void) | null = null
  const readyPromise = new Promise<void>((resolve) => {
    readyResolve = resolve
  })
  const callWaiters: Array<() => void> = []

  const flushWaiters = () => {
    const list = callWaiters.splice(0, callWaiters.length)
    for (const w of list) w()
  }

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
    readyResolve?.()
    readyResolve = null
    flushWaiters()
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

  function whenPort(): Promise<MessagePort> {
    if (port) return Promise.resolve(port)
    return new Promise((resolve) => {
      callWaiters.push(() => {
        if (port) resolve(port)
      })
    })
  }

  return {
    whenReady: () => readyPromise,
    call(method, callParams) {
      return whenPort().then(
        (p) =>
          new Promise((resolve, reject) => {
            const id = `r${++reqId}`
            pending.set(id, { resolve, reject })
            p.postMessage({
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
          }),
      )
    },
    destroy() {
      window.removeEventListener("message", onWindowMessage)
      port?.close()
      port = null
      pending.clear()
      callWaiters.splice(0, callWaiters.length)
    },
  }
}
