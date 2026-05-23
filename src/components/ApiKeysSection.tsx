"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export function ApiKeysSection({
  projectId,
  apiKeys,
}: {
  projectId: string;
  apiKeys: ApiKeyInfo[];
}) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Default" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate key");
        return;
      }
      setRevealedKey(data.rawKey);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    if (!confirm("Revoke this API key? Any clients using it will stop working immediately.")) return;
    setRevoking(keyId);
    setError("");
    try {
      const res = await fetch(
        `/api/projects/${projectId}/api-keys/${keyId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to revoke key");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setRevoking(null);
    }
  }

  async function handleCopy() {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      {/* One-time key reveal panel */}
      {revealedKey && (
        <div className="mb-5 rounded-lg border border-l-4 border-slate-200 border-l-amber-500 bg-white p-3">
          <div className="flex items-start gap-2 mb-2">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-slate-900">
                Save this key — it won&rsquo;t be shown again
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                Store it in your secrets manager or environment variables.
              </p>
            </div>
          </div>
          <div className="flex items-stretch gap-2">
            <code className="min-w-0 flex-1 break-all rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-mono text-slate-700">
              {revealedKey}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-md bg-indigo-600 px-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => setRevealedKey(null)}
            className="mt-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Key list */}
      {apiKeys.length === 0 && !revealedKey ? (
        <div className="mb-5 flex flex-col items-center py-8 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-800">No API keys yet</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 max-w-52">
            Generate a key to authenticate requests to the flag evaluation API.
          </p>
        </div>
      ) : apiKeys.length > 0 ? (
        <ul className="divide-y divide-slate-100 mb-5">
          {apiKeys.map((key) => (
            <li key={key.id} className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {/* Key icon avatar */}
                <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                  <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{key.name}</p>
                  <p className="mt-0.5 text-xs font-mono text-slate-600">
                    {key.keyPrefix}
                    <span className="text-slate-400">••••••••</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-xs text-slate-500">
                  {key.lastUsedAt
                    ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                    : "Never used"}
                </span>
                <button
                  onClick={() => handleRevoke(key.id)}
                  disabled={revoking === key.id}
                  className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
                >
                  {revoking === key.id ? "Revoking…" : "Revoke"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {generating ? "Generating…" : "Generate API key"}
      </button>
    </div>
  );
}
