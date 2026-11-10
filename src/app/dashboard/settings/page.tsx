"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { KeyRound, CheckCircle2, Circle, Loader2, ShieldAlert } from "lucide-react";
import { getSettings, updateSettings, testPaypal, type SettingsOut } from "@/lib/settings";
import { listModels, type ModelOption } from "@/lib/bots";

/** A secret field: shows whether it's already set (+hint), with an input to replace it. */
function SecretField({
  label,
  help,
  isSet,
  hint,
  value,
  onChange,
}: {
  label: string;
  help: string;
  isSet: boolean;
  hint: string | null;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <label className="text-sm font-medium">{label}</label>
        {isSet ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 size={13} /> set {hint}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Circle size={13} /> not set
          </span>
        )}
      </div>
      <input
        type="password"
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isSet ? "Enter a new key to replace it" : "Paste key…"}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800"
      />
      <p className="mt-1 text-xs text-slate-500">{help}</p>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsOut | null>(null);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);

  // editable fields
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [voyageKey, setVoyageKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [defaultModel, setDefaultModel] = useState("");
  const [fonnteToken, setFonnteToken] = useState("");
  const [encryptionKey, setEncryptionKey] = useState("");
  const [evolutionUrl, setEvolutionUrl] = useState("");
  const [evolutionKey, setEvolutionKey] = useState("");
  const [waProvider, setWaProvider] = useState<"fonnte" | "evolution">("fonnte");
  const [paypalClientId, setPaypalClientId] = useState("");
  const [paypalSecret, setPaypalSecret] = useState("");
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [paypalSandbox, setPaypalSandbox] = useState(true);
  const [currency, setCurrency] = useState("MYR");
  const [embeddingsProvider, setEmbeddingsProvider] = useState<"voyage" | "openrouter" | "huggingface">("voyage");
  const [embeddingMain, setEmbeddingMain] = useState("");
  const [embeddingFallback1, setEmbeddingFallback1] = useState("");
  const [embeddingFallback2, setEmbeddingFallback2] = useState("");
  const [huggingfaceKey, setHuggingfaceKey] = useState("");
  const [embeddingHuggingface, setEmbeddingHuggingface] = useState("");

  const load = async () => {
    try {
      const s = await getSettings();
      setSettings(s);
      setBaseUrl(s.openrouter_base_url);
      setDefaultModel(s.default_chat_model);
      setEmbeddingsProvider(s.embeddings_provider);
      setEmbeddingMain(s.embedding_model_openrouter_main);
      setEmbeddingFallback1(s.embedding_model_openrouter_fallback_1);
      setEmbeddingFallback2(s.embedding_model_openrouter_fallback_2);
      setEmbeddingHuggingface(s.embedding_model_huggingface);
      setEvolutionUrl(s.evolution_base_url);
      setWaProvider(s.whatsapp_default_provider);
      setPaypalClientId(s.paypal_client_id);
      setPaypalEnabled(s.paypal_enabled);
      setPaypalSandbox(s.paypal_sandbox);
      setCurrency(s.billing_currency);
      setModels(await listModels());
    } catch (err: any) {
      if (err?.response?.status === 403) setForbidden(true);
      else toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (embeddingsProvider === "openrouter" && !embeddingMain.trim()) {
      toast.error("Set a main embedding model before switching to OpenRouter");
      return;
    }
    if (embeddingsProvider === "huggingface" && !embeddingHuggingface.trim()) {
      toast.error("Set an embedding model before switching to Hugging Face");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateSettings({
        openrouter_api_key: openrouterKey || undefined,
        voyage_api_key: voyageKey || undefined,
        openrouter_base_url: baseUrl || undefined,
        default_chat_model: defaultModel || undefined,
        fonnte_account_token: fonnteToken || undefined,
        field_encryption_key: encryptionKey || undefined,
        embeddings_provider: embeddingsProvider,
        embedding_model_openrouter_main: embeddingMain || undefined,
        embedding_model_openrouter_fallback_1: embeddingFallback1 || undefined,
        embedding_model_openrouter_fallback_2: embeddingFallback2 || undefined,
        huggingface_api_key: huggingfaceKey || undefined,
        embedding_model_huggingface: embeddingHuggingface || undefined,
        evolution_base_url: evolutionUrl || undefined,
        evolution_api_key: evolutionKey || undefined,
        whatsapp_default_provider: waProvider,
        paypal_client_id: paypalClientId || undefined,
        paypal_client_secret: paypalSecret || undefined,
        paypal_enabled: paypalEnabled,
        paypal_sandbox: paypalSandbox,
        billing_currency: currency || undefined,
      });
      setSettings(updated);
      setOpenrouterKey("");
      setVoyageKey("");
      setHuggingfaceKey("");
      setFonnteToken("");
      setEvolutionKey("");
      setPaypalSecret("");
      setEncryptionKey("");
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save");
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
        <p className="mt-2 text-sm">
          These settings are global API keys for the platform. Ask an operator to grant your account
          platform-admin (<code>scripts/make_admin.py your@email</code>).
        </p>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950">
          <KeyRound size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">API Keys & Models</h1>
          <p className="text-sm text-slate-500">
            Stored securely server-side. Keys are never shown in full after saving.
          </p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <SecretField
          label="OpenRouter API key"
          help="Chat models (Claude, GPT, gpt-oss, Mistral, Gemma…) — one key. Get it at openrouter.ai/keys"
          isSet={settings!.openrouter_api_key_set}
          hint={settings!.openrouter_api_key_hint}
          value={openrouterKey}
          onChange={setOpenrouterKey}
        />
        <div>
          <label className="mb-1 block text-sm font-medium">Embedding model provider</label>
          <select
            value={embeddingsProvider}
            onChange={(e) => setEmbeddingsProvider(e.target.value as "voyage" | "openrouter" | "huggingface")}
            className={inputCls}
          >
            <option value="voyage">Voyage AI</option>
            <option value="openrouter">OpenRouter</option>
            <option value="huggingface">Hugging Face</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Used for knowledge-base search. Voyage AI&apos;s free tier is rate-limited (3 RPM /
            10K TPM) — switch to OpenRouter or Hugging Face for higher-volume commercial use. The
            model&apos;s output must match the {" "}
            <code className="font-mono">EMBEDDING_DIM</code> the database is configured for
            (1024 by default) — a mismatched model fails ingestion.
          </p>
        </div>

        {embeddingsProvider === "voyage" && (
          <SecretField
            label="Voyage API key"
            help="Embeddings for knowledge-base search. Get it at dashboard.voyageai.com"
            isSet={settings!.voyage_api_key_set}
            hint={settings!.voyage_api_key_hint}
            value={voyageKey}
            onChange={setVoyageKey}
          />
        )}

        {embeddingsProvider === "openrouter" && (
          <div className="space-y-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs text-slate-500">
              Uses the OpenRouter API key above. Models are tried in order — main first, then each
              fallback — until one succeeds. 1024-dim options: <code className="font-mono">baai/bge-m3</code>,{" "}
              <code className="font-mono">mistralai/mistral-embed-2312</code>.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium">Main embedding model</label>
              <input
                value={embeddingMain}
                onChange={(e) => setEmbeddingMain(e.target.value)}
                placeholder="e.g. baai/bge-m3"
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Fallback embedding model 1</label>
              <input
                value={embeddingFallback1}
                onChange={(e) => setEmbeddingFallback1(e.target.value)}
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Fallback embedding model 2</label>
              <input
                value={embeddingFallback2}
                onChange={(e) => setEmbeddingFallback2(e.target.value)}
                className={`${inputCls} font-mono`}
              />
            </div>
          </div>
        )}

        {embeddingsProvider === "huggingface" && (
          <div className="space-y-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <SecretField
              label="Hugging Face API key"
              help="Inference API token for feature-extraction (embeddings). Get it at huggingface.co/settings/tokens"
              isSet={settings!.huggingface_api_key_set}
              hint={settings!.huggingface_api_key_hint}
              value={huggingfaceKey}
              onChange={setHuggingfaceKey}
            />
            <div>
              <label className="mb-1 block text-sm font-medium">Embedding model</label>
              <input
                value={embeddingHuggingface}
                onChange={(e) => setEmbeddingHuggingface(e.target.value)}
                placeholder="e.g. BAAI/bge-m3"
                className={`${inputCls} font-mono`}
              />
              <p className="mt-1 text-xs text-slate-500">
                Must be a sentence-embedding model hosted on the HF Inference API and output
                1024-dim vectors (e.g. <code className="font-mono">BAAI/bge-m3</code>).
              </p>
            </div>
          </div>
        )}
        <SecretField
          label="Fonnte account token"
          help="Platform WhatsApp gateway account — provisions a device per bot when a client connects WhatsApp. Get it at fonnte.com"
          isSet={settings!.fonnte_account_token_set}
          hint={settings!.fonnte_account_token_hint}
          value={fonnteToken}
          onChange={setFonnteToken}
        />
        <div>
          <label className="mb-1 block text-sm font-medium">WhatsApp provider for new connections</label>
          <select value={waProvider} onChange={(e) => setWaProvider(e.target.value as "fonnte" | "evolution")} className={inputCls}>
            <option value="evolution">Evolution API (self-hosted)</option>
            <option value="fonnte">Fonnte</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Applies to numbers connected from now on. Already-linked numbers keep the provider they were connected with.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Evolution API base URL</label>
          <input
            value={evolutionUrl}
            onChange={(e) => setEvolutionUrl(e.target.value)}
            placeholder="https://evolution.example.com"
            className={`${inputCls} font-mono`}
          />
        </div>
        <SecretField
          label="Evolution API global key"
          help="The server's AUTHENTICATION_API_KEY — used to create a WhatsApp instance per bot."
          isSet={settings!.evolution_api_key_set}
          hint={settings!.evolution_api_key_hint}
          value={evolutionKey}
          onChange={setEvolutionKey}
        />

        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-3 text-sm font-semibold">Payments</div>
          <label className="mb-1 block text-sm font-medium">Billing currency</label>
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
            placeholder="MYR"
            className={`${inputCls} w-28 font-mono`}
          />
          <p className="mt-1 text-xs text-slate-500">
            Currency this deployment&apos;s package prices are quoted in (MYR for Malaysia, AUD for Australia). Billplz
            only collects MYR; PayPal collects whatever is set here.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">PayPal client ID</label>
              <input value={paypalClientId} onChange={(e) => setPaypalClientId(e.target.value)} className={`${inputCls} font-mono`} />
            </div>
            <SecretField
              label="PayPal client secret"
              help="From your PayPal developer app (use sandbox credentials while testing)."
              isSet={settings!.paypal_client_secret_set}
              hint={settings!.paypal_client_secret_hint}
              value={paypalSecret}
              onChange={setPaypalSecret}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={paypalSandbox} onChange={(e) => setPaypalSandbox(e.target.checked)} />
              Sandbox mode (test payments only)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={paypalEnabled} onChange={(e) => setPaypalEnabled(e.target.checked)} />
              Enable PayPal checkout
            </label>
            <button
              type="button"
              onClick={() =>
                testPaypal()
                  .then(() => toast.success("PayPal credentials work"))
                  .catch((err: any) => toast.error(err?.response?.data?.detail || "PayPal test failed — save first, then test"))
              }
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Test saved credentials
            </button>
          </div>
        </div>

        <SecretField
          label="Field encryption key"
          help={
            settings!.field_encryption_key_set
              ? "Encrypts WhatsApp device tokens at rest. Changing this makes already-connected numbers undecryptable — only replace it if you know what you're doing."
              : "Required before connecting any WhatsApp number. Generate one: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
          }
          isSet={settings!.field_encryption_key_set}
          hint={null}
          value={encryptionKey}
          onChange={setEncryptionKey}
        />

        <div>
          <label className="mb-1 block text-sm font-medium">Default chat model</label>
          <select value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)} className={inputCls}>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.provider}
              </option>
            ))}
            {/* keep whatever is stored even if not in the catalog */}
            {defaultModel && !models.some((m) => m.id === defaultModel) && (
              <option value={defaultModel}>{defaultModel} (custom)</option>
            )}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Rarely used — only as a last-resort fallback if a package has no fallback chain of its
            own. Set each package&apos;s chat models under Admin &rarr; Packages.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">OpenRouter base URL</label>
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className={`${inputCls} font-mono`} />
          <p className="mt-1 text-xs text-slate-500">Advanced — change only to use a different gateway (e.g. a local model server).</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
