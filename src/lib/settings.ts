import { api } from "./api";

export type SettingsOut = {
  openrouter_api_key_set: boolean;
  openrouter_api_key_hint: string | null;
  voyage_api_key_set: boolean;
  voyage_api_key_hint: string | null;
  openrouter_base_url: string;
  default_chat_model: string;
  fonnte_account_token_set: boolean;
  fonnte_account_token_hint: string | null;
  field_encryption_key_set: boolean;
  embeddings_provider: "voyage" | "openrouter" | "huggingface";
  embedding_model_openrouter_main: string;
  embedding_model_openrouter_fallback_1: string;
  embedding_model_openrouter_fallback_2: string;
  huggingface_api_key_set: boolean;
  huggingface_api_key_hint: string | null;
  embedding_model_huggingface: string;
  evolution_base_url: string;
  evolution_api_key_set: boolean;
  evolution_api_key_hint: string | null;
  whatsapp_default_provider: "fonnte" | "evolution";
  paypal_live_client_id: string;
  paypal_live_client_secret_set: boolean;
  paypal_live_client_secret_hint: string | null;
  paypal_sandbox_client_id: string;
  paypal_sandbox_client_secret_set: boolean;
  paypal_sandbox_client_secret_hint: string | null;
  paypal_enabled: boolean;
  paypal_sandbox: boolean;
  billing_currency: string;
};

export type SettingsUpdate = {
  openrouter_api_key?: string;
  voyage_api_key?: string;
  openrouter_base_url?: string;
  default_chat_model?: string;
  fonnte_account_token?: string;
  field_encryption_key?: string;
  embeddings_provider?: "voyage" | "openrouter" | "huggingface";
  embedding_model_openrouter_main?: string;
  embedding_model_openrouter_fallback_1?: string;
  embedding_model_openrouter_fallback_2?: string;
  huggingface_api_key?: string;
  embedding_model_huggingface?: string;
  evolution_base_url?: string;
  evolution_api_key?: string;
  whatsapp_default_provider?: "fonnte" | "evolution";
  paypal_live_client_id?: string;
  paypal_live_client_secret?: string;
  paypal_sandbox_client_id?: string;
  paypal_sandbox_client_secret?: string;
  paypal_enabled?: boolean;
  paypal_sandbox?: boolean;
  billing_currency?: string;
};

export async function getSettings(): Promise<SettingsOut> {
  const res = await api.get("/admin/settings");
  return res.data;
}

export async function testPaypal(mode?: "sandbox" | "live"): Promise<void> {
  await api.post("/admin/paypal/test", null, { params: mode ? { mode } : undefined });
}

export async function updateSettings(payload: SettingsUpdate): Promise<SettingsOut> {
  const res = await api.put("/admin/settings", payload);
  return res.data;
}

/** One rung of a package's chat fallback chain — which model actually answers
 *  a bot's question, tried top to bottom until one succeeds. Set per-package
 *  under Admin -> Packages. */
export type FallbackTier = {
  label: string;
  provider: "self_hosted" | "openrouter";
  base_url: string | null;
  model: string;
};

// ----- airevo.com.au marketplace connection (platform admin) -----
export type AirevoSettings = {
  enabled: boolean;
  configured: boolean;
  sells_paid_plans: boolean;
  key_id: string;
  secret_set: boolean;
  secret_hint: string | null;
  api_base: string;
  listing_url: string;
};

export type AirevoUpdate = {
  enabled?: boolean;
  key_id?: string;
  secret?: string; // blank -> keep existing
  api_base?: string;
  listing_url?: string;
};

export async function getAirevo(): Promise<AirevoSettings> {
  return (await api.get("/admin/airevo")).data;
}

export async function updateAirevo(p: AirevoUpdate): Promise<AirevoSettings> {
  return (await api.put("/admin/airevo", p)).data;
}

export async function testAirevo(): Promise<void> {
  await api.post("/admin/airevo/test");
}
