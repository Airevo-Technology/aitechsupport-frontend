"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Gift, Copy, Loader2, Users } from "lucide-react";
import { getReferralInfo, type ReferralInfo } from "@/lib/billing";

export default function ReferralsPage() {
  const [info, setInfo] = useState<ReferralInfo | null>(null);

  useEffect(() => {
    getReferralInfo().then(setInfo).catch(() => toast.error("Could not load your referrals"));
  }, []);

  if (!info) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(info.link);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed - select the link and copy it manually");
    }
  };
  const needed = Math.max(0, Math.ceil(100 / info.percent_each) - info.active_referrals);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><Gift size={22} /> Referrals</h1>
      <p className="mt-1 text-sm text-slate-500">
        Earn {info.percent_each}% off your plan for every referred business that is on a paid plan. Refer{" "}
        {Math.ceil(100 / info.percent_each)} paying businesses and your plan is free. The discount applies to every
        renewal for as long as they stay subscribed.
      </p>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Your referral link</div>
        <div className="mt-2 flex gap-2">
          <input readOnly value={info.link} onFocus={(e) => e.target.select()}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950" />
          <button onClick={copy} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Copy size={14} /> Copy
          </button>
        </div>
        <div className="mt-2 text-xs text-slate-500">Code: <span className="font-mono">{info.code}</span></div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Active paying referrals" value={String(info.active_referrals)} />
        <Stat label="Total signed up" value={String(info.total_referrals)} />
        <Stat label="Your discount" value={`${info.discount_percent}%`} accent />
      </div>

      <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        {info.discount_percent >= 100
          ? "Your plan is fully covered. Renew for free from the Billing page."
          : `${needed} more paying referral${needed === 1 ? "" : "s"} for a free plan. `}
        {info.discount_percent < 100 && (
          <>You can wait to subscribe until you have enough: <Link href="/dashboard/billing" className="text-indigo-600 underline">your discount applies the moment you choose a paid plan</Link>.</>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3 text-sm font-semibold dark:border-slate-800">
          <Users size={15} /> People you referred
        </div>
        {info.referrals.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">No one yet. Share your link to get started.</div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {info.referrals.map((r, i) => (
              <li key={i} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-medium">{r.name}</span>
                <span className="text-xs text-slate-500">{r.joined ? new Date(r.joined).toLocaleDateString() : ""}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.counts ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {r.counts ? `Paying (${r.plan})` : "Not on a paid plan"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent ? "text-indigo-600" : ""}`}>{value}</div>
    </div>
  );
}
