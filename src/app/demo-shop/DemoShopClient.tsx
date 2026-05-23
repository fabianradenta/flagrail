"use client";

import { useEffect, useState, useTransition } from "react";
import { evaluateDemoFlag } from "./actions";
import { Logo } from "@/components/Logo";
import type { EvaluationResult, EvaluationReason } from "@/lib/evaluate";

const PROJECT_KEY = "flagrail-demo";
const FLAG_KEY = "new_checkout_flow";

interface DemoUser {
  id: string;
  label: string;
  email: string;
  role?: string;
  description: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    id: "demo-regular-001",
    label: "Regular User",
    email: "regular@example.com",
    description: "No role attribute — excluded by audience rules.",
  },
  {
    id: "demo-beta-001",
    label: "Beta Tester",
    email: "beta@example.com",
    role: "beta_tester",
    description: "role=beta_tester — matches a targeting rule.",
  },
  {
    id: "demo-admin-001",
    label: "Admin",
    email: "admin@example.com",
    role: "admin",
    description: "role=admin — matches a targeting rule.",
  },
];

const ENVIRONMENTS = [
  { slug: "development", label: "Development" },
  { slug: "staging", label: "Staging" },
  { slug: "production", label: "Production" },
] as const;
type EnvSlug = (typeof ENVIRONMENTS)[number]["slug"];

const REASON_META: Record<
  EvaluationReason,
  { label: string; detail: string; tone: "good" | "bad" | "warn" | "neutral" | "error" }
> = {
  flag_disabled: {
    label: "Flag disabled",
    detail: "The master switch is off in this environment — every user sees the old flow regardless of rules or rollout.",
    tone: "neutral",
  },
  excluded_by_targeting_rules: {
    label: "Outside audience",
    detail: "Audience rules are defined and this user matched none of them — only matching users are eligible.",
    tone: "bad",
  },
  excluded_by_rollout: {
    label: "Outside rollout",
    detail: "User is in the eligible audience but the deterministic bucket is above the rollout threshold.",
    tone: "warn",
  },
  enabled_by_rollout: {
    label: "Included by rollout",
    detail: "User is in the eligible audience and the deterministic bucket fell within the rollout threshold.",
    tone: "good",
  },
  enabled_for_targeted_user: {
    label: "Targeted user",
    detail: "User matched an audience rule and rollout is 100% — every matched user receives the feature.",
    tone: "good",
  },
  enabled_for_all_users: {
    label: "All users",
    detail: "No audience rules and rollout is 100% — every user receives the feature.",
    tone: "good",
  },
  flag_not_found: {
    label: "Setup required",
    detail: "Flag 'new_checkout_flow' not found. Run: npm run db:seed",
    tone: "error",
  },
  environment_not_found: {
    label: "Setup required",
    detail: "Environment not found. Run: npm run db:seed",
    tone: "error",
  },
};

