"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { slugify } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, key, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create project");
        return;
      }
      router.push(`/projects/${data.id}`);
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
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Projects
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">Create project</h1>
        <p className="mt-1 text-sm text-slate-600">
          A project groups your feature flags and environments together.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-950">Project details</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Choose a clear name and a stable key — the key is referenced by the evaluation API.
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
            label="Project name"
            type="text"
            required
            value={name}
            onChange={(e) => {
              const next = e.target.value;
              setName(next);
              if (!keyTouched) setKey(slugify(next));
            }}
            placeholder="My App"
          />

          <Input
            id="key"
            label="Project key"
            type="text"
            required
            value={key}
            onChange={(e) => {
              setKey(e.target.value.toLowerCase());
              setKeyTouched(true);
            }}
            placeholder="my-app"
            helperText="Lowercase letters, numbers, and hyphens only. Used in the evaluation API."
            className="font-mono"
          />

          <Textarea
            id="description"
            label="Description"
            optional
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project for?"
          />

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-5">
            <Link
              href="/dashboard"
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !name.trim() || !key.trim()}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-xs text-slate-600">
        <span className="mt-0.5 text-slate-500">ⓘ</span>
        <span>
          Three environments are created automatically: <span className="font-medium text-slate-700">Development</span>,{" "}
          <span className="font-medium text-slate-700">Staging</span>, and{" "}
          <span className="font-medium text-slate-700">Production</span>.
        </span>
      </div>
    </div>
  );
}
