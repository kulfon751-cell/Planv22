'use client';

import ServerSettingsPanel from '@/components/admin/ServerSettingsPanel';

export default function ServerSettingsPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Ustawienia serwera</h1>
      <ServerSettingsPanel />
    </div>
  );
}
