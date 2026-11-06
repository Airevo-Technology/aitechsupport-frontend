"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Users, Loader2, ShieldAlert, BellRing, ChevronLeft, ChevronRight, Search, Eye } from "lucide-react";
import {
  adminListClientsPaged,
  adminListPackages,
  adminSetClientPlan,
  adminSetClientBillingDate,
  adminSendReminder,
  type ClientRow,
  type Package,
} from "@/lib/billing";

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${n}`;
}

const PAGE_SIZE = 10;

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [pkgs, setPkgs] = useState<Package[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [savingOrg, setSavingOrg] = useState<number | null>(null);
  const [remindingOrg, setRemindingOrg] = useState<number | null>(null);

  const load = async () => {
    try {
      const [c, p] = await Promise.all([adminListClientsPaged(page, PAGE_SIZE, query), adminListPackages()]);
      setClients(c.items);
      setTotal(c.total);
      setPkgs(p);
    } catch (err: any) {
      if (err?.response?.status === 403) setForbidden(true);
      else toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQuery(search.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const setPlan = async (orgId: number, slug: string) => {
    setSavingOrg(orgId);
    try {
      const updated = await adminSetClientPlan(orgId, slug);
      setClients((prev) => prev.map((c) => (c.organization_id === orgId ? updated : c)));
      toast.success(`Plan set to ${slug}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to set plan");
    } finally {
      setSavingOrg(null);
    }
  };

  const setBillingDate = async (orgId: number, dateStr: string) => {
    if (!dateStr) return;
    setSavingOrg(orgId);
    try {
      const updated = await adminSetClientBillingDate(orgId, dateStr);
      setClients((prev) => prev.map((c) => (c.organization_id === orgId ? updated : c)));
      toast.success("Renewal date updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to set renewal date");
    } finally {
      setSavingOrg(null);
    }
  };

  const remind = async (orgId: number) => {
    setRemindingOrg(orgId);
    try {
      await adminSendReminder(orgId);
      toast.success("Reminder sent");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to send reminder");
    } finally {
      setRemindingOrg(null);
    }
  };

  if (loading && clients.length === 0)
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
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950">
          <Users size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-slate-500">{total} organization(s). Assign a plan manually while online payment is off.</p>
        </div>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search organization or owner email"
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Bots</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Renews</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {clients.map((c) => (
              <tr key={c.organization_id} className="bg-white dark:bg-slate-900">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/dashboard/admin/clients/${c.organization_id}`} className="hover:text-indigo-600 hover:underline">
                    {c.organization_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">{c.owner_email || "—"}</td>
                <td className="px-4 py-3">{c.bots}</td>
                <td className="px-4 py-3 text-slate-500">
                  {fmt(c.tokens_used)} / {fmt(c.tokens_quota)}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={c.plan}
                    disabled={savingOrg === c.organization_id}
                    onChange={(e) => setPlan(c.organization_id, e.target.value)}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  >
                    {pkgs.map((p) => (
                      <option key={p.id} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                    {!pkgs.some((p) => p.slug === c.plan) && <option value={c.plan}>{c.plan}</option>}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="date"
                    defaultValue={toDateInput(c.start_date)}
                    disabled={savingOrg === c.organization_id}
                    onBlur={(e) => e.target.value && setBillingDate(c.organization_id, e.target.value)}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                    title="Start date — next renewal is 30 days after this"
                  />
                  {c.next_billing_date && (
                    <div className="mt-1 text-[11px] text-slate-400">
                      next: {new Date(c.next_billing_date).toLocaleDateString("en-MY")}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/admin/clients/${c.organization_id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <Eye size={13} /> Details
                  </Link>
                  {c.next_billing_date && (
                    <button
                      onClick={() => remind(c.organization_id)}
                      disabled={remindingOrg === c.organization_id}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      <BellRing size={13} /> {remindingOrg === c.organization_id ? "…" : "Remind"}
                    </button>
                  )}
                  </div>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No clients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          Page {page} of {pageCount} · {total} total
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page >= pageCount || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
