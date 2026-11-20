"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { Loader2, PhoneCall, Play, Pause, RefreshCw, Trash2, FileText, Search } from "lucide-react";
import {
  activateVoiceLine,
  adoptVoiceNumber,
  addCatalogVoice,
  createVoiceWebhook,
  formatAu,
  getAdminVoiceSettings,
  listVoiceLines,
  noteVoiceLine,
  orderVoiceNumber,
  releaseVoiceLine,
  searchVoiceNumbers,
  syncVoiceLine,
  testVoiceConnections,
  updateAdminVoiceSettings,
  voiceDocumentUrl,
  errorDetail,
  STATUS_TEXT,
  type AdminVoiceLine,
  type AdminVoiceSettings,
  type AvailableNumber,
} from "@/lib/voice";

const card = "rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900";
const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";
const btn = "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800";
const primary = "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60";

export default function AdminVoicePage() {
  const [settings, setSettings] = useState<AdminVoiceSettings | null>(null);
  const [lines, setLines] = useState<AdminVoiceLine[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadLines = () => listVoiceLines().then(setLines);
  useEffect(() => {
    Promise.all([getAdminVoiceSettings().then(setSettings), reloadLines()])
      .catch(() => toast.error("Failed to load voice settings"))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !settings) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const replaceLine = (l: AdminVoiceLine) => setLines((all) => all.map((x) => (x.id === l.id ? l : x)));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950">
          <PhoneCall size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Voice lines</h1>
          <p className="text-sm text-slate-500">
            AI phone numbers for subscribers: Telnyx numbers answered by ElevenLabs agents using each bot&apos;s knowledge base.
          </p>
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Requests and lines</h2>
          <button className={btn} onClick={() => reloadLines().catch(() => toast.error("Reload failed"))}>
            <RefreshCw size={14} className="inline" /> Reload
          </button>
        </div>
        {lines.length === 0 ? (
          <div className={`${card} text-sm text-slate-500`}>No requests yet. Subscribers request a number from their bot&apos;s Phone line tab.</div>
        ) : (
          <div className="space-y-3">
            {lines.map((l) => (
              <LineCard key={l.id} line={l} onChange={replaceLine} />
            ))}
          </div>
        )}
      </section>

      <SettingsCard settings={settings} onChange={setSettings} />
    </div>
  );
}

function LineCard({ line, onChange }: { line: AdminVoiceLine; onChange: (l: AdminVoiceLine) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [city, setCity] = useState(line.preferred_locality || "Sydney");
  const [numbers, setNumbers] = useState<AvailableNumber[] | null>(null);
  const [note, setNote] = useState("");
  const [existing, setExisting] = useState("");
  const s = STATUS_TEXT[line.status];

  const run = async (name: string, fn: () => Promise<AdminVoiceLine>, ok: string) => {
    setBusy(name);
    try {
      onChange(await fn());
      toast.success(ok);
    } catch (e) {
      toast.error(errorDetail(e, `${name} failed`));
    } finally {
      setBusy(null);
    }
  };

  const search = async () => {
    setBusy("search");
    try {
      setNumbers(await searchVoiceNumbers(line.id, city));
    } catch (e) {
      toast.error(errorDetail(e, "Search failed"));
    } finally {
      setBusy(null);
    }
  };

  const order = (n: AvailableNumber) => {
    const cost = n.upfront_cost ? ` for ${n.currency ?? "USD"} ${n.upfront_cost} upfront + ${n.monthly_cost}/month` : "";
    if (!confirm(`Order ${n.phone_number}${cost}? Telnyx charges are non-refundable. The subscriber's details and document are attached.`)) return;
    run("Order", () => orderVoiceNumber(line.id, n.phone_number), "Ordered — Telnyx is reviewing the documents");
    setNumbers(null);
  };

  const openDoc = async () => {
    try {
      window.open(await voiceDocumentUrl(line.id), "_blank", "noopener");
    } catch (e) {
      toast.error(errorDetail(e, "Couldn't open the document"));
    }
  };

  const release = (releaseNumber: boolean) => {
    const what = releaseNumber
      ? "Take the line down AND give the number back to Telnyx? The number is lost for good."
      : "Take the line down (delete the ElevenLabs agent) but keep the number?";
    if (confirm(what)) run("Release", () => releaseVoiceLine(line.id, releaseNumber), "Line taken down");
  };

  const canOrder = ["submitted", "info_needed", "failed"].includes(line.status);
  return (
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold">
            {line.business_name || "—"} <span className="font-normal text-slate-500">· {line.organization_name} · bot “{line.bot_name}”</span>
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {line.contact_name}, {line.contact_phone} · {[line.street_address, line.locality, line.administrative_area, line.postal_code].filter(Boolean).join(", ")}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium dark:bg-slate-800">{s.label}</span>
            {line.phone_number && <span className="font-mono">{formatAu(line.phone_number)}</span>}
            {line.telnyx_status && <span className="text-slate-400">Telnyx: {line.telnyx_status}</span>}
            {line.status === "active" && (
              <span className="text-slate-500">
                {line.calls} calls · {line.minutes} min
              </span>
            )}
          </div>
          {line.status_message && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">Note to subscriber: {line.status_message}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {line.has_document && (
            <button className={btn} onClick={openDoc}>
              <FileText size={14} className="inline" /> Document
            </button>
          )}
          {["ordered", "info_needed"].includes(line.status) && line.phone_number && (
            <button className={btn} disabled={!!busy} onClick={() => run("Sync", () => syncVoiceLine(line.id), "Status refreshed from Telnyx")}>
              {busy === "Sync" ? "Checking…" : "Check Telnyx"}
            </button>
          )}
          {["number_ready", "active"].includes(line.status) && (
            <button
              className={primary}
              disabled={!!busy}
              onClick={() => run("Activate", () => activateVoiceLine(line.id), line.status === "active" ? "Agent refreshed" : "Line is live")}
            >
              {busy === "Activate" ? "Working…" : line.status === "active" ? "Re-apply agent" : "Activate"}
            </button>
          )}
          {(line.el_agent_id || line.status === "number_ready") && (
            <>
              <button className={btn} disabled={!!busy} onClick={() => release(false)}>
                Take down
              </button>
              <button className={`${btn} text-red-600`} disabled={!!busy} onClick={() => release(true)}>
                <Trash2 size={14} className="inline" /> Release number
              </button>
            </>
          )}
        </div>
      </div>

      {canOrder && (
        <div className="mt-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-950">
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">City</label>
              <input className={`${input} w-44`} value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <button className={btn} disabled={!!busy} onClick={search}>
              <Search size={14} className="inline" /> {busy === "search" ? "Searching…" : "Find numbers"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Or use a number already on the Telnyx account</label>
              <input className={`${input} w-56 font-mono`} value={existing} onChange={(e) => setExisting(e.target.value)} placeholder="+61 2 8390 2245" />
            </div>
            <button
              className={btn}
              disabled={!existing.trim() || !!busy}
              onClick={() => {
                if (confirm(`Use ${existing} for this line? It will be routed to the ElevenLabs SIP connection.`))
                  run("Use number", () => adoptVoiceNumber(line.id, existing), "Number attached to this line");
              }}
            >
              Use this number
            </button>
          </div>
          {numbers && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {numbers.length === 0 && <p className="text-sm text-slate-500">No numbers found. Try another city.</p>}
              {numbers.map((n) => (
                <button
                  key={n.phone_number}
                  onClick={() => order(n)}
                  disabled={!!busy}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-900"
                >
                  <span className="font-mono">{formatAu(n.phone_number)}</span>
                  <span className="text-xs text-slate-500">
                    {n.locality} · {n.currency} {n.upfront_cost} + {n.monthly_cost}/mo
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {line.status !== "active" && line.status !== "released" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            className={`${input} flex-1`}
            placeholder="Message to the subscriber (e.g. Telnyx needs a document dated within 90 days)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            className={btn}
            disabled={!note.trim() || !!busy}
            onClick={() => run("Note", () => noteVoiceLine(line.id, note, true), "Subscriber asked for more information").then(() => setNote(""))}
          >
            Ask subscriber
          </button>
        </div>
      )}
    </div>
  );
}

function SettingsCard({ settings, onChange }: { settings: AdminVoiceSettings; onChange: (s: AdminVoiceSettings) => void }) {
  const [telnyxKey, setTelnyxKey] = useState("");
  const [elKey, setElKey] = useState("");
  const [connection, setConnection] = useState(settings.telnyx_sip_connection_id);
  const [model, setModel] = useState(settings.tts_model);
  const [newVoice, setNewVoice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const call = async (name: string, fn: () => Promise<AdminVoiceSettings>, ok: string) => {
    setBusy(name);
    try {
      onChange(await fn());
      toast.success(ok);
      return true;
    } catch (e) {
      toast.error(errorDetail(e, `${name} failed`));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    const ok = await call(
      "Save",
      () =>
        updateAdminVoiceSettings({
          telnyx_api_key: telnyxKey || undefined,
          elevenlabs_api_key: elKey || undefined,
          telnyx_sip_connection_id: connection,
          tts_model: model,
        }),
      "Saved"
    );
    if (ok) {
      setTelnyxKey("");
      setElKey("");
    }
  };

  const test = async () => {
    setBusy("Test");
    try {
      const r = await testVoiceConnections();
      const msg = `Telnyx: ${r.telnyx} · ElevenLabs: ${r.elevenlabs}`;
      if (r.telnyx === "ok" && r.elevenlabs === "ok") toast.success(msg);
      else toast.error(msg, { duration: 8000 });
    } finally {
      setBusy(null);
    }
  };

  const play = (id: string, url: string) => {
    audio.current?.pause();
    if (playing === id) return setPlaying(null);
    audio.current = new Audio(url);
    audio.current.onended = () => setPlaying(null);
    audio.current.play().catch(() => setPlaying(null));
    setPlaying(id);
  };

  return (
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Voice settings</h2>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={settings.enabled}
            disabled={!!busy}
            onChange={(e) =>
              call("Toggle", () => updateAdminVoiceSettings({ enabled: e.target.checked }), e.target.checked ? "Phone lines switched on" : "Phone lines switched off")
            }
          />
          Offer phone lines on this site
        </label>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Telnyx API key {settings.telnyx_api_key_set && <span className="text-xs text-emerald-600">set {settings.telnyx_api_key_hint}</span>}
          </label>
          <input className={`${input} font-mono`} type="password" autoComplete="off" value={telnyxKey} onChange={(e) => setTelnyxKey(e.target.value)} placeholder={settings.telnyx_api_key_set ? "Enter a new key to replace it" : "KEY…"} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Telnyx SIP connection ID</label>
          <input className={`${input} font-mono`} value={connection} onChange={(e) => setConnection(e.target.value)} placeholder="FQDN connection routing to sip.rtc.elevenlabs.io" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            ElevenLabs API key {settings.elevenlabs_api_key_set && <span className="text-xs text-emerald-600">set {settings.elevenlabs_api_key_hint}</span>}
          </label>
          <input className={`${input} font-mono`} type="password" autoComplete="off" value={elKey} onChange={(e) => setElKey(e.target.value)} placeholder={settings.elevenlabs_api_key_set ? "Enter a new key to replace it" : "sk_…"} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Speech model</label>
          <input className={`${input} font-mono`} value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className={primary} disabled={!!busy} onClick={save}>
          {busy === "Save" ? "Saving…" : "Save"}
        </button>
        <button className={btn} disabled={!!busy} onClick={test}>
          {busy === "Test" ? "Testing…" : "Test connections"}
        </button>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
        <h3 className="font-medium">Call log webhook</h3>
        <p className="mt-1 text-sm text-slate-500">
          ElevenLabs sends each finished call here, so calls appear in the bot&apos;s inbox and minutes are counted.
          <br />
          <code className="text-xs">{settings.webhook_url}</code>
        </p>
        <button
          className={`${btn} mt-2`}
          disabled={!!busy || !settings.elevenlabs_api_key_set}
          onClick={() => {
            if (settings.webhook_configured && !confirm("Create a new webhook? Lines activated earlier keep the old one until re-applied.")) return;
            call("Webhook", createVoiceWebhook, "Webhook created");
          }}
        >
          {settings.webhook_configured ? "Recreate webhook" : "Create webhook"}
        </button>
        {settings.webhook_configured && <span className="ml-2 text-xs text-emerald-600">configured</span>}
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
        <h3 className="font-medium">Voices subscribers can choose</h3>
        <p className="mt-1 text-sm text-slate-500">
          Add a voice by its ElevenLabs voice ID (add it to &ldquo;My voices&rdquo; in ElevenLabs first). The first voice is the default.
        </p>
        <div className="mt-3 space-y-2">
          {settings.voices.map((v, i) => (
            <div key={v.voice_id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
              <div className="min-w-0">
                <span className="font-medium">{v.name}</span> {i === 0 && <span className="text-xs text-indigo-600">default</span>}
                <div className="truncate text-xs text-slate-500">
                  {v.voice_id}
                  {v.description && ` · ${v.description}`}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {v.preview_url && (
                  <button className={btn} onClick={() => play(v.voice_id, v.preview_url)} aria-label={`Play ${v.name}`}>
                    {playing === v.voice_id ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                )}
                {i > 0 && (
                  <button
                    className={btn}
                    disabled={!!busy}
                    onClick={() =>
                      call("Order", () => updateAdminVoiceSettings({ voices: [v, ...settings.voices.filter((x) => x.voice_id !== v.voice_id)] }), `${v.name} is now the default`)
                    }
                  >
                    Make default
                  </button>
                )}
                <button
                  className={`${btn} text-red-600`}
                  disabled={!!busy}
                  aria-label={`Remove ${v.name}`}
                  onClick={() => call("Remove", () => updateAdminVoiceSettings({ voices: settings.voices.filter((x) => x.voice_id !== v.voice_id) }), "Removed")}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input className={`${input} font-mono`} value={newVoice} onChange={(e) => setNewVoice(e.target.value)} placeholder="Voice ID, e.g. 6UXvJKkwaqtXE3nZHvbF" />
          <button
            className={btn}
            disabled={!newVoice.trim() || !!busy}
            onClick={async () => {
              if (await call("Add", () => addCatalogVoice(newVoice.trim()), "Voice added")) setNewVoice("");
            }}
          >
            Add voice
          </button>
        </div>
      </div>
    </section>
  );
}
