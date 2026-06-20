// Thin wrapper around fetch. All paths are relative — Vite's dev proxy forwards
// /api/* to the Express backend, so we don't need to know its URL.

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = data.error || JSON.stringify(data);
    } catch {
      detail = res.statusText;
    }
    throw new Error(`${res.status}: ${detail}`);
  }

  // DELETE returns 204 — no body to parse.
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listMonitors: () => request("/api/monitors"),
  getMonitor: (id) => request(`/api/monitors/${id}`),
  createMonitor: (data) => request("/api/monitors", { method: "POST", body: data }),
  updateMonitor: (id, data) => request(`/api/monitors/${id}`, { method: "PATCH", body: data }),
  deleteMonitor: (id) => request(`/api/monitors/${id}`, { method: "DELETE" }),
  getLogs: (id, limit = 50) => request(`/api/monitors/${id}/logs?limit=${limit}`),
};