const TONE_BADGE: Record<string, string> = {
  good: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  bad: "bg-red-50 text-red-700 ring-1 ring-red-200",
  warn: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  neutral: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  error: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

export function DemoShopClient({
  initialResult,
}: {
  initialResult: EvaluationResult;
}) {
  const [environment, setEnvironment] = useState<EnvSlug>("production");
  const [selectedUser, setSelectedUser] = useState<DemoUser>(DEMO_USERS[0]);
  const [evalResult, setEvalResult] = useState<EvaluationResult>(initialResult);
  const [lastEvaluatedAt, setLastEvaluatedAt] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function runEvaluation(env: EnvSlug, user: DemoUser) {
    startTransition(async () => {
      const data = await evaluateDemoFlag({
        environmentSlug: env,
        user: { id: user.id, email: user.email, role: user.role },
      });
      setEvalResult(data);
      setLastEvaluatedAt(new Date());
    });
  }

  function handleSelectUser(user: DemoUser) {
    if (isPending || user.id === selectedUser.id) return;
    setSelectedUser(user);
    runEvaluation(environment, user);
  }

  function handleSelectEnvironment(env: EnvSlug) {
    if (isPending || env === environment) return;
    setEnvironment(env);
    runEvaluation(env, selectedUser);
  }

  function handleReEvaluate() {
    if (isPending) return;
    runEvaluation(environment, selectedUser);
  }

  async function copyResponse() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(evalResult, null, 2));
      setCopied(true);
    } catch {
      // ignore clipboard failures
    }
  }
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);

  const meta = REASON_META[evalResult.reason];
  const isEnabled = evalResult.enabled;
  const details = evalResult.details;
  const matchedRule = details?.matchedRules[0];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-500">Demo Shop</span>
          </div>
          <a
            href="/login"
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            Dashboard &rarr;
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Page header */}
        <section>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Demo Shop</h1>
          <p className="mt-1 text-sm text-slate-600">
            A sample client application controlled by Flagrail&apos;s evaluation API.
          </p>
          <p className="mt-3 max-w-3xl text-sm text-slate-600 leading-relaxed">
            This page simulates an application consuming Flagrail&apos;s evaluation API.
            Toggle the{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700">
              new_checkout_flow
            </code>{" "}
            flag in Flagrail to change the checkout experience without redeploying this demo app.
          </p>
        </section>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Left: checkout simulation */}
          <div className="lg:col-span-3 space-y-4">
            <CheckoutHeader
              isEnabled={isEnabled}
              isPending={isPending}
              reasonLabel={meta.label}
              tone={meta.tone}
            />

            <CartCard />

            {isEnabled ? <NewCheckoutFlow /> : <OldCheckoutFlow />}

            {/* Why-this-flow explainer */}
            <div
              className={`rounded-2xl border p-4 text-sm leading-relaxed shadow-sm ${
                isEnabled
                  ? "border-emerald-200 bg-emerald-50/60 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <p>
                {isEnabled
                  ? "The feature flag is enabled for this user, so the new checkout flow is shown."
                  : "The feature flag is disabled for this user, so the old checkout flow is shown."}
              </p>
            </div>
          </div>

          {/* Right: control + evaluation + JSON */}
          <div className="lg:col-span-2">
            <div className="sticky top-6 space-y-4">
              <ControlPanel
                environment={environment}
                onEnvironmentChange={handleSelectEnvironment}
                selectedUser={selectedUser}
                onUserChange={handleSelectUser}
                isPending={isPending}
                onReEvaluate={handleReEvaluate}
                lastEvaluatedAt={lastEvaluatedAt}
              />

              <EvaluationBreakdown
                environment={environment}
                selectedUser={selectedUser}
                evalResult={evalResult}
                matchedRule={matchedRule}
                reasonMeta={meta}
                isPending={isPending}
              />

              <ApiResponsePanel
                evalResult={evalResult}
                copied={copied}
                onCopy={copyResponse}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Left column ──────────────────────────────────────────────────────────

function CheckoutHeader({
  isEnabled,
  isPending,
  reasonLabel,
  tone,
}: {
  isEnabled: boolean;
  isPending: boolean;
  reasonLabel: string;
  tone: "good" | "bad" | "warn" | "neutral" | "error";
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
          Active flow
        </p>
        <p className="mt-0.5 text-base font-semibold text-slate-900">
          {isEnabled ? "New Checkout Flow" : "Old Checkout Flow"}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isPending && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
            Evaluating…
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            isEnabled
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isEnabled ? "bg-emerald-500" : "bg-slate-400"
            }`}
          />
          {isEnabled ? "New checkout" : "Old checkout"}
        </span>
        <span
          className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${TONE_BADGE[tone]}`}
        >
          {reasonLabel}
        </span>
      </div>
    </div>
  );
}

function CartCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <h2 className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-4">
        Your Cart
      </h2>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center shrink-0 text-slate-400 text-xs font-mono">
          IMG
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm">Wireless Headphones Pro</p>
          <p className="text-xs text-slate-500 mt-0.5">Black — Qty: 1</p>
        </div>
        <p className="font-semibold text-slate-900 text-sm tabular-nums">$149.00</p>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-sm">
        <span className="text-slate-500">Total</span>
        <span className="font-bold text-slate-900 tabular-nums">$149.00</span>
      </div>
    </div>
  );
}

function OldCheckoutFlow() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Checkout</h2>
        <span className="text-[11px] bg-slate-200 text-slate-700 rounded-full px-2.5 py-0.5 font-medium">
          Legacy flow
        </span>
      </div>

      {/* Multi-step indicator */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-2 text-xs text-slate-500">
        {[
          { n: 1, label: "Shipping", active: true },
          { n: 2, label: "Payment", active: false },
          { n: 3, label: "Review", active: false },
        ].map((step, i) => (
          <div key={step.n} className="flex items-center gap-2">
            {i > 0 && <span className="h-px w-6 bg-slate-200" />}
            <div className="flex items-center gap-1.5">
              <span
                className={`h-5 w-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                  step.active
                    ? "bg-slate-700 text-white"
                    : "bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                }`}
              >
                {step.n}
              </span>
              <span className={step.active ? "text-slate-700 font-medium" : ""}>
                {step.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-4 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
          Step 1 — Shipping address
        </p>
        <div className="grid grid-cols-2 gap-3">
          <DemoField label="First name" value="Jane" />
          <DemoField label="Last name" value="Doe" />
        </div>
        <DemoField label="Address line 1" value="123 Main Street" />
        <div className="grid grid-cols-2 gap-3">
          <DemoField label="City" value="San Francisco" />
          <DemoField label="ZIP" value="94105" />
        </div>
        <div className="pt-2 flex items-center justify-between">
          <button className="text-xs text-slate-400 hover:text-slate-600">
            ← Back to cart
          </button>
          <button className="rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium px-4 py-2 text-sm transition-colors">
            Continue to Payment →
          </button>
        </div>
      </div>
    </div>
  );
}

