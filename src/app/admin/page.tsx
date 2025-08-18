import React from 'react'
import Link from 'next/link'

async function getBackups() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/backup/list`, { cache: 'no-store' })
  if (!res.ok) return { backups: [] }
  return res.json()
}

export default async function AdminPage() {
  const data = await getBackups()
  const backups: Array<{ path: string; size: number; mtime: number }> = data.backups || []
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Ustawienia serwera</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 rounded border bg-white dark:bg-gray-800">
          <h2 className="font-medium mb-2">Kopie zapasowe</h2>
          <form action="/api/backup/run" method="post">
            <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded">Wykonaj kopię</button>
          </form>
          <div className="mt-4 max-h-64 overflow-auto">
            <table className="w-full text-sm">
              <thead><tr><th className="text-left">Plik</th><th className="text-right">Rozmiar</th><th>Czas</th></tr></thead>
              <tbody>
                {backups.map(b => (
                  <tr key={b.path} className="border-t">
                    <td className="truncate max-w-[24rem]" title={b.path}>{b.path}</td>
                    <td className="text-right">{(b.size/1024/1024).toFixed(2)} MB</td>
                    <td>{new Date(b.mtime).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="p-4 rounded border bg-white dark:bg-gray-800">
          <h2 className="font-medium mb-2">Audyt</h2>
          <p className="text-sm text-gray-500">Pełny dziennik zmian</p>
          <Link href="/admin/audit" className="inline-block mt-2 px-3 py-1.5 text-sm bg-purple-600 text-white rounded">Otwórz panel audytu</Link>
        </div>
      </div>
    </div>
  )
}
