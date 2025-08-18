'use client';

import { useState, useEffect } from 'react';

interface AuditLog {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

const AuditLogViewer = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder: Fetch audit logs from an API endpoint
    const fetchLogs = async () => {
      setLoading(true);
      // In a real application, you would fetch from /api/audit
      const mockLogs: AuditLog[] = [
        { id: 1, timestamp: new Date().toISOString(), user: 'admin', action: 'User login', details: 'User admin logged in successfully.' },
        { id: 2, timestamp: new Date().toISOString(), user: 'admin', action: 'Create Order', details: 'Order #12345 was created.' },
      ];
      setLogs(mockLogs);
      setLoading(false);
    };

    fetchLogs();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Ostatnie zdarzenia</h2>
      {loading ? (
        <p>Ładowanie dziennika...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Użytkownik</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Akcja</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Szczegóły</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{log.user}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{log.action}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuditLogViewer;
