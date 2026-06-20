// One concept, one component. The status field can be 'up', 'down', or null
// (never checked). Each gets its own color and label.
const STYLES = {
  up:   { dot: "bg-emerald-500",          ring: "ring-emerald-200",     label: "Up" },
  down: { dot: "bg-rose-500 animate-pulse", ring: "ring-rose-200",       label: "Down" },
  null: { dot: "bg-slate-300",            ring: "ring-slate-200",       label: "Pending" },
};

export default function StatusDot({ status, label = true }) {
  const s = STYLES[status] || STYLES.null;
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className={`h-2.5 w-2.5 rounded-full ring-4 ${s.dot} ${s.ring}`} />
      {label && <span className="text-slate-700">{s.label}</span>}
    </span>
  );
}
