"use client";
import React, { useEffect, useRef, useState } from 'react'

export const ServerStatusBar: React.FC = () => {
  const [connected, setConnected] = useState<boolean>(true)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    let stopped = false
    const connect = () => {
      if (stopped) return
      try {
        const proto = location.protocol === 'https:' ? 'wss' : 'ws'
        const ws = new WebSocket(`${proto}://${location.host}/api/realtime`)
        wsRef.current = ws
        ws.onopen = () => setConnected(true)
        ws.onclose = () => { setConnected(false); setTimeout(connect, 2000) }
        ws.onerror = () => { try { ws.close() } catch {} }
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data)
            if (msg?.type === 'ops.updated') {
              // place to trigger refreshes
            }
          } catch {}
        }
      } catch { setConnected(false); setTimeout(connect, 2000) }
    }
    connect()
    return () => { stopped = true; wsRef.current?.close() }
  }, [])

  return (
    <div className={`fixed bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded text-xs ${connected ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'}`}>
      {connected ? 'Połączono z serwerem' : 'Utracono połączenie — próba ponowienia…'}
    </div>
  )
}
