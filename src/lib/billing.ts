import { api } from "./api";
import type { FallbackTier } from "./settings";

export type Package = {
  id: number;
  slug: string;
  name: string;
  price_myr: number;
  monthly_token_quota: number;
  max_bots: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
  /** Whether a bot on this plan can connect WhatsApp (Fonnte) at all. */
  whatsapp_enabled: boolean;
  /** Ordered chat fallback chain for this plan — models tried top to bottom until
   *  one answers. Null means it inherits the platform-wide chain from Settings. */
  fallback_chain: FallbackTier[] | null;
  /** ISO currency price_myr is quoted in on this deployment (e.g. MYR, AUD). */
  currency?: string;
};

export type Subscription = {
  plan: string;
  plan_name: string;
  status: string;
  tokens_used: number;
  tokens_quota: number;
  tokens_remaining: number;
  max_bots: number;
  period_start: string | null;
  next_billing_date: string | null;
};

export type ClientRow = {
  organization_id: number;
  organization_name: string;
  owner_email: string | null;
  plan: string;
  tokens_used: number;
  tokens_quota: number;
  bots: number;
  created_at: string | null;
  start_date: string | null;
  next_billing_date: string | null;
};

export type ClientsPage = {
  items: ClientRow[];
  total: number;
  page: number;
  page_size: number;
};

export type ClientDetail = {
  client: ClientRow;
  subscription_status: string;
  messages_used: number;
  period_start: string | null;
  last_reminder_sent: string | null;
  support_email: string | null;
  support_whatsapp: string | null;
  conversations: number;
  conversations_needing_human: number;
  last_conversation_at: string | null;
  users: {
    id: number;
    email: string;
    full_name: string | null;
    phone: string | null;
    role: string;
    is_active: boolean;
    is_email_verified: boolean;
    last_seen_at: string | null;
    created_at: string | null;
  }[];
  bots: {
    id: number;
    name: string;
    is_active: boolean;
    chat_model: string | null;
    handoff_mode: string;
    whatsapp_number: string | null;
    knowledge_sources: number;
    channels: string[];
    created_at: string | null;
  }[];
  payments: {
    id: number;
    plan_slug: string;
    amount_cents: number;
    method: string;
    status: string;
    sandbox: boolean;
    reference_note: string | null;
    paid_at: string | null;
    created_at: string | null;
  }[];
};

export type PackageUpsert = Omit<Package, "id">;

// ----- client-facing -----
export async function listPackages(): Promise<Package[]> {
  return (await api.get("/billing/packages")).data;
}
export async function getSubscription(): Promise<Subscription> {
  return (await api.get("/billing/subscription")).data;
}
export async function subscribe(packageSlug: string): Promise<Subscription> {
  return (await api.post("/billing/subscribe", { package_slug: packageSlug })).data;
}

export type CheckoutResult = {
  payment_url: string | null; // paid plan -> redirect the browser here
  bill_id: string | null;
  subscription: Subscription | null; // free plan / downgrade -> already applied
};
export async function checkout(packageSlug: string, gateway?: "billplz" | "paypal"): Promise<CheckoutResult> {
  return (await api.post("/billing/checkout", { package_slug: packageSlug, gateway })).data;
}

export type Gateways = { currency: string; billplz: boolean; paypal: boolean; bank_transfer: boolean };
export async function getGateways(): Promise<Gateways> {
  return (await api.get("/billing/gateways")).data;
}
export async function paypalCapture(orderId: string): Promise<{ status: "activated" | "already-paid" | "not-paid" }> {
  return (await api.post("/billing/paypal/capture", { order_id: orderId })).data;
}

// ----- platform admin -----
export async function adminListPackages(): Promise<Package[]> {
  return (await api.get("/admin/packages")).data;
}
export async function adminCreatePackage(p: PackageUpsert): Promise<Package> {
  return (await api.post("/admin/packages", p)).data;
}
export async function adminUpdatePackage(id: number, p: PackageUpsert): Promise<Package> {
  return (await api.put(`/admin/packages/${id}`, p)).data;
}
export async function adminDeletePackage(id: number): Promise<void> {
  await api.delete(`/admin/packages/${id}`);
}
export async function adminListClients(): Promise<ClientRow[]> {
  return (await api.get("/admin/clients")).data;
}
export async function adminListClientsPaged(page: number, pageSize: number, q?: string): Promise<ClientsPage> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  if (q) params.q = q;
  return (await api.get("/admin/clients/paged", { params })).data;
}
export async function adminGetClient(orgId: number): Promise<ClientDetail> {
  return (await api.get(`/admin/clients/${orgId}`)).data;
}
export async function adminSetClientPlan(orgId: number, packageSlug: string): Promise<ClientRow> {
  return (await api.put(`/admin/clients/${orgId}/plan`, { package_slug: packageSlug })).data;
}
export async function adminSetClientBillingDate(orgId: number, startDate: string): Promise<ClientRow> {
  return (await api.put(`/admin/clients/${orgId}/billing-date`, { start_date: startDate })).data;
}
export async function adminSendReminder(orgId: number): Promise<void> {
  await api.post(`/admin/clients/${orgId}/send-reminder`);
}
export async function adminSendAllReminders(): Promise<{ reminders_sent: number }> {
  return (await api.post("/admin/billing/send-renewal-reminders")).data;
}

