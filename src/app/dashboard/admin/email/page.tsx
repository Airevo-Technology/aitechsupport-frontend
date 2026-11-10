"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Mail, Send, Loader2, ShieldAlert, CheckCircle2, Circle } from "lucide-react";
import { getSmtp, updateSmtp, sendTestEmail, type SMTPSettings } from "@/lib/email";
import { SITE_HOST } from "@/lib/site";

export default function SmtpPage() {
  const [s, setS] = useState<SMTPSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [security, setSecurity] = useState("tls");
  const [enabled, setEnabled] = useState(false);
  const [testTo, setTestTo] = useState("");

  const load = async () => {
    try {
      const cfg = await getSmtp();
      setS(cfg);
      setHost(cfg.host);
      setPort(cfg.port);
      setUsername(cfg.username);
      setFromEmail(cfg.from_email);
      setFromName(cfg.from_name);
      setSecurity(cfg.security);
      setEnabled(cfg.enabled);
    } catch (e: any) {
      if (e?.response?.status === 403) setForbidden(true);
      else toast.error("Failed to load SMTP settings");
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
      const cfg = await updateSmtp({
        host,
        port,
        username,
        password: password || undefined,
        from_email: fromEmail,
        from_name: fromName,
        security,
        enabled,
      });
      setS(cfg);
      setPassword("");
      toast.success("SMTP settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    if (!testTo) {
      toast.error("Enter an address to test");
      return;
    }
    setTesting(true);
    try {
      await sendTestEmail(testTo);
      toast.success(`Test email sent to ${testTo}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Test send failed");
    } finally {
      setTesting(false);
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
          <Mail size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Email (SMTP)</h1>
          <p className="text-sm text-slate-500">Used for welcome, password, and quota emails.</p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4" />
          Email sending enabled
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">SMTP host</label>
            <input value={host} onChange={(e) => setHost(e.target.value)} className={inputCls} placeholder="smtp.gmail.com" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Port</label>
            <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} autoComplete="off" />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <label className="text-sm font-medium">Password</label>
              {s?.password_set ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 size={12} /> set</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Circle size={12} /> not set</span>
              )}
            </div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder={s?.password_set ? "•••••• (unchanged)" : "app password"} autoComplete="new-password" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">From email</label>
            <input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} className={inputCls} placeholder={`noreply@${SITE_HOST}`} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">From name</label>
            <input value={fromName} onChange={(e) => setFromName(e.target.value)} className={inputCls} placeholder="AiChatSupport" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Security</label>
          <select value={security} onChange={(e) => setSecurity(e.target.value)} className={inputCls}>
            <option value="tls">STARTTLS (587)</option>
            <option value="ssl">SSL/TLS (465)</option>
            <option value="none">None</option>
          </select>
        </div>

        <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
          {saving ? "Saving…" : "Save SMTP settings"}
        </button>
      </form>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 font-semibold">Send a test email</h2>
        <div className="flex gap-3">
          <input value={testTo} onChange={(e) => setTestTo(e.target.value)} className={inputCls} placeholder="you@example.com" />
          <button onClick={test} disabled={testing} className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800">
            <Send size={15} /> {testing ? "Sending…" : "Send test"}
          </button>
        </div>
      </div>
    </div>
  );
}
