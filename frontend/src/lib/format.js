// "5 minutes ago" / "just now" — no date-fns dep needed.
export function timeAgo(isoString) {
  if (!isoString) return "never";
  const then = new Date(isoString).getTime();
  const seconds = Math.floor((Date.now() - then) / 1000);

  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatTime(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
