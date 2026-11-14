"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { CreditCard, PlugZap, Loader2, ShieldAlert, CheckCircle2, Circle, FlaskConical, Banknote, Upload, MessageCircle } from "lucide-react";
import {
  getBillplz,
  updateBillplz,
  testBillplz,
  type BillplzSettings,
  adminGetBankTransfer,
  adminUpdateBankTransfer,
  adminUploadBankTransferQr,
  adminListWhatsappChannels,
  type BankTransferSettings,
  type WhatsappChannelOption,
} from "@/lib/billing";
import PayPalCard from "@/components/admin/PayPalCard";
import AirevoCard from "@/components/admin/AirevoCard";

export default function BillplzPage() {
  const [s, setS] = useState<BillplzSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [sandbox, setSandbox] = useState(true);
  const [liveApiKey, setLiveApiKey] = useState("");
  const [liveXSignatureKey, setLiveXSignatureKey] = useState("");
  const [liveCollectionId, setLiveCollectionId] = useState("");
  const [sandboxApiKey, setSandboxApiKey] = useState("");
  const [sandboxXSignatureKey, setSandboxXSignatureKey] = useState("");
  const [sandboxCollectionId, setSandboxCollectionId] = useState("");

  const load = async () => {
    try {
      const cfg = await getBillplz();
      setS(cfg);
      setEnabled(cfg.enabled);
      setSandbox(cfg.sandbox);
      setLiveCollectionId(cfg.live_collection_id);
      setSandboxCollectionId(cfg.sandbox_collection_id);
    } catch (e: any) {
      if (e?.response?.status === 403) setForbidden(true);
      else toast.error("Failed to load Billplz settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cfg = await updateBillplz({
        enabled,
        sandbox,
        live_api_key: liveApiKey || undefined,
        live_x_signature_key: liveXSignatureKey || undefined,
        live_collection_id: liveCollectionId,
        sandbox_api_key: sandboxApiKey || undefined,
        sandbox_x_signature_key: sandboxXSignatureKey || undefined,
        sandbox_collection_id: sandboxCollectionId,
      });
      setS(cfg);
      setLiveApiKey("");
      setLiveXSignatureKey("");
      setSandboxApiKey("");
      setSandboxXSignatureKey("");
      toast.success("Billplz settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      await testBillplz();
      toast.success(`Connected to Billplz ${sandbox ? "sandbox" : "production"} ✅`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  // ----- Bank transfer fallback -----
  const [bt, setBt] = useState<BankTransferSettings | null>(null);
  const [btLoading, setBtLoading] = useState(true);
  const [btSaving, setBtSaving] = useState(false);
  const [btUploading, setBtUploading] = useState(false);
  const [channels, setChannels] = useState<WhatsappChannelOption[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [btEnabled, setBtEnabled] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [notifyChannelId, setNotifyChannelId] = useState<number | "">("");
  const [notifyNumber, setNotifyNumber] = useState("");

  const loadBankTransfer = async () => {
    try {
      const [cfg, chans] = await Promise.all([adminGetBankTransfer(), adminListWhatsappChannels()]);
      setBt(cfg);
      setChannels(chans);
      setBtEnabled(cfg.enabled);
      setBankName(cfg.bank_name);
      setAccountName(cfg.account_name);
      setAccountNumber(cfg.account_number);
      setNotifyChannelId(cfg.notify_channel_id ?? "");
      setNotifyNumber(cfg.notify_whatsapp_number);
    } catch {
      // 403 already surfaced by the Billplz load above
    } finally {
      setBtLoading(false);
    }
  };

  useEffect(() => {
    loadBankTransfer();
  }, []);

  const saveBankTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setBtSaving(true);
    try {
      const cfg = await adminUpdateBankTransfer({
        enabled: btEnabled,
        bank_name: bankName,
        account_name: accountName,
        account_number: accountNumber,
        notify_channel_id: notifyChannelId === "" ? undefined : Number(notifyChannelId),
        notify_whatsapp_number: notifyNumber,
      });
      setBt(cfg);
      toast.success("Bank transfer settings saved");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save");
    } finally {
      setBtSaving(false);
    }
  };

  const uploadQr = async (file: File) => {
    setBtUploading(true);
    try {
      const cfg = await adminUploadBankTransferQr(file);
      setBt(cfg);
      toast.success("QR code uploaded");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to upload QR code");
    } finally {
      setBtUploading(false);
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
      </div>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950">
          <CreditCard size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Billplz payments</h1>
          <p className="text-sm text-slate-500">
            Connect your Billplz account to collect payments for paid plans (FPX / cards). Sandbox mode
            uses Billplz&rsquo;s test environment so you can trial checkout without real money.
          </p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4" />
          Billing enabled (allow customers to pay for paid plans)
        </label>

        <label className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <input type="checkbox" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} className="h-4 w-4" />
          <FlaskConical size={15} />
          Sandbox mode active (use the sandbox credentials below for checkout — no real charges)
        </label>

        {/* Live credentials */}
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <span className={`h-2 w-2 rounded-full ${!sandbox ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`} />
            Live credentials {!sandbox && <span className="text-xs font-normal text-emerald-600">(active)</span>}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <label className="text-sm font-medium">Secret API key</label>
                {s?.live_api_key_set ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 size={12} /> set {s.live_api_key_hint}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Circle size={12} /> not set</span>
                )}
              </div>
              <input type="password" value={liveApiKey} onChange={(e) => setLiveApiKey(e.target.value)} className={inputCls} placeholder={s?.live_api_key_set ? "•••••• (unchanged)" : "Billplz secret key"} autoComplete="new-password" />
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <label className="text-sm font-medium">X-Signature key</label>
                {s?.live_x_signature_key_set ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 size={12} /> set {s.live_x_signature_key_hint}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Circle size={12} /> not set</span>
                )}
              </div>
              <input type="password" value={liveXSignatureKey} onChange={(e) => setLiveXSignatureKey(e.target.value)} className={inputCls} placeholder={s?.live_x_signature_key_set ? "•••••• (unchanged)" : "webhook signature key"} autoComplete="new-password" />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium">Collection ID</label>
            <input value={liveCollectionId} onChange={(e) => setLiveCollectionId(e.target.value)} className={inputCls} placeholder="e.g. rg8mkiu6" autoComplete="off" />
          </div>
        </div>

        {/* Sandbox credentials */}
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <span className={`h-2 w-2 rounded-full ${sandbox ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`} />
            Sandbox credentials {sandbox && <span className="text-xs font-normal text-emerald-600">(active)</span>}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <label className="text-sm font-medium">Secret API key</label>
                {s?.sandbox_api_key_set ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 size={12} /> set {s.sandbox_api_key_hint}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Circle size={12} /> not set</span>
                )}
              </div>
              <input type="password" value={sandboxApiKey} onChange={(e) => setSandboxApiKey(e.target.value)} className={inputCls} placeholder={s?.sandbox_api_key_set ? "•••••• (unchanged)" : "Billplz sandbox secret key"} autoComplete="new-password" />
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <label className="text-sm font-medium">X-Signature key</label>
                {s?.sandbox_x_signature_key_set ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 size={12} /> set {s.sandbox_x_signature_key_hint}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Circle size={12} /> not set</span>
                )}
              </div>
              <input type="password" value={sandboxXSignatureKey} onChange={(e) => setSandboxXSignatureKey(e.target.value)} className={inputCls} placeholder={s?.sandbox_x_signature_key_set ? "•••••• (unchanged)" : "webhook signature key"} autoComplete="new-password" />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium">Collection ID</label>
            <input value={sandboxCollectionId} onChange={(e) => setSandboxCollectionId(e.target.value)} className={inputCls} placeholder="e.g. inbmmepb" autoComplete="off" />
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Live and sandbox are separate Billplz accounts, each with its own key, X-Signature secret and
          collection. Toggling sandbox mode just switches which set checkout uses — neither overwrites
          the other.
        </p>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save Billplz settings"}
          </button>
          <button type="button" onClick={test} disabled={testing} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800">
            <PlugZap size={15} /> {testing ? "Testing…" : "Test connection"}
          </button>
        </div>
      </form>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
        <p className="font-medium text-slate-600 dark:text-slate-300">Setup checklist</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>Sign in to your <strong>sandbox</strong> Billplz account (billplz-sandbox.com), copy its Secret Key + create a Collection, and fill in the Sandbox credentials above.</li>
          <li>Sign in to your <strong>live</strong> Billplz account (billplz.com), copy its Secret Key + Collection, and fill in the Live credentials above.</li>
          <li>Copy each account&rsquo;s <strong>X-Signature Key</strong> so payment callbacks can be verified.</li>
          <li>Toggle <strong>Sandbox mode</strong> on to trial checkout risk-free, then off to go live — both credential sets stay saved either way.</li>
        </ol>
      </div>

      <PayPalCard />

      <AirevoCard />

      {/* ===== Bank transfer fallback ===== */}
      <div className="mb-6 mt-10 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950">
          <Banknote size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Bank transfer fallback</h1>
          <p className="text-sm text-slate-500">
            Let customers pay by scanning your bank&rsquo;s QR code or transferring manually, then reporting it
            on their Billing page. You confirm the transfer and activate the plan yourself.
          </p>
        </div>
      </div>

      {btLoading ? (
        <div className="flex h-32 items-center justify-center text-slate-500">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <form onSubmit={saveBankTransfer} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={btEnabled} onChange={(e) => setBtEnabled(e.target.checked)} className="h-4 w-4" />
            Bank transfer enabled (show as a payment option alongside Billplz)
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Bank name</label>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputCls} placeholder="e.g. Maybank" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Account name</label>
              <input value={accountName} onChange={(e) => setAccountName(e.target.value)} className={inputCls} placeholder="Your name as on the account" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Account number</label>
              <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className={inputCls} placeholder="e.g. 1234567890" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">QR code (customers scan this in their banking app)</label>
            <div className="flex items-center gap-3">
              {bt?.qr_url ? (
                <img src={bt.qr_url} alt="Bank transfer QR" className="h-24 w-24 rounded-lg border border-slate-200 object-contain dark:border-slate-700" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-700">
                  No QR yet
                </div>
              )}
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadQr(e.target.files[0])}
                />
                <button
                  type="button"
                  disabled={btUploading}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <Upload size={14} /> {btUploading ? "Uploading…" : bt?.qr_url ? "Replace QR" : "Upload QR"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                <MessageCircle size={14} /> Notify via WhatsApp channel
              </label>
              <select
                value={notifyChannelId}
                onChange={(e) => setNotifyChannelId(e.target.value === "" ? "" : Number(e.target.value))}
                className={inputCls}
              >
                <option value="">Don&rsquo;t send WhatsApp notifications</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.organization_name} · {c.bot_name} ({c.phone_number_id || "no number"})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                Reuses one client bot&rsquo;s connected WhatsApp device to send you a message when a customer
                reports a transfer.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Your WhatsApp number</label>
              <input value={notifyNumber} onChange={(e) => setNotifyNumber(e.target.value)} className={inputCls} placeholder="e.g. 60123456789" />
            </div>
          </div>

          <button type="submit" disabled={btSaving} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {btSaving ? "Saving…" : "Save bank transfer settings"}
          </button>
        </form>
      )}
    </div>
  );
}