// ----- Billplz gateway settings (platform admin) -----
export type BillplzSettings = {
  enabled: boolean;
  sandbox: boolean; // which credential set is currently active
  configured: boolean; // the ACTIVE set has an api key + collection

  live_api_key_set: boolean;
  live_api_key_hint: string | null;
  live_x_signature_key_set: boolean;
  live_x_signature_key_hint: string | null;
  live_collection_id: string;

  sandbox_api_key_set: boolean;
  sandbox_api_key_hint: string | null;
  sandbox_x_signature_key_set: boolean;
  sandbox_x_signature_key_hint: string | null;
  sandbox_collection_id: string;
};

export type BillplzUpdate = {
  enabled?: boolean;
  sandbox?: boolean;
  live_api_key?: string; // blank -> keep existing
  live_x_signature_key?: string; // blank -> keep existing
  live_collection_id?: string; // "" clears it
  sandbox_api_key?: string; // blank -> keep existing
  sandbox_x_signature_key?: string; // blank -> keep existing
  sandbox_collection_id?: string; // "" clears it
};

export type PaymentRow = {
  id: number;
  organization_id: number;
  organization_name: string | null;
  plan_slug: string;
  amount_cents: number;
  currency: string;
  method: string; // billplz | paypal | bank_transfer
  status: string; // pending | paid | failed
  sandbox: boolean;
  billplz_bill_id: string | null;
  paypal_order_id: string | null;
  reference_note: string | null;
  reported_at: string | null;
  paid_at: string | null;
  created_at: string | null;
};
export type PaymentsSummary = {
  total: number;
  paid: number;
  pending: number;
  failed: number;
  live_revenue_cents: number;
  currency: string;
};
export type PaymentsResult = { summary: PaymentsSummary; payments: PaymentRow[] };

export async function adminListPayments(status?: string, limit = 200): Promise<PaymentsResult> {
  const params: Record<string, string | number> = { limit };
  if (status) params.status = status;
  return (await api.get("/admin/payments", { params })).data;
}

export async function getBillplz(): Promise<BillplzSettings> {
  return (await api.get("/admin/billplz")).data;
}
export async function updateBillplz(p: BillplzUpdate): Promise<BillplzSettings> {
  return (await api.put("/admin/billplz", p)).data;
}
export async function testBillplz(): Promise<void> {
  await api.post("/admin/billplz/test");
}

export async function adminConfirmPayment(paymentId: number): Promise<PaymentRow> {
  return (await api.post(`/admin/payments/${paymentId}/confirm`)).data;
}

// ----- Bank transfer fallback payment -----
export type BankTransferSettings = {
  enabled: boolean;
  bank_name: string;
  account_name: string;
  account_number: string;
  qr_url: string | null;
  notify_channel_id: number | null;
  notify_whatsapp_number: string;
  configured: boolean;
};

export type BankTransferUpdate = {
  enabled?: boolean;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  notify_channel_id?: number;
  notify_whatsapp_number?: string;
};

export type WhatsappChannelOption = {
  id: number;
  bot_name: string;
  organization_name: string;
  phone_number_id: string | null;
};

// client-facing
export async function getBankTransfer(): Promise<BankTransferSettings> {
  return (await api.get("/billing/bank-transfer")).data;
}
export async function reportBankTransfer(packageSlug: string, note: string): Promise<{ payment_id: number; status: string }> {
  return (await api.post("/billing/bank-transfer/report", { package_slug: packageSlug, note })).data;
}

// platform admin
export async function adminGetBankTransfer(): Promise<BankTransferSettings> {
  return (await api.get("/admin/bank-transfer")).data;
}
export async function adminUpdateBankTransfer(p: BankTransferUpdate): Promise<BankTransferSettings> {
  return (await api.put("/admin/bank-transfer", p)).data;
}
export async function adminUploadBankTransferQr(file: File): Promise<BankTransferSettings> {
  const form = new FormData();
  form.append("file", file);
  return (await api.post("/admin/bank-transfer/qr", form, { headers: { "Content-Type": "multipart/form-data" } })).data;
}
export async function adminListWhatsappChannels(): Promise<WhatsappChannelOption[]> {
  return (await api.get("/admin/whatsapp-channels")).data;
}
