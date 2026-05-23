"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { slugifyFlagKey } from "@/lib/utils";
import { FLAG_KEY_REGEX } from "@/lib/constants";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

export default function NewFlagPage() {
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();

  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const keyInvalid = key.length > 0 && !FLAG_KEY_REGEX.test(key);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (keyInvalid) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/flags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, key, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create flag");
        return;
      }
      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to project
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">Create feature flag</h1>
        <p className="mt-1 text-sm text-slate-600">
          The flag will be created in all environments, disabled by default.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-950">Flag details</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            The flag key is referenced by the SDK and evaluation API — it cannot be changed later.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <Input
            id="name"
            label="Flag name"
            type="text"
            required
            value={name}
            onChange={(e) => {
              const next = e.target.value;
              setName(next);
              if (!keyTouched) setKey(slugifyFlagKey(next));
            }}
            placeholder="New Checkout Flow"
          />

          <Input
            id="key"
            label="Flag key"
            type="text"
            required
            value={key}
            onChange={(e) => {
              setKey(e.target.value.toLowerCase());
              setKeyTouched(true);
            }}
            placeholder="new_checkout_flow"
            error={keyInvalid ? "Only lowercase letters, numbers, and underscores allowed." : undefined}
            helperText={!keyInvalid ? "Used in the evaluation API. Cannot be changed after creation." : undefined}
            className="font-mono"
          />

          <Textarea
            id="description"
            label="Description"
            optional
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this flag control?"
          />

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-5">
            <Link
              href={`/projects/${projectId}`}
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !name.trim() || !key.trim() || keyInvalid}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating…" : "Create flag"}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-xs text-slate-600">
        <span className="mt-0.5 text-slate-500">ⓘ</span>
        <span>
          The flag will be created in every environment with rollout set to 0%. Enable it per environment from the project page.
        </span>
      </div>
    </div>
  );
}