function NewCheckoutFlow() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 to-violet-50/40 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Checkout</h2>
        <span className="inline-flex items-center gap-1.5 text-[11px] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 rounded-full px-2.5 py-0.5 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          New checkout enabled
        </span>
      </div>

      <div className="px-5 py-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Card number
          </label>
          <input
            readOnly
            value="4242 4242 4242 4242"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-slate-50 text-slate-500 cursor-not-allowed font-mono"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Expiry
            </label>
            <input
              readOnly
              value="12 / 28"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-slate-50 text-slate-500 cursor-not-allowed font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              CVV
            </label>
            <input
              readOnly
              value="•••"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-slate-50 text-slate-500 cursor-not-allowed font-mono"
            />
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-600 flex items-center justify-between">
          <span>Ships to 123 Main Street, San Francisco</span>
          <button className="text-indigo-600 hover:text-indigo-700 font-medium">
            Change
          </button>
        </div>
        <button className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-3 text-sm transition-colors shadow-sm">
          Pay $149.00 →
        </button>
      </div>
    </div>
  );
}

function DemoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-600 mb-1">
        {label}
      </label>
      <input
        readOnly
        value={value}
        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs bg-slate-50 text-slate-500 cursor-not-allowed"
      />
    </div>
  );
}

// ─── Right column ─────────────────────────────────────────────────────────

