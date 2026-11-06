"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import { adminGetClient, type ClientDetail } from "@/lib/billing";

function dt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

const th = "px-3 py-2 text-left text-xs uppercase text-slate-500";
const td = "px-3 py-2";

export default function AdminClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    adminGetClient(Number(id))
      .then(setD)
      .catch((err: any) => {
        if (err?.response?.status === 403) setForbidden(true);
        else toast.error(err?.response?.status === 404 ? "Client not found" : "Failed to load client");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
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

  const back = (
    <Link href="/dashboard/admin/clients" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
      <ArrowLeft size={14} /> Back to clients
    </Link>
  );
  if (!d) return <div className="mx-auto max-w-6xl">{back}<p className="text-slate-500">Client not found.</p></div>;

  const c = d.client;
  const pct = c.tokens_quota ? Math.min(100, Math.round((c.tokens_used / c.tokens_quota) * 100)) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        {back}
        <h1 className="text-2xl font-semibold">{c.organization_name}</h1>
        <p className="text-sm text-slate-500">
          Organization #{c.organization_id} · joined {dt(c.created_at)}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Plan & usage">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Plan" value={<span className="capitalize">{c.plan}</span>} />
            <Field label="Status" value={<span className="capitalize">{d.subscription_status}</span>} />
            <Field label="Cycle start" value={dt(c.start_date)} />
            <Field label="Next renewal" value={dt(c.next_billing_date)} />
            <Field label="Last reminder" value={dt(d.last_reminder_sent)} />
            <Field label="Messages used" value={d.messages_used.toLocaleString()} />
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>Tokens</span>
              <span>
                {c.tokens_used.toLocaleString()} / {c.tokens_quota.toLocaleString()} ({pct}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className={`h-full ${pct >= 90 ? "bg-red-500" : "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </Card>

        <Card title="Contact & activity">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Owner" value={c.owner_email} />
            <Field label="Support email" value={d.support_email} />
            <Field label="Support WhatsApp" value={d.support_whatsapp} />
            <Field label="Conversations" value={d.conversations.toLocaleString()} />
            <Field label="Needed a human" value={d.conversations_needing_human.toLocaleString()} />
            <Field label="Last conversation" value={dt(d.last_conversation_at)} />
          </div>
        </Card>
      </div>

      <Card title={`Users (${d.users.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr>
                <th className={th}>Email</th>
                <th className={th}>Name</th>
                <th className={th}>Phone</th>
                <th className={th}>Role</th>
                <th className={th}>Status</th>
                <th className={th}>Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {d.users.map((u) => (
                <tr key={u.id}>
                  <td className={td}>{u.email}</td>
                  <td className={td}>{u.full_name || "—"}</td>
                  <td className={td}>{u.phone || "—"}</td>
                  <td className={`${td} capitalize`}>{u.role}</td>
                  <td className={td}>
                    {!u.is_active ? "Disabled" : !u.is_email_verified ? "Unverified" : "Active"}
                  </td>
                  <td className={td}>{dt(u.last_seen_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={`Bots (${d.bots.length})`}>
        {d.bots.length === 0 ? (
          <p className="text-sm text-slate-500">No bots yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr>
                  <th className={th}>Name</th>
                  <th className={th}>Model</th>
                  <th className={th}>Handoff</th>
                  <th className={th}>Channels</th>
                  <th className={th}>KB sources</th>
                  <th className={th}>Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {d.bots.map((b) => (
                  <tr key={b.id}>
                    <td className={`${td} font-medium`}>{b.name}</td>
                    <td className={td}>{b.chat_model || "default"}</td>
                    <td className={td}>
                      {b.handoff_mode}
                      {b.whatsapp_number ? ` · ${b.whatsapp_number}` : ""}
                    </td>
                    <td className={td}>{b.channels.join(", ") || "—"}</td>
                    <td className={td}>{b.knowledge_sources}</td>
                    <td className={td}>{b.is_active ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Recent payments">
        {d.payments.length === 0 ? (
          <p className="text-sm text-slate-500">No payments.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Plan</th>
                  <th className={th}>Amount</th>
                  <th className={th}>Method</th>
                  <th className={th}>Status</th>
                  <th className={th}>Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {d.payments.map((p) => (
                  <tr key={p.id}>
                    <td className={td}>{dt(p.paid_at || p.created_at)}</td>
                    <td className={`${td} capitalize`}>{p.plan_slug}</td>
                    <td className={td}>RM {(p.amount_cents / 100).toFixed(2)}</td>
                    <td className={td}>{p.method.replace("_", " ")}</td>
                    <td className={`${td} capitalize`}>
                      {p.status}
                      {p.sandbox ? " (sandbox)" : ""}
                    </td>
                    <td className={td}>{p.reference_note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
