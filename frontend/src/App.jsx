import { useState } from "react";
import AddMonitorForm from "./components/AddMonitorForm.jsx";
import MonitorList from "./components/MonitorList.jsx";
import MonitorDetail from "./components/MonitorDetail.jsx";

export default function App() {
  const [openMonitorId, setOpenMonitorId] = useState(null);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-4">
          <h1 className="text-xl font-bold text-slate-900">Uptime Monitor</h1>
          <p className="text-sm text-slate-500">Watch URLs, get notified when they fail.</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-6">
        <div className="mb-6">
          <AddMonitorForm />
        </div>
        <MonitorList onOpenMonitor={setOpenMonitorId} />
      </main>

      {openMonitorId !== null && (
        <MonitorDetail monitorId={openMonitorId} onClose={() => setOpenMonitorId(null)} />
      )}
    </div>
  );
}
