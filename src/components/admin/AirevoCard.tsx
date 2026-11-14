"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { PlugZap, CheckCircle2, Circle, Store, AlertTriangle } from "lucide-react";
import { API_URL } from "@/lib/api";
import { getAirevo, updateAirevo, testAirevo, type AirevoSettings } from "@/lib/settings";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800";

function detail(err: unknown): string | undefined {
  return (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
}

function SetBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-emerald-600"><CheckCircle2 size={12} /> set</span>
  ) : (
    <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-slate-400"><Circle size={12} /> not set</span>
  );
}

/** airevo.com.au marketplace connection, for the Payments admin page. */
export default function AirevoCard() {
  const [s, setS] = useState<AirevoSettings | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [keyId, setKeyId] = useState("");
  const [secret, setSecret] = useState("");
  const [apiBase, setApiBase] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const apply = (cfg: AirevoSettings) => {
    setS(cfg);
    setEnabled(cfg.enabled);
    setKeyId(cfg.key_id);
    setApiBase(cfg.api_base);
    setListingUrl(cfg.listing_url);
  };

  useEffect(() => {
    getAirevo().then(apply).catch(() => toast.error("Failed to load Airevo settings"));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      apply(
        await updateAirevo({
          enabled,
          key_id: keyId.trim(),
          secret: secret.trim() || undefined,
          api_base: apiBase.trim(),
          listing_url: listingUrl.trim(),
        }),
      );
      setSecret("");
      toast.success("Airevo settings saved");
    } catch (err) {
      toast.error(detail(err) || "Failed to save Airevo settings");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      await testAirevo();
      toast.success("Airevo accepted the key and secret ✅");
    } catch (err) {
      toast.error(detail(err) || "Airevo test failed. Save first, then test.");
    } finally {
      setTesting(false);
    }
  };

  if (!s) return null;

  const eventsUrl = `${API_URL}/api/v1/airevo/events`;
  const ssoUrl = `${API_URL}/api/v1/airevo/sso`;

  return (
    <>
      <div className="mb-6 mt-10 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950">
          <Store size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Airevo marketplace</h2>
          <p className="text-sm text-slate-500">
            Sell paid plans through airevo.com.au. Airevo takes the payment and tells this site to create, upgrade,
            suspend or end the customer&rsquo;s account.
          </p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-900/50">
          <p className="mb-2 font-medium text-slate-600 dark:text-slate-300">
            Enter these on Airevo (Admin › Marketplace › Providers › AiChatSupport)
          </p>
          <p className="text-slate-500">Events URL</p>
          <code className="block break-all font-mono text-slate-700 dark:text-slate-200">{eventsUrl}</code>
          <p className="mt-2 text-slate-500">SSO URL</p>
          <code className="block break-all font-mono text-slate-700 dark:text-slate-200">{ssoUrl}</code>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 flex items-center text-sm font-medium">Key ID <SetBadge ok={!!s.key_id} /></label>
            <input value={keyId} onChange={(e) => setKeyId(e.target.value)} className={`${inputCls} font-mono`} autoComplete="off" placeholder="ak_live_…" />
          </div>
          <div>
            <label className="mb-1 flex items-center text-sm font-medium">Secret <SetBadge ok={s.secret_set} /></label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className={`${inputCls} font-mono`}
              autoComplete="new-password"
              placeholder={s.secret_set ? `•••••• (unchanged) ${s.secret_hint ?? ""}` : "sk_live_…"}
            />
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Generate both on Airevo. The secret is shown there only once, so paste it here straight away.
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium">Airevo API base</label>
          <input value={apiBase} onChange={(e) => setApiBase(e.target.value)} className={`${inputCls} font-mono`} autoComplete="off" />
          <p className="mt-1 text-xs text-slate-400">Leave as is unless you are testing against an Airevo staging site.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Listing URL</label>
          <input
            value={listingUrl}
            onChange={(e) => setListingUrl(e.target.value)}
            className={`${inputCls} font-mono`}
            autoComplete="off"
            placeholder="https://airevo.com.au/marketplace/aichatsupport"
          />
          <div className="mt-2 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              While this is set, paid plans can only be bought on Airevo and self-checkout here closes. Leave it empty
              until the Airevo listing is published and Airevo can take payment.
            </span>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enable the Airevo marketplace connection
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save Airevo settings"}
          </button>
          <button
            type="button"
            onClick={test}
            disabled={testing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <PlugZap size={15} /> {testing ? "Testing…" : "Test saved key"}
          </button>
          <span className={`text-xs ${s.configured ? "text-emerald-600" : "text-slate-400"}`}>
            {s.configured ? (s.sells_paid_plans ? "Connected · paid plans sold on Airevo" : "Connected · self-checkout still open") : "Not connected"}
          </span>
        </div>
      </form>
    </>
  );
}
