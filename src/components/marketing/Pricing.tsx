import Link from "next/link";
import { Check } from "lucide-react";
import type { Pkg } from "@/lib/content";
import { price } from "@/lib/money";

function priceLabel(p: Pkg): string {
  return p.price_myr === 0 ? "Free" : price(p.price_myr, p.currency);
}

export default function Pricing({
  packages,
  heading,
  subhead,
}: {
  packages: Pkg[];
  heading: string;
  subhead: string;
}) {
  const popular = packages.find((p) => p.slug === "pro")?.slug
    ?? packages[Math.min(2, Math.max(0, packages.length - 1))]?.slug;

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{heading}</h2>
        <p className="mt-3 text-lg text-slate-500">{subhead}</p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {packages.map((p) => {
          const isPopular = p.slug === popular;
          const bullets = [
            `${p.max_bots} bot${p.max_bots === 1 ? "" : "s"}`,
            `${p.monthly_token_quota.toLocaleString()} tokens / month`,
            ...(Array.isArray(p.features) ? p.features : []),
          ];
          return (
            <div
              key={p.slug}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                isPopular
                  ? "border-indigo-500 shadow-lg ring-1 ring-indigo-500/20"
                  : "border-slate-200 dark:border-slate-800"
              } bg-white dark:bg-slate-900`}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-semibold text-white">
                  Popular
                </span>
              )}
              <div className="text-sm font-semibold text-slate-500">{p.name}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{priceLabel(p)}</span>
                {p.price_myr > 0 && <span className="text-sm text-slate-400">/mo</span>}
              </div>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-indigo-600" />
                    <span className="text-slate-600 dark:text-slate-300">{b}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/checkout?plan=${encodeURIComponent(p.slug)}`}
                className={`mt-6 rounded-lg px-4 py-2.5 text-center text-sm font-medium ${
                  isPopular
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {p.price_myr === 0 ? "Start free" : "Choose plan"}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
