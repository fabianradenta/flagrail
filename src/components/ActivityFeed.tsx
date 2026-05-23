"use client";

import { useMemo, useState } from "react";

export interface ActivityLog {
  id: string;
  action: string;
  createdAt: string; // ISO date string
  user: { name: string | null; email: string } | null;
}

type TypeFilter = "all" | "flag" | "rollout" | "rule" | "api_key";
type DateFilter = "all" | "today" | "7d" | "30d";

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "flag", label: "Flags" },
  { id: "api_key", label: "API Keys" },
  { id: "rollout", label: "Rollout" },
  { id: "rule", label: "Rules" },
];

const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
];

const ACTION_META: Record<string, { dot: string; label: string; type: TypeFilter }> = {
  "project.created":      { dot: "bg-indigo-500",  label: "Project created",     type: "all" },
  "flag.created":         { dot: "bg-emerald-500", label: "Flag created",        type: "flag" },
  "flag.toggled":         { dot: "bg-blue-500",    label: "Flag toggled",        type: "flag" },
  "flag.updated":         { dot: "bg-blue-500",    label: "Flag updated",        type: "flag" },
  "flag.rollout_changed": { dot: "bg-amber-500",   label: "Rollout updated",     type: "rollout" },
  "rule.created":         { dot: "bg-violet-500",  label: "Audience rule added", type: "rule" },
  "rule.deleted":         { dot: "bg-violet-500",  label: "Audience rule removed", type: "rule" },
  "api_key.created":      { dot: "bg-violet-500",  label: "API key created",     type: "api_key" },
  "api_key.deleted":      { dot: "bg-red-500",     label: "API key revoked",     type: "api_key" },
};

function classifyAction(action: string): TypeFilter {
  return ACTION_META[action]?.type ?? "all";
}

function dateCutoff(filter: DateFilter): number | null {
  if (filter === "all") return null;
  const now = new Date();
  if (filter === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return start.getTime();
  }
  const days = filter === "7d" ? 7 : 30;
  return now.getTime() - days * 24 * 60 * 60 * 1000;
}

export function ActivityFeed({ logs }: { logs: ActivityLog[] }) {
  const [type, setType] = useState<TypeFilter>("all");
  const [date, setDate] = useState<DateFilter>("all");

  const filtered = useMemo(() => {
    const cutoff = dateCutoff(date);
    return logs.filter((log) => {
      if (type !== "all" && classifyAction(log.action) !== type) return false;
      if (cutoff !== null && new Date(log.createdAt).getTime() < cutoff) return false;
      return true;
    });
  }, [logs, type, date]);

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <p className="text-sm font-medium text-slate-700">No activity recorded yet.</p>
        <p className="text-xs text-slate-500 mt-1">
          Events will appear here as you manage flags and keys.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-1">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setType(f.id)}
              className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                type === f.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={date}
          onChange={(e) => setDate(e.target.value as DateFilter)}
          className="text-xs rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
        >
          {DATE_FILTERS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Feed (scrollable) */}
      <div className="rounded-lg border border-slate-100 bg-slate-50/40 max-h-[440px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-500">
            No events match these filters.
          </p>
        ) : (
          <ol className="divide-y divide-slate-100">
            {filtered.map((log) => {
              const meta = ACTION_META[log.action] ?? {
                dot: "bg-slate-400",
                label: log.action,
                type: "all" as TypeFilter,
              };
              return (
                <li
                  key={log.id}
                  className="flex items-start gap-3 px-4 py-2.5 hover:bg-white transition-colors"
                >
                  <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${meta.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm text-slate-800 font-medium truncate">
                        {meta.label}
                      </span>
                      <time
                        className="text-[11px] text-slate-500 tabular-nums shrink-0"
                        dateTime={log.createdAt}
                        suppressHydrationWarning
                      >
                        {formatTimestamp(log.createdAt)}
                      </time>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate">
                      by {log.user?.name ?? log.user?.email ?? "system"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        {filtered.length} of {logs.length} event{logs.length !== 1 ? "s" : ""}
        {logs.length === 100 ? " (most recent 100 shown)" : ""}
      </p>
    </div>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
