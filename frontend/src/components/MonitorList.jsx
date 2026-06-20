import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import MonitorCard from "./MonitorCard.jsx";

export default function MonitorList({ onOpenMonitor }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["monitors"],
    queryFn: api.listMonitors,
  });

  if (isLoading) return <p className="text-slate-500">Loading monitors...</p>;
  if (isError) return <p className="text-rose-600">Failed to load: {error.message}</p>;

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-slate-500">No monitors yet. Add your first one above.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {data.map((monitor) => (
        <MonitorCard
          key={monitor.id}
          monitor={monitor}
          onOpen={() => onOpenMonitor(monitor.id)}
        />
      ))}
    </div>
  );
}
