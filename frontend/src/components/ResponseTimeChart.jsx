import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// Logs come newest-first from the API. The chart wants oldest-first
// so time flows left -> right.
export default function ResponseTimeChart({ logs }) {
  const data = [...logs].reverse().map((log) => ({
    time: new Date(log.checked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    ms: log.response_time_ms,
    status: log.status,
  }));

  if (data.length === 0) {
    return <p className="text-sm text-slate-500">No checks yet — give it a minute.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
          <YAxis stroke="#94a3b8" fontSize={11} unit=" ms" />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
            formatter={(value, _name, item) => [`${value} ms`, item.payload.status]}
          />
          <Line type="monotone" dataKey="ms" stroke="#0f172a" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
