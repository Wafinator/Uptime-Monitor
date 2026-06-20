import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";

const EMPTY = { name: "", url: "", interval_minutes: 5, alert_email: "" };

export default function AddMonitorForm() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);

  const create = useMutation({
    mutationFn: (data) => api.createMonitor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
      setForm(EMPTY);
      setOpen(false);
    },
  });

  function submit(e) {
    e.preventDefault();
    create.mutate({
      name: form.name.trim(),
      url: form.url.trim(),
      interval_minutes: Number(form.interval_minutes),
      alert_email: form.alert_email.trim() || null,
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        data-testid="open-add-form"
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        + Add monitor
      </button>
    );
  }

  return (
    <form onSubmit={submit} data-testid="add-monitor-form" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="My API" required />
        <Field label="URL" value={form.url} onChange={(v) => setForm({ ...form, url: v })} placeholder="https://example.com" required />
        <Field
          label="Check every (minutes)"
          type="number"
          min="1"
          value={form.interval_minutes}
          onChange={(v) => setForm({ ...form, interval_minutes: v })}
        />
        <Field
          label="Alert email (optional)"
          type="email"
          value={form.alert_email}
          onChange={(v) => setForm({ ...form, alert_email: v })}
          placeholder="ops@example.com"
        />
      </div>

      {create.isError && (
        <p data-testid="add-error" className="mt-3 text-sm text-rose-600">{create.error.message}</p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          data-testid="submit-monitor"
          disabled={create.isPending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {create.isPending ? "Adding..." : "Add monitor"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setForm(EMPTY); }}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", testid, ...rest }) {
  // testid is derived from the label by default so each input is targetable.
  const id = testid || `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={id}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        {...rest}
      />
    </label>
  );
}
