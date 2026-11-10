"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { ArrowLeft, LifeBuoy, Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";
import { SITE_URL, SITE_HOST } from "@/lib/site";
import { getSiteWidget, updateSiteWidget, type SiteWidget } from "@/lib/siteWidget";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800";

export default function SupportWidgetPage() {
  const [cfg, setCfg] = useState<SiteWidget | undefined>();
  const [enabled, setEnabled] = useState(false);
  const [snippet, setSnippet] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const hydrate = (c: SiteWidget) => {
    setCfg(c);
    setEnabled(c.enabled);
    setSnippet(c.snippet);
  };

  useEffect(() => {
    getSiteWidget()
      .then(hydrate)
      .catch((e: any) => {
        if (e?.response?.status === 403) setForbidden(true);
        else toast.error("Failed to load the support widget settings");
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      hydrate(await updateSiteWidget({ enabled, snippet: snippet.trim() }));
      toast.success("Saved — the site picks it up within ~2 minutes");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        <div className="flex items-center gap-2 font-medium">
          <ShieldAlert size={18} /> Platform admin only
        </div>
        <p className="mt-2 text-sm">This area is for the platform operator.</p>
      </div>
    );
  }

  const hasKey = Boolean(cfg?.public_key);
  const enabledNoKey = enabled && !snippet.trim();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={14} /> Back to admin
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <LifeBuoy size={22} /> Support widget
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Put your own support chat bubble on {SITE_HOST} — answered by the same team that supports Kerjakan, Realesta and Airevo.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5 pt-1 text-sm font-medium">
          <span className={enabled ? "" : "text-slate-400"}>{enabled ? "Live" : "Off"}</span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={enabled ? "Turn the site widget off" : "Turn the site widget on"}
            onClick={() => setEnabled((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
              enabled ? "bg-indigo-600" : "bg-slate-600"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <label className="text-sm font-medium">Embed snippet</label>
        <p className="mt-1 text-xs text-slate-500">
          Paste the snippet from the bot that should answer here (its Website widget page → Copy).
        </p>
        <textarea
          value={snippet}
          onChange={(e) => setSnippet(e.target.value)}
          rows={3}
          spellCheck={false}
          placeholder={`<script src="${SITE_URL}/widget/v1/widget.js" data-public-key="pk_…" defer></script>`}
          className={`mt-2 ${inputCls}`}
        />
        {enabledNoKey && (
          <p className="mt-2 text-xs text-amber-600">Paste a snippet — the widget can’t turn on without one.</p>
        )}
        {hasKey && (
          <p className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 size={13} /> Using key <code className="font-mono">{cfg!.public_key}</code>
          </p>
        )}
        <div className="mt-4">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving && <Loader2 size={15} className="animate-spin" />} Save
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm dark:border-slate-800 dark:bg-slate-900/50">
        <p className="font-medium">Before it can answer, on the bot you point here:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-600 dark:text-slate-400">
          <li>Open its <Link href="/dashboard/bots" className="text-indigo-600 hover:underline">Website widget</Link> page and toggle it <strong>Enabled</strong>.</li>
          <li>Add <code className="font-mono text-xs">{SITE_URL}</code> to its <strong>Allowed domains</strong> (the widget does a browser-origin check).</li>
          <li>Copy its snippet, paste it above, flip this switch on, and Save.</li>
        </ol>
      </div>
    </div>
  );
}
