"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { ArrowLeft, Loader2, Lock, PhoneCall, Play, Pause, Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { getBot, type Bot } from "@/lib/bots";
import {
  getVoice,
  requestNumber,
  updateVoiceSettings,
  STATUS_TEXT,
  formatAu,
  errorDetail,
  type VoicePage,
  type VoiceLine,
} from "@/lib/voice";
import BotTabs from "@/components/bot/BotTabs";

const STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];
const CITIES = ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Canberra", "Hobart", "Darwin"];
const TIMEZONES = [
  "Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane", "Australia/Adelaide",
  "Australia/Darwin", "Australia/Perth", "Australia/Hobart",
];
const CALL_LENGTHS = [5, 10, 15, 20, 30];

const card = "rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900";
const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 disabled:opacity-60";
const label = "mb-1 block text-sm font-medium";
const TONES = {
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  amber: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  red: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

export default function VoicePageView() {
  const botId = Number(useParams().botId);
  const [bot, setBot] = useState<Bot | undefined>();
  const [page, setPage] = useState<VoicePage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBot(botId).then(setBot).catch(() => {});
    getVoice(botId)
      .then(setPage)
      .catch(() => toast.error("Failed to load the phone line"))
      .finally(() => setLoading(false));
  }, [botId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/bots" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={14} /> Bots
      </Link>
      <BotTabs botId={botId} active="voice" />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Phone line</h1>
        <p className="mt-1 text-sm text-slate-500">
          {bot ? bot.name : `Bot #${botId}`} — an Australian phone number your customers can call. The AI answers from this
          bot&apos;s knowledge base, in a natural voice, any time of day.
        </p>
      </div>

      {!page ? null : !page.site_enabled ? (
        <div className={card}>
          <p className="text-sm text-slate-500">Phone lines aren&apos;t offered on this site yet.</p>
        </div>
      ) : !page.plan_allows ? (
        <div className={`${card} flex flex-col items-center gap-3 py-10 text-center`}>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950">
            <Lock size={22} />
          </div>
          <div className="font-medium">Not included in your plan</div>
          <p className="max-w-sm text-sm text-slate-500">Upgrade to a plan with a phone line to get a number for this bot.</p>
          <Link href="/dashboard/billing" className="mt-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
            View plans
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <StatusCard page={page} />
          {["draft", "info_needed"].includes(page.line.status) ? (
            page.can_edit ? (
              <RequestForm botId={botId} line={page.line} onSaved={setPage} />
            ) : (
              <div className={card}>
                <p className="text-sm text-slate-500">Ask an owner or admin of your account to request the number.</p>
              </div>
            )
          ) : (
            <SubmittedDetails line={page.line} />
          )}
          <CallerSettings botId={botId} page={page} onSaved={setPage} />
        </div>
      )}
    </div>
  );
}

function StatusCard({ page }: { page: VoicePage }) {
  const { line } = page;
  const s = STATUS_TEXT[line.status];
  const pct = page.minutes_included ? Math.min(100, (page.minutes_used / page.minutes_included) * 100) : 0;
  return (
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950">
            <PhoneCall size={20} />
          </div>
          <div>
            <div className="text-lg font-semibold">{line.phone_number ? formatAu(line.phone_number) : "No number yet"}</div>
            <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[s.tone]}`}>{s.label}</span>
          </div>
        </div>
        <div className="min-w-48 text-right text-sm">
          <div className="text-slate-500">Call minutes this month</div>
          <div className="font-semibold">
            {page.minutes_used} / {page.minutes_included}
          </div>
          <div className="mt-1 h-1.5 w-48 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className={`h-full ${pct >= 100 ? "bg-red-500" : "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      {line.status_message && (
        <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{line.status_message}</span>
        </div>
      )}
      {line.status === "active" && page.minutes_used >= page.minutes_included && (
        <p className="mt-4 text-sm text-red-600">
          This month&apos;s minutes are used up, so callers hear that the line is unavailable. Upgrade your plan or wait for
          next month&apos;s allowance.
        </p>
      )}
    </div>
  );
}

