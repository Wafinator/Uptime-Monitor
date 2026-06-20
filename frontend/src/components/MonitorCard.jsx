import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, Trash2 } from "lucide-react";
import { api } from "../lib/api.js";
import { timeAgo } from "../lib/format.js";
import StatusDot from "./StatusDot.jsx";

export default function MonitorCard({ monitor, onOpen }) {
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: () => api.deleteMonitor(monitor.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitors"] }),
  });

  const toggle = useMutation({
    mutationFn: () => api.updateMonitor(monitor.id, { is_active: !monitor.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitors"] }),
  });

  return (
    <div
      onClick={onOpen}
      data-testid="monitor-card"
      data-monitor-name={monitor.name}
      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <StatusDot status={monitor.last_status} label={false} />
            <h3 className="truncate text-base font-semibold text-slate-900">{monitor.name}</h3>
            {!monitor.is_active && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Paused</span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-slate-500">{monitor.url}</p>
        </div>

        <div className="flex shrink-0 gap-1">
          <IconButton
            title={monitor.is_active ? "Pause" : "Resume"}
            data-testid="monitor-toggle"
            onClick={(e) => { e.stopPropagation(); toggle.mutate(); }}
            disabled={toggle.isPending}
            className="text-slate-900 hover:bg-slate-100"
          >
            {monitor.is_active ? <Pause size={16} /> : <Play size={16} />}
          </IconButton>
          <IconButton
            title="Delete"
            data-testid="monitor-delete"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete "${monitor.name}"? This also removes all check history.`)) {
                remove.mutate();
              }
            }}
            disabled={remove.isPending}
            className="text-rose-600 hover:bg-rose-50"
          >
            <Trash2 size={16} />
          </IconButton>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>Checks every {monitor.interval_minutes} min</span>
        <span>Last check: {timeAgo(monitor.last_checked_at)}</span>
      </div>
    </div>
  );
}

function IconButton({ children, className = "", ...rest }) {
  return (
    <button
      {...rest}
      className={`rounded-md p-2 disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}
