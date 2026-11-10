"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { PlugZap, CheckCircle2, Circle, FlaskConical, Wallet } from "lucide-react";
import { getSettings, updateSettings, testPaypal, type SettingsOut } from "@/lib/settings";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800";

function SetBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-emerald-600"><CheckCircle2 size={12} /> set</span>
  ) : (
    <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-slate-400"><Circle size={12} /> not set</span>
  );
}

/** PayPal gateway + deployment currency, for the Payments admin page. */
export default function PayPalCard() {
  const [s, setS] = useState<SettingsOut | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [sandbox, setSandbox] = useState(true);
  const [clientId, setClientId] = useState("");
  const [secret, setSecret] = useState("");
  const [currency, setCurrency] = useState("MYR");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const apply = (cfg: SettingsOut) => {
    setS(cfg);
    setEnabled(cfg.paypal_enabled);
    setSandbox(cfg.paypal_sandbox);
    setClientId(cfg.paypal_client_id);
    setCurrency(cfg.billing_currency);
  };

  useEffect(() => {
    getSettings().then(apply).catch(() => toast.error("Failed to load PayPal settings"));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[A-Z]{3}$/.test(currency)) {
      toast.error("Currency must be a 3-letter code, e.g. AUD");
      return;
    }
    setSaving(true);
    try {
      apply(
        await updateSettings({
          paypal_client_id: clientId.trim(),
          paypal_client_secret: secret.trim() || undefined,
          paypal_enabled: enabled,
          paypal_sandbox: sandbox,
          billing_currency: currency,
        }),
      );
      setSecret("");
      toast.success("PayPal settings saved");
    } catch {
      toast.error("Failed to save PayPal settings");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      await testPaypal();
      toast.success(`Connected to PayPal ${sandbox ? "sandbox" : "live"} ✅`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "PayPal test failed. Save first, then test.");
    } finally {
      setTesting(false);
    }
  };

  if (!s) return null;

  return (
    <>
      <div className="mb-6 mt-10 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950">
          <Wallet size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">PayPal payments</h2>
          <p className="text-sm text-slate-500">
            Collect paid-plan payments by PayPal or card. Billplz only collects MYR, so PayPal is the gateway for any
            other currency (e.g. AUD for Australia).
          </p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label className="mb-1 block text-sm font-medium">Billing currency</label>
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
            className={`${inputCls} w-28 font-mono`}
            placeholder="AUD"
          />
          <p className="mt-1 text-xs text-slate-500">
            The currency your package prices are quoted in on this site. Changing it relabels existing prices; it does not convert them.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} />
          <FlaskConical size={15} className="text-amber-500" />
          Sandbox mode (test payments only, no real charges)
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 flex items-center text-sm font-medium">Client ID <SetBadge ok={!!s.paypal_client_id} /></label>
            <input value={clientId} onChange={(e) => setClientId(e.target.value)} className={`${inputCls} font-mono`} autoComplete="off" placeholder="PayPal app client ID" />
          </div>
          <div>
            <label className="mb-1 flex items-center text-sm font-medium">Client secret <SetBadge ok={s.paypal_client_secret_set} /></label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className={`${inputCls} font-mono`}
              autoComplete="new-password"
              placeholder={s.paypal_client_secret_set ? `•••••• (unchanged) ${s.paypal_client_secret_hint ?? ""}` : "PayPal app secret"}
            />
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Sandbox and live use different PayPal apps with different credentials. The saved pair is used for whichever mode is selected,
          so replace both when you switch to live.
        </p>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enable PayPal checkout
        </label>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save PayPal settings"}
          </button>
          <button type="button" onClick={test} disabled={testing} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800">
            <PlugZap size={15} /> {testing ? "Testing…" : "Test saved credentials"}
          </button>
        </div>
      </form>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
        <p className="font-medium text-slate-600 dark:text-slate-300">Setup checklist</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>At developer.paypal.com, open <strong>Apps &amp; Credentials</strong>, switch to <strong>Sandbox</strong>, and create an app.</li>
          <li>Paste its Client ID and Secret above, tick <strong>Sandbox mode</strong> and <strong>Enable PayPal checkout</strong>, save, then <strong>Test saved credentials</strong>.</li>
          <li>Tick <strong>Billing enabled</strong> in the Billplz section above. It is the shared on/off switch for all online payments.</li>
          <li>Pay for a plan with a PayPal sandbox buyer account and confirm the plan activates.</li>
          <li>To go live: create a <strong>Live</strong> app, replace the Client ID and Secret, untick Sandbox mode, and save.</li>
        </ol>
        <p className="mt-2">No webhook is needed: the payment is confirmed when the customer returns to the billing page.</p>
      </div>
    </>
  );
}