function ControlPanel({
  environment,
  onEnvironmentChange,
  selectedUser,
  onUserChange,
  isPending,
  onReEvaluate,
  lastEvaluatedAt,
}: {
  environment: EnvSlug;
  onEnvironmentChange: (env: EnvSlug) => void;
  selectedUser: DemoUser;
  onUserChange: (user: DemoUser) => void;
  isPending: boolean;
  onReEvaluate: () => void;
  lastEvaluatedAt: Date | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Evaluation controls</h3>
        <button
          onClick={onReEvaluate}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed px-2.5 py-1 text-xs font-semibold text-white transition-colors"
        >
          <svg
            className={`h-3 w-3 ${isPending ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9M20 20v-5h-.581m-15.357-2a8.003 8.003 0 0015.357 2"
            />
          </svg>
          Re-evaluate
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Environment selector */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-2">
            Environment
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {ENVIRONMENTS.map((env) => {
              const active = env.slug === environment;
              return (
                <button
                  key={env.slug}
                  onClick={() => onEnvironmentChange(env.slug)}
                  disabled={isPending}
                  className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {env.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* User selector */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-2">
            Simulated user
          </label>
          <div className="space-y-1.5">
            {DEMO_USERS.map((user) => {
              const active = user.id === selectedUser.id;
              return (
                <button
                  key={user.id}
                  onClick={() => onUserChange(user)}
                  disabled={isPending}
                  className={`w-full text-left rounded-lg border px-3 py-2 transition-colors disabled:opacity-60 ${
                    active
                      ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-200"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        active ? "text-indigo-900" : "text-slate-700"
                      }`}
                    >
                      {user.label}
                    </span>
                    {user.role ? (
                      <span className="text-[11px] font-mono text-violet-700 bg-violet-50 ring-1 ring-violet-200 rounded px-1.5 py-0.5">
                        role: {user.role}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">no role</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
                    {user.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* User fields preview */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 space-y-1 text-[11px]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
            User context sent to API
          </p>
          <FieldRow k="id" v={selectedUser.id} />
          <FieldRow k="email" v={selectedUser.email} />
          <FieldRow k="role" v={selectedUser.role ?? "—"} />
        </div>

        {lastEvaluatedAt && (
          <p
            className="text-[11px] text-slate-500 tabular-nums"
            suppressHydrationWarning
          >
            Last evaluated at {lastEvaluatedAt.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}

function FieldRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 font-mono">
      <span className="text-slate-500">{k}</span>
      <span className="text-slate-800 truncate">{v}</span>
    </div>
  );
}

function EvaluationBreakdown({
  environment,
  selectedUser,
  evalResult,
  matchedRule,
  reasonMeta,
  isPending,
}: {
  environment: EnvSlug;
  selectedUser: DemoUser;
  evalResult: EvaluationResult;
  matchedRule: { attribute: string; operator: string; value: string } | undefined;
  reasonMeta: { label: string; detail: string; tone: "good" | "bad" | "warn" | "neutral" | "error" };
  isPending: boolean;
}) {
  const details = evalResult.details;
  const isEnabled = evalResult.enabled;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900">Evaluation breakdown</h3>
        <p className="mt-0.5 text-[11px] text-slate-600">
          How Flagrail arrived at this result.
        </p>
      </div>

      <div
        className={`divide-y divide-slate-100 transition-opacity ${
          isPending ? "opacity-60" : ""
        }`}
      >
        <DetailGroup label="Request">
          <DetailRow label="project" value={PROJECT_KEY} mono />
          <DetailRow label="environment" value={environment} mono />
          <DetailRow label="flag" value={FLAG_KEY} mono />
          <DetailRow label="user.role" value={selectedUser.role ?? "—"} mono />
        </DetailGroup>

        <DetailGroup label="Audience">
          <DetailRow
            label="mode"
            value={
              details?.audienceMode === "roles"
                ? "Specific roles"
                : details?.audienceMode === "everyone"
                ? "Everyone"
                : "—"
            }
          />
          <DetailRow
            label="matched"
            value={
              details?.audienceMatched === undefined
                ? "—"
                : details.audienceMatched
                ? "yes"
                : "no"
            }
            tone={
              details?.audienceMatched === true
                ? "good"
                : details?.audienceMatched === false
                ? "bad"
                : undefined
            }
          />
          <DetailRow
            label="matched rule"
            value={
              matchedRule
                ? `${matchedRule.attribute} ${operatorSymbol(matchedRule.operator)} ${matchedRule.value}`
                : "—"
            }
            mono
          />
        </DetailGroup>

        <DetailGroup label="Rollout">
          <DetailRow
            label="rollout %"
            value={details ? `${details.rolloutPercentage}%` : "—"}
            tone="warn"
            mono
          />
          <DetailRow
            label="user bucket"
            value={details ? `${details.userBucket} / 100` : "—"}
            tone="warn"
            mono
          />
          <DetailRow
            label="in rollout"
            value={
              details?.isInRollout === undefined
                ? "—"
                : details.isInRollout
                ? "yes"
                : "no"
            }
            tone={
              details?.isInRollout === true
                ? "good"
                : details?.isInRollout === false
                ? "bad"
                : undefined
            }
          />
        </DetailGroup>
      </div>

      {/* Final result */}
      <div
        className={`px-5 py-4 border-t border-slate-100 ${
          isEnabled ? "bg-emerald-50/60" : reasonMeta.tone === "error" ? "bg-red-50/60" : "bg-slate-50/60"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Result
          </span>
          <span
            className={`inline-flex items-center gap-1 text-sm font-bold ${
              isEnabled
                ? "text-emerald-700"
                : reasonMeta.tone === "error"
                ? "text-red-700"
                : "text-slate-600"
            }`}
          >
            {isEnabled ? "✓ enabled" : "✗ disabled"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_BADGE[reasonMeta.tone]}`}
          >
            {reasonMeta.label}
          </span>
          <code className="text-[11px] text-slate-500 font-mono truncate">
            {evalResult.reason}
          </code>
        </div>
        <p className="mt-2 text-xs text-slate-600 leading-relaxed">{reasonMeta.detail}</p>
      </div>
    </div>
  );
}

function DetailGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-2">
        {label}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "good" | "bad" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-700"
      : tone === "bad"
      ? "text-red-700"
      : tone === "warn"
      ? "text-amber-700"
      : "text-slate-800";
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span
        className={`text-xs truncate text-right ${mono ? "font-mono" : ""} ${toneClass}`}
      >
        {value}
      </span>
    </div>
  );
}

function ApiResponsePanel({
  evalResult,
  copied,
  onCopy,
}: {
  evalResult: EvaluationResult;
  copied: boolean;
  onCopy: () => void;
}) {
  const json = JSON.stringify(evalResult, null, 2);
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500">POST</span>
          <span className="text-[11px] font-mono text-slate-300">/api/v1/evaluate</span>
        </div>
        <button
          onClick={onCopy}
          className="text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors px-2 py-0.5 rounded border border-slate-700 hover:border-slate-600"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre className="px-4 py-3 text-slate-200 text-xs overflow-x-auto leading-relaxed font-mono">
        {json}
      </pre>
    </div>
  );
}

function operatorSymbol(op: string): string {
  if (op === "equals") return "=";
  if (op === "not_equals") return "≠";
  return op;
}
