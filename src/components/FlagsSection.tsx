"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

interface TargetingRule {
  id: string;
  attribute: string;
  operator: string;
  value: string;
}

interface FlagEnvRow {
  id: string;
  enabled: boolean;
  rolloutPercentage: number;
  rules: TargetingRule[];
  flag: {
    id: string;
    name: string;
    key: string;
    description: string | null;
  };
}

interface Environment {
  id: string;
  name: string;
  slug: string;
  flagEnvironments: FlagEnvRow[];
}

interface Props {
  projectId: string;
  environments: Environment[];
}

const ENV_TAB_COLORS: Record<string, string> = {
  development: "text-blue-600 border-blue-500",
  dev:         "text-blue-600 border-blue-500",
  staging:     "text-amber-600 border-amber-500",
  production:  "text-emerald-600 border-emerald-500",
  prod:        "text-emerald-600 border-emerald-500",
};

const OPERATOR_LABELS: Record<string, string> = {
  equals: "=",
  not_equals: "≠",
  contains: "contains",
};

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-indigo-600" : "bg-slate-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ─── Compact pipeline summary ──────────────────────────────────────────────
// Visualizes the evaluation pipeline at a glance: Switch → Audience → Rollout → Result.
function PipelineSummary({
  enabled,
  rules,
  rolloutPercentage,
}: {
  enabled: boolean;
  rules: TargetingRule[];
  rolloutPercentage: number;
}) {
  const hasRules = rules.length > 0;
  const audienceWho = hasRules ? "matched users" : "all users";

  // Net result of switch + audience + rollout.
  const liveForSomeone = enabled && rolloutPercentage > 0;
  const resultText = !liveForSomeone
    ? "Old flow for everyone"
    : rolloutPercentage === 100
    ? `New flow for ${audienceWho}`
    : `New flow for ${rolloutPercentage}% of ${audienceWho}`;

  const chipBase =
    "rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ring-1";
  const arrowClass = "text-slate-400 text-xs";
  const dim = !enabled ? "opacity-70" : "";

  return (
    <div className={`flex items-center gap-2 flex-wrap ${dim}`}>
      {/* Master switch */}
      <span
        className={`${chipBase} ${
          enabled
            ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
            : "bg-slate-100 text-slate-600 ring-slate-200"
        }`}
      >
        {enabled ? "ON" : "OFF"}
      </span>
      <span className={arrowClass}>→</span>

      {/* Audience */}
      {hasRules ? (
        rules.map((r) => (
          <span
            key={r.id}
            className={`${chipBase} bg-violet-50 text-violet-800 ring-violet-200 font-mono`}
          >
            {r.attribute} {OPERATOR_LABELS[r.operator] ?? r.operator} {r.value}
          </span>
        ))
      ) : (
        <span className={`${chipBase} bg-violet-50 text-violet-800 ring-violet-200`}>
          Everyone
        </span>
      )}
      <span className={arrowClass}>→</span>

      {/* Rollout (with mini progress bar) */}
      <span
        className={`${chipBase} bg-slate-100 text-slate-700 ring-slate-200 inline-flex items-center gap-1.5`}
      >
        {rolloutPercentage}%
        <span className="h-1.5 w-10 rounded-full bg-slate-300/70 overflow-hidden">
          <span
            className={`block h-full rounded-full ${
              rolloutPercentage === 100
                ? "bg-emerald-500"
                : rolloutPercentage > 0
                ? "bg-indigo-500"
                : "bg-slate-400"
            }`}
            style={{ width: `${rolloutPercentage}%` }}
          />
        </span>
      </span>
      <span className={arrowClass}>→</span>

      {/* Result */}
      <span
        className={`${chipBase} ${
          liveForSomeone
            ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
            : "bg-slate-100 text-slate-600 ring-slate-200"
        }`}
      >
        {resultText}
      </span>
    </div>
  );
}

