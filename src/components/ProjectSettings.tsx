"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  projectId: string;
  projectName: string;
  projectKey: string;
}

export function ProjectSettings({ projectId, projectName, projectKey }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Require the project key — short, lowercase, distinctive — to be retyped.
  const canDelete = typed.trim() === projectKey;

  async function handleDelete() {
    if (!canDelete) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Delete failed");
        return;
      }
      router.push("/projects");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white border border-red-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-red-100 bg-red-50/60">
        <h2 className="text-sm font-semibold text-red-800 tracking-tight">Project Settings</h2>
      </div>
      <div className="px-6 py-5">
        {!open ? (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-slate-900">Delete this project</p>
              <p className="mt-0.5 text-xs text-slate-600">
                Permanently removes <span className="font-semibold">{projectName}</span> and
                all of its environments, flags, targeting rules, API keys, and activity.
              </p>
            </div>
            <button
              onClick={() => setOpen(true)}
              className="shrink-0 inline-flex items-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
            >
              Delete project
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-800">
              This action cannot be undone. To confirm, type the project key{" "}
              <code className="font-mono bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-800">
                {projectKey}
              </code>{" "}
              below.
            </p>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              disabled={busy}
              placeholder={projectKey}
              className="block w-full max-w-sm rounded-md border border-slate-200 px-2.5 py-1.5 text-sm font-mono text-slate-800 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100 disabled:opacity-50"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  setTyped("");
                  setError("");
                }}
                disabled={busy}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!canDelete || busy}
                className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {busy ? "Deleting…" : "I understand, delete project"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