function RequestForm({ botId, line, onSaved }: { botId: number; line: VoiceLine; onSaved: (p: VoicePage) => void }) {
  const [f, setF] = useState({
    business_name: line.business_name ?? "",
    contact_name: line.contact_name ?? "",
    contact_phone: line.contact_phone ?? "",
    street_address: line.street_address ?? "",
    locality: line.locality ?? "",
    administrative_area: line.administrative_area ?? "",
    postal_code: line.postal_code ?? "",
    preferred_locality: line.preferred_locality ?? "Sydney",
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !line.document_filename) {
      toast.error("Attach a proof-of-address document.");
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      Object.entries(f).forEach(([k, v]) => form.append(k, v));
      if (file) form.append("document", file);
      onSaved(await requestNumber(botId, form));
      toast.success("Request sent. We'll order your number and keep you posted here.");
    } catch (err) {
      toast.error(errorDetail(err, "Couldn't send the request"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className={card}>
      <h2 className="text-lg font-semibold">Request your number</h2>
      <p className="mt-1 text-sm text-slate-500">
        Australian phone numbers are regulated, so the carrier checks who the number is for. Use your business&apos;s
        Australian address exactly as it appears on your document.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>Business name</label>
          <input className={input} value={f.business_name} onChange={set("business_name")} placeholder="Airevo Pty Ltd" required />
        </div>
        <div>
          <label className={label}>Contact name</label>
          <input className={input} value={f.contact_name} onChange={set("contact_name")} required />
        </div>
        <div>
          <label className={label}>Contact phone</label>
          <input className={input} value={f.contact_phone} onChange={set("contact_phone")} placeholder="+61 4xx xxx xxx" required />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Street address</label>
          <input className={input} value={f.street_address} onChange={set("street_address")} placeholder="7 Ferguson Street" required />
        </div>
        <div>
          <label className={label}>Suburb / town</label>
          <input className={input} value={f.locality} onChange={set("locality")} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>State</label>
            <select className={input} value={f.administrative_area} onChange={set("administrative_area")} required>
              <option value="">—</option>
              {STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Postcode</label>
            <input className={input} value={f.postal_code} onChange={set("postal_code")} inputMode="numeric" maxLength={4} required />
          </div>
        </div>
        <div>
          <label className={label}>Number area</label>
          <select className={input} value={f.preferred_locality} onChange={set("preferred_locality")}>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">The city your number&apos;s area code belongs to.</p>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Proof of address</label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
            <Upload size={16} className="text-slate-400" />
            <span className="truncate">
              {file ? file.name : line.document_filename ? `${line.document_filename} (uploaded — choose a file to replace it)` : "Choose a PDF, JPG or PNG (max 10 MB)"}
            </span>
            <input type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <p className="mt-1 text-xs text-slate-400">
            Dated within the last 90 days, showing your business name at this address: e.g. an ATO letter, bank statement, utility
            bill or company extract.
          </p>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
          {saving ? "Sending…" : line.status === "info_needed" ? "Send updated details" : "Request number"}
        </button>
      </div>
    </form>
  );
}

function SubmittedDetails({ line }: { line: VoiceLine }) {
  const rows: [string, string | null][] = [
    ["Business", line.business_name],
    ["Contact", line.contact_name && `${line.contact_name}, ${line.contact_phone}`],
    ["Address", [line.street_address, line.locality, line.administrative_area, line.postal_code].filter(Boolean).join(", ")],
    ["Document", line.document_filename],
  ];
  return (
    <div className={card}>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <CheckCircle2 size={18} className="text-emerald-600" /> Details sent
      </h2>
      <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-slate-500">{k}</dt>
            <dd>{v || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CallerSettings({ botId, page, onSaved }: { botId: number; page: VoicePage; onSaved: (p: VoicePage) => void }) {
  const { line, voices } = page;
  const [voiceId, setVoiceId] = useState(line.voice_id ?? voices[0]?.voice_id ?? "");
  const [greeting, setGreeting] = useState(line.first_message ?? "");
  const [tz, setTz] = useState(line.timezone ?? "Australia/Sydney");
  const [transfer, setTransfer] = useState(line.transfer_number ?? "");
  const [maxMin, setMaxMin] = useState(Math.round((line.max_call_seconds ?? 600) / 60));
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audio.current?.pause(), []);

  const play = (id: string, url: string) => {
    audio.current?.pause();
    if (playing === id) {
      setPlaying(null);
      return;
    }
    audio.current = new Audio(url);
    audio.current.onended = () => setPlaying(null);
    audio.current.play().catch(() => setPlaying(null));
    setPlaying(id);
  };

  const save = async () => {
    setSaving(true);
    try {
      onSaved(
        await updateVoiceSettings(botId, {
          voice_id: voiceId || undefined,
          first_message: greeting,
          timezone: tz,
          transfer_number: transfer,
          max_call_seconds: maxMin * 60,
        })
      );
      toast.success(line.status === "active" ? "Saved — callers hear the change on their next call" : "Saved");
    } catch (err) {
      toast.error(errorDetail(err, "Couldn't save"));
    } finally {
      setSaving(false);
    }
  };

  const disabled = !page.can_edit;
  return (
    <div className={card}>
      <h2 className="text-lg font-semibold">How calls sound</h2>
      <p className="mt-1 text-sm text-slate-500">You can set this up now; it applies as soon as your line goes live.</p>

      <div className="mt-5">
        <label className={label}>Voice</label>
        {voices.length === 0 ? (
          <p className="text-sm text-slate-500">Voices will be available shortly.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {voices.map((v) => (
              <div
                key={v.voice_id}
                role="radio"
                aria-checked={voiceId === v.voice_id}
                tabIndex={0}
                onClick={() => !disabled && setVoiceId(v.voice_id)}
                onKeyDown={(e) => e.key === "Enter" && !disabled && setVoiceId(v.voice_id)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                  voiceId === v.voice_id
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
                    : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                }`}
              >
                <div className="min-w-0">
                  <div className="font-medium">{v.name}</div>
                  {v.description && <div className="truncate text-xs text-slate-500">{v.description}</div>}
                </div>
                {v.preview_url && (
                  <button
                    type="button"
                    aria-label={`Play ${v.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      play(v.voice_id, v.preview_url);
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm dark:bg-slate-900"
                  >
                    {playing === v.voice_id ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>Greeting</label>
          <input
            className={input}
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            maxLength={500}
            disabled={disabled}
            placeholder={`Hi, thanks for calling ${line.business_name || "us"}. How can I help you today?`}
          />
          <p className="mt-1 text-xs text-slate-400">The first thing callers hear. Leave blank for the default above.</p>
        </div>
        <div>
          <label className={label}>Time zone</label>
          <select className={input} value={tz} onChange={(e) => setTz(e.target.value)} disabled={disabled}>
            {TIMEZONES.map((z) => (
              <option key={z} value={z}>
                {z.replace("Australia/", "")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Longest call</label>
          <select className={input} value={maxMin} onChange={(e) => setMaxMin(Number(e.target.value))} disabled={disabled}>
            {CALL_LENGTHS.map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Transfer to a person (optional)</label>
          <input
            className={input}
            value={transfer}
            onChange={(e) => setTransfer(e.target.value)}
            disabled={disabled}
            placeholder="+61 2 xxxx xxxx"
          />
          <p className="mt-1 text-xs text-slate-400">
            When a caller asks for a person, the call is put through to this number. Leave blank if calls shouldn&apos;t be transferred.
          </p>
        </div>
      </div>
      {!disabled && (
        <div className="mt-6 flex justify-end">
          <button onClick={save} disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}
