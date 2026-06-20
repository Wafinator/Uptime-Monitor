import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { api } from "../lib/api.js";
import { formatTime, timeAgo } from "../lib/format.js";
import StatusDot from "./StatusDot.jsx";
import ResponseTimeChart from "./ResponseTimeChart.jsx";

export default function MonitorDetail({ monitorId, onClose }) {
  const monitorQ = useQuery({
    queryKey: ["monitor", monitorId],
    queryFn: () => api.getMonitor(monitorId),
  });

  const logsQ = useQuery({
    queryKey: ["logs", monitorId],
    queryFn: () => api.getLogs(monitorId, 50),
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-10 flex items-start justify-center bg-slate-900/40 p-4 sm:p-8"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="monitor-detail"
        className="w-full max-w-3xl rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            {monitorQ.data ? (
              <>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-slate-900">{monitorQ.data.name}</h2>
                  <StatusDot status={monitorQ.data.last_status} />
                </div>
                <a
                  href={monitorQ.data.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-sm text-slate-500 hover:text-slate-900"
                >
                  {monitorQ.data.url}
                </a>
                <p className="mt-1 text-xs text-slate-400">
                  Last check {timeAgo(monitorQ.data.last_checked_at)} · every {monitorQ.data.interval_minutes} min
                </p>
              </>
            ) : (
              <p className="text-slate-500">Loading...</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Response time</h3>
          {logsQ.data && <ResponseTimeChart logs={logsQ.data} />}
        </div>

        <div className="border-t border-slate-200 p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Recent checks</h3>
          {logsQ.isLoading && <p className="text-sm text-slate-500">Loading logs...</p>}
          {logsQ.data && <LogTable logs={logsQ.data.slice(0, 15)} />}
        </div>
      </div>
    </div>
  );
}

function LogTable({ logs }) {
  if (logs.length === 0) {
    return <p className="text-sm text-slate-500">No checks recorded yet.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <th className="pb-2">Time</th>
          <th className="pb-2">Status</th>
          <th className="pb-2">HTTP</th>
          <th className="pb-2 text-right">Response</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {logs.map((log) => (
          <tr key={log.id}>
            <td className="py-2 text-slate-600">{formatTime(log.checked_at)}</td>
            <td className="py-2">
              <StatusDot status={log.status} />
            </td>
            <td className="py-2 text-slate-600">{log.status_code ?? "—"}</td>
            <td className="py-2 text-right tabular-nums text-slate-600">{log.response_time_ms} ms</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
