"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { CreditCard, Check, Loader2, Zap, Banknote, X } from "lucide-react";
import {
  listPackages,
  getSubscription,
  checkout,
  getGateways,
  paypalCapture,
  getBankTransfer,
  reportBankTransfer,
  type Package,
  type Subscription,
  type BankTransferSettings,
  type Gateways,
} from "@/lib/billing";
import { price } from "@/lib/money";

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${n}`;
}

export default function BillingPage() {
  const [pkgs, setPkgs] = useState<Package[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [gateways, setGateways] = useState<Gateways | null>(null);
  const [bankTransfer, setBankTransfer] = useState<BankTransferSettings | null>(null);
  const [reportingSlug, setReportingSlug] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const load = async () => {
    const [p, s] = await Promise.all([listPackages(), getSubscription()]);
    setPkgs(p);
    setSub(s);
    getGateways().then(setGateways).catch(() => setGateways(null));
    try {
      const bt = await getBankTransfer();
      if (bt.configured) setBankTransfer(bt);
    } catch {
      /* bank transfer is optional — ignore if unavailable */
    }
  };

  useEffect(() => {
    load()
      .catch(() => toast.error("Failed to load billing"))
      .finally(() => setLoading(false));
    handleBillplzReturn();
    handlePaypalReturn();
  }, []);

  const submitBankTransfer = async () => {
    if (!reportingSlug) return;
    setSubmittingReport(true);
    try {
      await reportBankTransfer(reportingSlug, note);
      toast.success("Thanks — we'll confirm your transfer and activate your plan shortly.");
      setReportingSlug(null);
      setNote("");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Could not report the transfer");
    } finally {
      setSubmittingReport(false);
    }
  };

  // Billplz redirects back with ?billplz[paid]=true&billplz[id]=… after payment.
  // The webhook activates the plan server-side; here we confirm and refresh (the
  // callback may land a moment after the redirect, so re-poll a few times).
  const handleBillplzReturn = () => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const paid = params.get("billplz[paid]");
    if (paid === null) return;
    // Strip the Billplz params so a refresh doesn't re-trigger this.
    window.history.replaceState({}, "", window.location.pathname);
    if (paid === "true") {
      toast.success("Payment received — activating your plan…");
      let tries = 0;
      const poll = async () => {
        tries += 1;
        try {
          const s = await getSubscription();
          setSub(s);
          if (s.status === "active" && s.plan !== "free") return;
        } catch {
          /* keep polling */
        }
        if (tries < 5) setTimeout(poll, 2000);
      };
      poll();
    } else {
      toast.error("Payment wasn't completed. You can try again below.");
    }
  };

  // PayPal redirects back with ?gateway=paypal&token=<order id>&PayerID=… once the
  // payer approves (or &cancelled=1). The capture call is what confirms payment.
  const handlePaypalReturn = () => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("gateway") !== "paypal") return;
    const orderId = params.get("token");
    const cancelled = params.get("cancelled") === "1";
    window.history.replaceState({}, "", window.location.pathname);
    if (cancelled || !orderId) {
      toast.error("Payment wasn't completed. You can try again below.");
      return;
    }
    toast.loading("Confirming your PayPal payment…", { id: "pp" });
    paypalCapture(orderId)
      .then(async (r) => {
        if (r.status === "not-paid") {
          toast.error("PayPal hasn't confirmed the payment yet. Please try again.", { id: "pp" });
          return;
        }
        toast.success("Payment received — your plan is active.", { id: "pp" });
        setSub(await getSubscription());
      })
      .catch((err: any) => toast.error(err?.response?.data?.detail || "Could not confirm the PayPal payment", { id: "pp" }));
  };

  const onSubscribe = async (slug: string, gateway?: "billplz" | "paypal") => {
    setBusy(slug);
    try {
      const res = await checkout(slug, gateway);
      if (res.payment_url) {
        // Paid plan — hand off to Billplz to collect payment.
        toast.loading(gateway === "paypal" ? "Redirecting to PayPal…" : "Redirecting to secure payment…", { id: "pay" });
        window.location.href = res.payment_url;
        return;
      }
      if (res.subscription) {
        setSub(res.subscription);
        toast.success(`You're on the ${res.subscription.plan_name} plan`);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 503) toast.error("Online payment isn't enabled yet — contact us to activate a paid plan.");
      else toast.error(err?.response?.data?.detail || "Could not change plan");
    } finally {
      setBusy(null);
    }
  };

  if (loading || !sub) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const pct = sub.tokens_quota > 0 ? Math.min(100, Math.round((sub.tokens_used / sub.tokens_quota) * 100)) : 0;
  const low = sub.tokens_remaining <= sub.tokens_quota * 0.1;
  const currentPkg = pkgs.find((p) => p.slug === sub.plan);
  const isPaidPlan = (currentPkg?.price_myr ?? 0) > 0;
  const daysToDue = sub.next_billing_date
    ? Math.ceil((new Date(sub.next_billing_date).getTime() - Date.now()) / 86_400_000)
    : null;
  // Billplz (MYR) is the default when live; otherwise PayPal.
  const primaryGateway: "billplz" | "paypal" | undefined = gateways?.billplz ? "billplz" : gateways?.paypal ? "paypal" : undefined;
  const dueSoon = isPaidPlan && daysToDue !== null && daysToDue <= 7;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold">Billing &amp; plan</h1>

      {/* Current plan + usage */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950">
              <CreditCard size={20} />
            </div>
            <div>
              <div className="text-lg font-semibold">{sub.plan_name} plan</div>
              <div className="text-xs text-slate-500">
                Up to {sub.max_bots} bot(s) · status: {sub.status}
                {sub.next_billing_date && (
                  <> · renews {new Date(sub.next_billing_date).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}</>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium">Tokens this month</span>
            <span className="text-slate-500">
              {fmt(sub.tokens_used)} / {fmt(sub.tokens_quota)} used
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full ${low ? "bg-rose-500" : "bg-indigo-600"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className={`mt-1 text-xs ${low ? "text-rose-600" : "text-slate-500"}`}>
            {fmt(sub.tokens_remaining)} tokens remaining{low ? " — running low, consider upgrading" : ""}
          </div>
        </div>
      </div>

      {/* Payment due banner */}
      {dueSoon && currentPkg && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
          <div className="text-sm">
            <div className="font-semibold">
              {daysToDue! < 0 ? "Your payment is overdue" : "Your payment is due soon"}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              {currentPkg.name} plan · {price(currentPkg.price_myr, currentPkg.currency)} ·{" "}
              {daysToDue! < 0 ? `was due ${Math.abs(daysToDue!)} day(s) ago` : `due in ${daysToDue} day(s)`}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              disabled={busy === currentPkg.slug}
              onClick={() => onSubscribe(currentPkg.slug, primaryGateway)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy === currentPkg.slug ? "…" : `Pay ${price(currentPkg.price_myr, currentPkg.currency)} now`}
            </button>
            {gateways?.billplz && gateways.paypal && (
              <button
                disabled={busy === currentPkg.slug}
                onClick={() => onSubscribe(currentPkg.slug, "paypal")}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-white disabled:opacity-60 dark:border-slate-700"
              >
                PayPal
              </button>
            )}
            {bankTransfer && (
              <button
                onClick={() => setReportingSlug(currentPkg.slug)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-white dark:border-slate-700"
              >
                <Banknote size={14} /> Bank transfer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plans */}
      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-500">Plans</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pkgs.map((p) => {
          const current = p.slug === sub.plan;
          return (
            <div
              key={p.id}
              className={`flex flex-col rounded-2xl border p-5 ${
                current
                  ? "border-indigo-500 bg-indigo-50/40 dark:border-indigo-500 dark:bg-indigo-950/30"
                  : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{p.name}</div>
                {current && (
                  <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white">current</span>
                )}
              </div>
              <div className="mt-2 text-2xl font-bold">
                {p.price_myr === 0 ? "Free" : <>{price(p.price_myr, p.currency)}<span className="text-sm font-normal text-slate-500">/mo</span></>}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <Zap size={12} /> {fmt(p.monthly_token_quota)} tokens · {p.max_bots} bot(s)
              </div>
              <ul className="mt-3 flex-1 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                {p.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <Check size={13} className="mt-0.5 shrink-0 text-emerald-500" /> {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={(current && p.price_myr === 0) || busy === p.slug}
                onClick={() => onSubscribe(p.slug, primaryGateway)}
                className={`mt-4 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
                  current && p.price_myr === 0
                    ? "cursor-default bg-slate-100 text-slate-400 dark:bg-slate-800"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {busy === p.slug
                  ? "…"
                  : current
                    ? p.price_myr === 0 ? "Current plan" : "Renew / pay now"
                    : p.price_myr === 0 ? "Switch to Free" : "Choose plan"}
              </button>
              {p.price_myr > 0 && gateways?.billplz && gateways.paypal && (
                <button
                  disabled={busy === p.slug}
                  onClick={() => onSubscribe(p.slug, "paypal")}
                  className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Pay with PayPal
                </button>
              )}
              {p.price_myr > 0 && bankTransfer && (
                <button
                  onClick={() => setReportingSlug(p.slug)}
                  className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Banknote size={13} /> Pay by bank transfer
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Paid plans are billed securely through {[gateways?.billplz && "Billplz (FPX / card)", gateways?.paypal && "PayPal", bankTransfer && "manual bank transfer"].filter(Boolean).join(", or ") || "our team"}.
        Your plan activates once payment is confirmed. Switching to Free takes effect immediately.
      </p>

      {/* Bank transfer instructions + report modal */}
      {reportingSlug && bankTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Banknote size={18} className="text-emerald-600" /> Pay by bank transfer
              </div>
              <button onClick={() => setReportingSlug(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800">
              <div><span className="text-slate-500">Bank:</span> {bankTransfer.bank_name}</div>
              <div><span className="text-slate-500">Account name:</span> {bankTransfer.account_name}</div>
              <div><span className="text-slate-500">Account number:</span> {bankTransfer.account_number}</div>
            </div>

            {bankTransfer.qr_url && (
              <div className="mt-4 flex justify-center">
                <img src={bankTransfer.qr_url} alt="Bank transfer QR code" className="h-40 w-40 rounded-lg border border-slate-200 object-contain dark:border-slate-700" />
              </div>
            )}

            <p className="mt-4 text-xs text-slate-500">
              Transfer the plan amount, then add any reference so we can match it (optional), and submit —
              we&rsquo;ll confirm and activate your plan.
              {bankTransfer.notify_whatsapp_number && (
                <> You can also message us directly on WhatsApp at {bankTransfer.notify_whatsapp_number}.</>
              )}
            </p>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Transferred RM99 on 26 Jul, own bank ref ABC123"
              rows={3}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setReportingSlug(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={submitBankTransfer}
                disabled={submittingReport}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {submittingReport ? "Submitting…" : "I've made the transfer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
