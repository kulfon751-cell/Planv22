'use client';

import AuditLogViewer from '@/components/admin/AuditLogViewer';

export default function AuditLogPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dziennik audytu</h1>
      <AuditLogViewer />
    </div>
  );
}