// ─── Audience configuration (mode picker + rule editor) ────────────────────
function AudienceConfig({
  projectId,
  flagEnvId,
  rules,
  disabled,
}: {
  projectId: string;
  flagEnvId: string;
  rules: TargetingRule[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [attribute, setAttribute] = useState("role");
  const [operator, setOperator] = useState("equals");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);

  const isSpecific = rules.length > 0;

  async function addRule(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/flag-environments/${flagEnvId}/rules`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attribute, operator, value }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to add rule");
        return;
      }
      setValue("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteRule(ruleId: string) {
    await fetch(
      `/api/projects/${projectId}/flag-environments/${flagEnvId}/rules/${ruleId}`,
      { method: "DELETE" }
    );
    router.refresh();
  }

  async function switchToEveryone() {
    setBusy(true);
    try {
      await Promise.all(
        rules.map((r) =>
          fetch(
            `/api/projects/${projectId}/flag-environments/${flagEnvId}/rules/${r.id}`,
            { method: "DELETE" }
          )
        )
      );
      setConfirmingClear(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        Audience
      </p>

      {/* Mode picker */}
      <div className="grid grid-cols-2 gap-2">
        <ModeOption
          selected={!isSpecific}
          disabled={disabled || busy}
          title="Everyone"
          subtitle="All users are eligible"
          onClick={() => {
            if (isSpecific) setConfirmingClear(true);
          }}
        />
        <ModeOption
          selected={isSpecific}
          disabled={disabled || busy}
          title="Specific roles"
          subtitle="Only users matching a role rule"
          onClick={() => {
            // No-op: switching to "Specific" happens by adding the first rule below
          }}
        />
      </div>

      {/* Confirmation when clearing all rules */}
      {confirmingClear && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center justify-between gap-2 flex-wrap">
          <span>
            Remove {rules.length} role rule{rules.length === 1 ? "" : "s"} and target every user?
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmingClear(false)}
              disabled={busy}
              className="text-amber-700 hover:text-amber-900 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={switchToEveryone}
              disabled={busy}
              className="rounded bg-amber-600 text-white px-2 py-0.5 font-medium hover:bg-amber-500 disabled:opacity-50"
            >
              {busy ? "Removing…" : "Remove rules"}
            </button>
          </div>
        </div>
      )}

      {/* Rule list — only shown for Specific mode (or when no rules but user is configuring) */}
      {isSpecific && (
        <ul className="space-y-1.5">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="font-mono bg-slate-900/5 border border-slate-200 rounded px-2 py-1 text-slate-800">
                <span className="text-slate-700">{r.attribute}</span>{" "}
                <span className="text-slate-500 font-normal">
                  {OPERATOR_LABELS[r.operator] ?? r.operator}
                </span>{" "}
                <span className="text-indigo-700 font-semibold">{r.value}</span>
              </span>
              <button
                onClick={() => deleteRule(r.id)}
                disabled={disabled || busy}
                className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                title="Remove rule"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add rule form — shown when in (or moving into) Specific mode. We show the
          editor whenever there are rules already, OR the user is on a flag with no
          rules — picking "Specific" means adding the first one here. */}
      <form onSubmit={addRule} className="flex items-center gap-2 flex-wrap">
        <select
          value={attribute}
          onChange={(e) => setAttribute(e.target.value)}
          disabled={disabled || busy}
          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 disabled:opacity-50"
        >
          <option value="role">role</option>
          <option value="email">email</option>
        </select>
        <select
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
          disabled={disabled || busy}
          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 disabled:opacity-50"
        >
          <option value="equals">equals</option>
          <option value="not_equals">not equals</option>
          <option value="contains">contains</option>
        </select>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="beta_tester"
          disabled={disabled || busy}
          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs w-32 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || busy || !value.trim()}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
        >
          {busy ? "Adding…" : isSpecific ? "+ Add role rule" : "+ Switch to specific roles"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </form>
    </div>
  );
}

function ModeOption({
  selected,
  disabled,
  title,
  subtitle,
  onClick,
}: {
  selected: boolean;
  disabled: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`text-left rounded-lg border px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        selected
          ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-200"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            selected ? "border-indigo-600" : "border-slate-300"
          }`}
        >
          {selected && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />}
        </span>
        <span className={`text-xs font-semibold ${selected ? "text-indigo-900" : "text-slate-800"}`}>
          {title}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-slate-600 leading-snug">{subtitle}</p>
    </button>
  );
}

export function FlagsSection({ projectId, environments }: Props) {
  const router = useRouter();
  const [activeEnvId, setActiveEnvId] = useState(environments[0]?.id ?? "");
  const [pendingRollout, setPendingRollout] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const activeEnv = environments.find((e) => e.id === activeEnvId);
  const totalFlags = environments[0]?.flagEnvironments.length ?? 0;

  async function patchFlagEnv(
    flagEnvId: string,
    payload: { enabled?: boolean; rolloutPercentage?: number }
  ) {
    setSaving((s) => ({ ...s, [flagEnvId]: true }));
    setErrors((e) => ({ ...e, [flagEnvId]: "" }));
    try {
      const res = await fetch(
        `/api/projects/${projectId}/flag-environments/${flagEnvId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setErrors((e) => ({ ...e, [flagEnvId]: data.error ?? "Update failed" }));
        return;
      }
      if (payload.rolloutPercentage !== undefined) {
        setPendingRollout((p) => {
          const next = { ...p };
          delete next[flagEnvId];
          return next;
        });
      }
      router.refresh();
    } catch {
      setErrors((e) => ({ ...e, [flagEnvId]: "Network error" }));
    } finally {
      setSaving((s) => ({ ...s, [flagEnvId]: false }));
    }
  }

  if (environments.length === 0) {
    return <p className="text-sm text-slate-500">No environments found.</p>;
  }

  return (
    <div>
      {/* Environment tabs */}
      <div className="flex border-b border-slate-200 mb-5">
        {environments.map((env) => {
          const isActive = env.id === activeEnvId;
          const colorCls = ENV_TAB_COLORS[env.slug] ?? "text-slate-700 border-slate-500";
          return (
            <button
              key={env.id}
              onClick={() => setActiveEnvId(env.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? colorCls
                  : "text-slate-500 border-transparent hover:text-slate-700"
              }`}
            >
              {env.name}
            </button>
          );
        })}
      </div>

      {/* Flag list */}
      {!activeEnv || activeEnv.flagEnvironments.length === 0 ? (
        totalFlags === 0 ? (
          <EmptyState
            title="No feature flags"
            description="Create your first flag to start controlling feature rollouts across environments."
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
              </svg>
            }
            action={
              <Link
                href={`/projects/${projectId}/flags/new`}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
              >
                Create first flag
              </Link>
            }
          />
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">No flags in this environment.</p>
        )
      ) : (
        <ul className="-mx-2 space-y-1">
          {activeEnv.flagEnvironments.map((row) => {
            const isSaving = saving[row.id] ?? false;
            const rolloutValue = pendingRollout[row.id] ?? row.rolloutPercentage;
            const hasPendingRollout =
              pendingRollout[row.id] !== undefined &&
              pendingRollout[row.id] !== row.rolloutPercentage;
            const rowError = errors[row.id];
            const isOpen = expanded[row.id] ?? false;
            const hasRules = row.rules.length > 0;
            const rolloutTarget = hasRules ? "matched users" : "all users";

            return (
              <li
                key={row.id}
                className="border border-transparent hover:border-slate-200 hover:bg-slate-50/40 rounded-lg transition-colors px-3 py-3"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          row.enabled ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                      <span className="text-sm font-semibold text-slate-900">
                        {row.flag.name}
                      </span>
                      <code className="text-xs font-mono text-slate-700 bg-slate-100 ring-1 ring-slate-200 rounded px-1.5 py-0.5">
                        {row.flag.key}
                      </code>
                    </div>
                    {row.flag.description && (
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 ml-4">
                        {row.flag.description}
                      </p>
                    )}
                    {/* Pipeline summary */}
                    <div className="mt-2 ml-4">
                      <PipelineSummary
                        enabled={row.enabled}
                        rules={row.rules}
                        rolloutPercentage={row.rolloutPercentage}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`min-w-9 text-center text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ${
                        row.enabled
                          ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                          : "bg-slate-100 text-slate-600 ring-slate-200"
                      }`}
                    >
                      {row.enabled ? "On" : "Off"}
                    </span>
                    <Toggle
                      checked={row.enabled}
                      disabled={isSaving}
                      onChange={() => patchFlagEnv(row.id, { enabled: !row.enabled })}
                    />
                    <button
                      onClick={() =>
                        setExpanded((s) => ({ ...s, [row.id]: !s[row.id] }))
                      }
                      className="text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors px-1.5 py-0.5"
                    >
                      Configure {isOpen ? "▲" : "▼"}
                    </button>
                  </div>
                </div>

                {rowError && (
                  <p className="mt-2 text-xs text-red-600">{rowError}</p>
                )}

                {/* Expanded panel */}
                {isOpen && (
                  <div className="mt-4 pl-4 border-l-2 border-indigo-200 space-y-5">
                    {/* OFF notice — visible but not blocking */}
                    {!row.enabled && (
                      <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600 flex items-center gap-2">
                        <span className="text-slate-500">ⓘ</span>
                        <span>
                          The flag is off. These settings will apply when the flag is enabled.
                        </span>
                      </div>
                    )}

                    {/* Audience */}
                    <AudienceConfig
                      projectId={projectId}
                      flagEnvId={row.id}
                      rules={row.rules}
                      disabled={!row.enabled}
                    />

                    {/* Rollout */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                        Rollout
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={rolloutValue}
                            onChange={(e) => {
                              const val = Math.min(100, Math.max(0, Number(e.target.value)));
                              setPendingRollout((p) => ({ ...p, [row.id]: val }));
                            }}
                            disabled={isSaving || !row.enabled}
                            aria-label="Rollout percentage"
                            className="w-14 rounded border border-slate-200 px-2 py-1 text-sm text-center font-mono text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <span className="text-sm text-slate-500">%</span>
                        </div>
                        <span className="text-xs text-slate-600">
                          Rollout:{" "}
                          <span className="font-semibold text-slate-800">{rolloutValue}%</span>{" "}
                          of <span className="font-semibold text-slate-800">{rolloutTarget}</span>
                        </span>
                        {hasPendingRollout && (
                          <button
                            onClick={() =>
                              patchFlagEnv(row.id, { rolloutPercentage: rolloutValue })
                            }
                            disabled={isSaving}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
                          >
                            Save
                          </button>
                        )}
                      </div>
                      <div className="h-1 w-full max-w-xs rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            rolloutValue === 100
                              ? "bg-emerald-400"
                              : rolloutValue > 0
                              ? "bg-indigo-400"
                              : "bg-slate-200"
                          } ${!row.enabled ? "opacity-50" : ""}`}
                          style={{ width: `${rolloutValue}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
