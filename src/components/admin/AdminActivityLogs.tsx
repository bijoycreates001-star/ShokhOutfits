import React, { useState, useEffect } from 'react';
import { FileText, ShieldCheck, UserCheck, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

export const AdminActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.adminGetActivityLogs();
      if (res.success) {
        setLogs(res.logs || []);
      }
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Admin Activity &amp; Audit Trail</h2>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Immutable log of all store configuration, price modifications, stock changes, and order status updates
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8F9FA] border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Date &amp; Time</th>
              <th className="py-3 px-4">Admin</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Activity Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 font-medium text-neutral-800">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-neutral-400">
                  Loading activity logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-neutral-400">
                  No activity recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="py-3 px-4 text-neutral-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-neutral-200 text-neutral-800 flex items-center justify-center font-bold text-[10px]">
                        {log.adminName ? log.adminName[0] : 'A'}
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900">{log.adminName}</p>
                        <p className="text-[10px] text-neutral-400">{log.adminEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 uppercase text-[10px] font-bold text-neutral-700">
                    <span className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200">
                      {log.action?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-neutral-800 font-semibold leading-relaxed">
                    {log.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
