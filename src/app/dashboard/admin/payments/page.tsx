"use client";

import { priceFromCents } from "@/lib/money";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Receipt, Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";
import {
  adminListPayments,
  adminConfirmPayment,
  type PaymentRow,
  type PaymentsSummary,
} from "@/lib/billing";

const STATUSES = ["", "paid", "pending", "failed"] as const;

function rm(cents: number, currency = "MYR"): string {
  return priceFromCents(cents, currency);
}
function when(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-MY", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "paid"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      : status === "pending"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{status}</span>;
}

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState<PaymentsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const confirm = async (id: number) => {
    setConfirmingId(id);
    try {
      const updated = await adminConfirmPayment(id);
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success("Payment confirmed — plan activated");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to confirm payment");
    } finally {
      setConfirmingId(null);
    }
  };

  const load = async (s: string) => {
    setLoading(true);
    try {
      const res = await adminListPayments(s || undefined);
      setRows(res.payments);
      setSummary(res.summary);
    } catch (err: any) {
      if (err?.response?.status === 403) setForbidden(true);
      else toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (loading && !summary)
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        <Loader2 className="animate-spin" />
      </div>
    );

  if (forbidden)
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        <div className="flex items-center gap-2 font-medium">
          <ShieldAlert size={18} /> Platform admin only
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950">
          <Receipt size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Payments</h1>
          <p className="text-sm text-slate-500">Billplz bills across all clients and their status.</p>
        </div>
      </div>

      {summary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Revenue (live)" value={rm(summary.live_revenue_cents, summary.currency)} accent />
          <Stat label="Paid" value={summary.paid} />
          <Stat label="Pending" value={summary.pending} />
          <Stat label="Failed" value={summary.failed} />
          <Stat label="Total bills" value={summary.total} />
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm text-slate-500">Filter:</span>
        {STATUSES.map((s) => (
          <button
            key={s || "all"}
            onClick={() => setStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              status === s
                ? "bg-indigo-600 text-white"
                : "border border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {s === "" ? "All" : s}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          No payments yet. Bills appear here once clients pay for a plan through Billplz.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Env</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => (
                <tr key={r.id} className="bg-white dark:bg-slate-900">
                  <td className="px-4 py-3 font-medium">{r.organization_name || `#${r.organization_id}`}</td>
                  <td className="px-4 py-3 text-slate-500">{r.plan_slug}</td>
                  <td className="px-4 py-3">
                    {r.method === "bank_transfer" ? (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">bank transfer</span>
                    ) : (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800">{r.method}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{rm(r.amount_cents, r.currency)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    {r.sandbox ? (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800">sandbox</span>
                    ) : (
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">live</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{when(r.created_at)}</td>
                  <td className="px-4 py-3 text-slate-500">{when(r.paid_at)}</td>
                  <td className="px-4 py-3 max-w-[220px] truncate font-mono text-xs text-slate-400" title={r.method === "bank_transfer" ? r.reference_note || "" : r.paypal_order_id || r.billplz_bill_id || ""}>
                    {r.method === "bank_transfer" ? r.reference_note || "—" : r.paypal_order_id || r.billplz_bill_id || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.method === "bank_transfer" && r.status === "pending" && (
                      <button
                        onClick={() => confirm(r.id)}
                        disabled={confirmingId === r.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <CheckCircle2 size={13} /> {confirmingId === r.id ? "…" : "Confirm"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className={`text-xl font-semibold ${accent ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
