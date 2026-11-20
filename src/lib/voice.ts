import axios from "axios";
import { api } from "./api";

/** The backend's `detail` message from a failed request, or `fallback`. */
export function errorDetail(e: unknown, fallback: string): string {
  const detail = axios.isAxiosError(e) ? e.response?.data?.detail : undefined;
  return typeof detail === "string" && detail ? detail : fallback;
}

// ----- AI phone lines (Telnyx number answered by an ElevenLabs agent) -----

export type VoiceLineStatus =
  | "draft"
  | "submitted"
  | "ordered"
  | "info_needed"
  | "number_ready"
  | "active"
  | "released"
  | "failed";

export type VoiceOption = { voice_id: string; name: string; description: string; preview_url: string };

export type VoiceLine = {
  id: number;
  bot_id: number;
  status: VoiceLineStatus;
  status_message: string | null;
  business_name: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  street_address: string | null;
  locality: string | null;
  administrative_area: string | null;
  postal_code: string | null;
  preferred_locality: string | null;
  document_filename: string | null;
  phone_number: string | null;
  voice_id: string | null;
  first_message: string | null;
  timezone: string | null;
  transfer_number: string | null;
  max_call_seconds: number | null;
  submitted_at: string | null;
  activated_at: string | null;
};

export type VoicePage = {
  site_enabled: boolean;
  plan_allows: boolean;
  minutes_included: number;
  minutes_used: number;
  can_edit: boolean;
  line: VoiceLine;
  voices: VoiceOption[];
};

export type VoiceSettingsUpdate = Partial<
  Pick<VoiceLine, "voice_id" | "first_message" | "timezone" | "transfer_number" | "max_call_seconds">
>;

/** What the subscriber is told for each status. */
export const STATUS_TEXT: Record<VoiceLineStatus, { label: string; tone: "slate" | "amber" | "indigo" | "emerald" | "red" }> = {
  draft: { label: "Not requested", tone: "slate" },
  submitted: { label: "Request received — we're reviewing it", tone: "indigo" },
  ordered: { label: "Number ordered — the carrier is checking your documents", tone: "indigo" },
  info_needed: { label: "More information needed", tone: "amber" },
  number_ready: { label: "Number approved — switching it on", tone: "indigo" },
  active: { label: "Live — answering calls", tone: "emerald" },
  released: { label: "Line closed", tone: "slate" },
  failed: { label: "Order failed — we'll be in touch", tone: "red" },
};

/** +61283902245 -> +61 2 8390 2245; mobiles +61 4xx xxx xxx. */
export function formatAu(e164: string): string {
  const m = e164.match(/^\+61(4\d{2})(\d{3})(\d{3})$/) || e164.match(/^\+61(\d)(\d{4})(\d{4})$/);
  return m ? `+61 ${m.slice(1).join(" ")}` : e164;
}

let availability: Promise<boolean> | null = null;

/** Whether this site offers phone lines at all (cached for the session). */
export function voiceAvailable(): Promise<boolean> {
  availability ??= api
    .get("/voice/available")
    .then((r) => Boolean(r.data?.enabled))
    .catch(() => false);
  return availability;
}

export async function getVoice(botId: number): Promise<VoicePage> {
  return (await api.get(`/bots/${botId}/voice`)).data;
}

export async function requestNumber(botId: number, form: FormData): Promise<VoicePage> {
  return (await api.post(`/bots/${botId}/voice/request`, form, { headers: { "Content-Type": "multipart/form-data" } })).data;
}

export async function updateVoiceSettings(botId: number, changes: VoiceSettingsUpdate): Promise<VoicePage> {
  return (await api.put(`/bots/${botId}/voice/settings`, changes)).data;
}

// ----- Platform admin -----

export type AdminVoiceLine = VoiceLine & {
  organization_id: number;
  organization_name: string | null;
  bot_name: string | null;
  country_code: string;
  telnyx_status: string | null;
  telnyx_number_order_id: string | null;
  el_agent_id: string | null;
  has_document: boolean;
  calls: number;
  minutes: number;
};

export type AvailableNumber = {
  phone_number: string;
  locality: string;
  upfront_cost: string | null;
  monthly_cost: string | null;
  currency: string | null;
};

export type AdminVoiceSettings = {
  enabled: boolean;
  telnyx_api_key_set: boolean;
  telnyx_api_key_hint: string | null;
  telnyx_sip_connection_id: string;
  elevenlabs_api_key_set: boolean;
  elevenlabs_api_key_hint: string | null;
  webhook_configured: boolean;
  webhook_url: string;
  tts_model: string;
  voices: VoiceOption[];
};

export type AdminVoiceSettingsUpdate = {
  enabled?: boolean;
  telnyx_api_key?: string;
  telnyx_sip_connection_id?: string;
  elevenlabs_api_key?: string;
  tts_model?: string;
  voices?: VoiceOption[];
};

export const getAdminVoiceSettings = async (): Promise<AdminVoiceSettings> => (await api.get("/admin/voice/settings")).data;
export const updateAdminVoiceSettings = async (u: AdminVoiceSettingsUpdate): Promise<AdminVoiceSettings> =>
  (await api.put("/admin/voice/settings", u)).data;
export const testVoiceConnections = async (): Promise<{ telnyx: string; elevenlabs: string }> =>
  (await api.post("/admin/voice/test")).data;
export const createVoiceWebhook = async (): Promise<AdminVoiceSettings> => (await api.post("/admin/voice/webhook")).data;
export const addCatalogVoice = async (voice_id: string): Promise<AdminVoiceSettings> =>
  (await api.post("/admin/voice/voices", { voice_id })).data;

export const listVoiceLines = async (): Promise<AdminVoiceLine[]> => (await api.get("/admin/voice/lines")).data;
export const voiceDocumentUrl = async (id: number): Promise<string> =>
  (await api.get(`/admin/voice/lines/${id}/document`)).data.url;
export const searchVoiceNumbers = async (id: number, locality: string): Promise<AvailableNumber[]> =>
  (await api.get(`/admin/voice/lines/${id}/numbers`, { params: { locality } })).data;
export const orderVoiceNumber = async (id: number, phone_number: string): Promise<AdminVoiceLine> =>
  (await api.post(`/admin/voice/lines/${id}/order`, { phone_number })).data;
export const syncVoiceLine = async (id: number): Promise<AdminVoiceLine> => (await api.post(`/admin/voice/lines/${id}/sync`)).data;
export const activateVoiceLine = async (id: number): Promise<AdminVoiceLine> =>
  (await api.post(`/admin/voice/lines/${id}/activate`)).data;
export const noteVoiceLine = async (id: number, message: string, needs_info: boolean): Promise<AdminVoiceLine> =>
  (await api.post(`/admin/voice/lines/${id}/note`, { message, needs_info })).data;
export const releaseVoiceLine = async (id: number, release_number: boolean): Promise<AdminVoiceLine> =>
  (await api.post(`/admin/voice/lines/${id}/release`, { release_number })).data;
