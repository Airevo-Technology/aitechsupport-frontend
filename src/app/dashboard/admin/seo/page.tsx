"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  BarChart3,
  RefreshCw,
  Globe,
  ListChecks,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Gauge,
  FileText,
  Tag,
  Pencil,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { listPages, type AdminPage } from "@/lib/cms";
import {
  gscStatus,
  gscMetrics,
  saveGscConfig,
  type GscStatus,
  type GscMetrics,
} from "@/lib/adminSeo";
import { SITE_URL, SITE_HOST } from "@/lib/site";



// Always return a STRING. FastAPI validation errors return `detail` as a list of
// objects; passing that to toast/JSX would crash React ("Objects are not valid
// as a React child").
function apiErr(e: any, fb = "Something went wrong"): string {
  const d = e?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    const msg = d.map((x) => x?.msg || x?.detail).filter(Boolean).join("; ");
    if (msg) return msg;
  } else if (d && typeof d === "object") {
    if (typeof d.msg === "string") return d.msg;
  }
  return typeof e?.message === "string" ? e.message : fb;
}

const ISSUES = { meta: "No meta description", thin: "Thin content" } as const;

function stripHtml(s: string | null): string {
  return (s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function auditPage(p: AdminPage): string[] {
  const issues: string[] = [];
  if (!p.meta_description || p.meta_description.trim().length < 1) issues.push(ISSUES.meta);
  if (stripHtml(p.body).length < 120) issues.push(ISSUES.thin);
  return issues;
}

export default function AdminSeoPage() {
  const [pages, setPages] = useState<AdminPage[]>([]);
  const [gsc, setGsc] = useState<GscStatus | null>(null);
  const [metrics, setMetrics] = useState<GscMetrics | null>(null);
  const [metricsErr, setMetricsErr] = useState("");
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [form, setForm] = useState({ siteUrl: `sc-domain:${SITE_HOST}`, saJson: "" });
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    listPages()
      .then(setPages)
      .catch((e: any) => {
        if (e?.response?.status === 403) setForbidden(true);
      });
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const s = await gscStatus();
      setGsc(s);
      if (s.configured) loadMetrics();
    } catch (e: any) {
      if (e?.response?.status === 403) setForbidden(true);
      setGsc({ configured: false });
    }
  }

  async function loadMetrics() {
    setLoadingMetrics(true);
    setMetricsErr("");
    try {
      setMetrics(await gscMetrics());
    } catch (err) {
      setMetricsErr(apiErr(err, "Failed to load Search Console metrics."));
    } finally {
      setLoadingMetrics(false);
    }
  }

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    if (!form.saJson.trim() || !form.siteUrl.trim()) return;
    setSaving(true);
    try {
      await saveGscConfig(form.siteUrl.trim(), form.saJson);
      setForm((f) => ({ ...f, saJson: "" }));
      toast.success("Search Console connected");
      await loadStatus();
    } catch (err) {
      toast.error(apiErr(err));
    } finally {
      setSaving(false);
    }
  }

  const published = useMemo(() => pages.filter((p) => p.is_published), [pages]);
  const audited = useMemo(() => published.map((p) => ({ p, issues: auditPage(p) })), [published]);
  const withIssues = audited.filter((a) => a.issues.length > 0);
  const healthy = audited.length - withIssues.length;
  const score = audited.length ? Math.round((healthy / audited.length) * 100) : 100;
  const indexable = 3 + published.length; // home + register + contact + CMS pages
  const countIssue = (label: string) => audited.filter((a) => a.issues.includes(label)).length;
  const scoreColor = score >= 80 ? "#16a34a" : score >= 50 ? "#4f46e5" : "#e11d48";

  if (forbidden) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        <div className="flex items-center gap-2 font-medium">
          <ShieldAlert size={18} /> Platform admin only
        </div>
        <p className="mt-2 text-sm">This area is for the platform operator.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/dashboard/admin" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={14} /> Back to admin
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">SEO &amp; Search</h1>
        <p className="mt-1 text-sm text-slate-500">Live search performance and on-site SEO health for {SITE_HOST}.</p>
      </div>

      {/* Google Search Console */}
      <Card title="Google Search Console" icon={<BarChart3 size={18} className="text-indigo-600" />}>
        {gsc === null ? (
          <p className="text-sm text-slate-400">Checking connection…</p>
        ) : gsc.configured ? (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-500">
                Connected · <span className="font-mono text-slate-700 dark:text-slate-300">{gsc.site_url}</span>
                {gsc.client_email ? (
                  <>
                    {" "}· <span className="font-mono">{gsc.client_email}</span>
                  </>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadMetrics}
                  disabled={loadingMetrics}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={loadingMetrics ? "animate-spin" : ""} /> Refresh
                </button>
                <button onClick={() => setGsc({ configured: false })} className="text-sm text-slate-400 hover:text-slate-600">
                  Reconnect
                </button>
              </div>
            </div>

            {loadingMetrics && !metrics ? (
              <p className="text-sm text-slate-400">Loading metrics…</p>
            ) : metricsErr ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                {metricsErr}
                <div className="mt-1.5 text-xs opacity-80">
                  Tip: in Search Console → Settings → Users and permissions, add{" "}
                  <span className="font-mono">{gsc.client_email || "the service-account email"}</span> as a user on this property.
                </div>
              </div>
            ) : metrics ? (
              <>
                <div className="mb-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric label="Clicks" value={metrics.totals.clicks.toLocaleString()} />
                  <Metric label="Impressions" value={metrics.totals.impressions.toLocaleString()} />
                  <Metric label="Avg CTR" value={`${(metrics.totals.ctr * 100).toFixed(1)}%`} />
                  <Metric label="Avg position" value={metrics.totals.position.toFixed(1)} />
                </div>
                <div className="mb-4 text-xs text-slate-400">
                  Last {metrics.range.days} days · {metrics.range.start} → {metrics.range.end}
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <MetricTable title="Top queries" keyLabel="Query" rows={metrics.top_queries} />
                  <MetricTable title="Top pages" keyLabel="Page" rows={metrics.top_pages} />
                </div>
              </>
            ) : null}
          </>
        ) : (
          <form onSubmit={connect} className="max-w-2xl space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Connect Search Console to see live clicks, impressions and rankings here. It uses a{" "}
              <b>service-account JSON</b> (Search Console has no plain API key).
            </p>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Property (site) URL</label>
              <input
                value={form.siteUrl}
                onChange={(e) => setForm((f) => ({ ...f, siteUrl: e.target.value }))}
                placeholder={`sc-domain:${SITE_HOST}`}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800"
              />
              <p className="mt-1 text-xs text-slate-400">
                Use <span className="font-mono">sc-domain:{SITE_HOST}</span> for a Domain property, or{" "}
                <span className="font-mono">{SITE_URL}/</span> for a URL-prefix property.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Service account JSON</label>
              <textarea
                value={form.saJson}
                onChange={(e) => setForm((f) => ({ ...f, saJson: e.target.value }))}
                rows={6}
                spellCheck={false}
                placeholder={'{ "type": "service_account", "client_email": "...", "private_key": "..." }'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={15} className="animate-spin" />} {saving ? "Connecting…" : "Connect Search Console"}
            </button>
            <details className="pt-1 text-xs text-slate-500">
              <summary className="cursor-pointer font-medium">How to get the service-account JSON</summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Google Cloud Console → create a project → enable the <b>Google Search Console API</b>.</li>
                <li>Create a <b>Service Account</b> and download its <b>JSON key</b>.</li>
                <li>Paste it above with your property URL and click Connect.</li>
                <li>In Search Console → Settings → Users and permissions, add the service-account email (shown after connecting) as a user.</li>
              </ol>
            </details>
          </form>
        )}
      </Card>

      {/* On-site health */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="text-5xl font-extrabold" style={{ color: scoreColor }}>{score}%</div>
          <div className="mt-1 text-sm font-medium text-slate-500">Page SEO health</div>
          <div className="mt-0.5 text-xs text-slate-400">{healthy}/{audited.length} fully optimised</div>
        </div>
        <Stat label="Indexable pages" value={indexable} icon={<Globe size={18} className="text-indigo-600" />} sub="home + register + contact + pages" />
        <Stat label="Need attention" value={withIssues.length} icon={<AlertTriangle size={18} className="text-amber-500" />} sub="published pages with issues" />
      </div>

      {/* Technical SEO */}
      <Card title="Technical SEO" icon={<ListChecks size={18} className="text-indigo-600" />}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <AssetLink label="Sitemap" href={`${SITE_URL}/sitemap.xml`} note={`${indexable}+ URLs`} />
          <AssetLink label="robots.txt" href={`${SITE_URL}/robots.txt`} note="crawlable" />
          <AssetLink label="OG image" href={`${SITE_URL}/opengraph-image`} note="1200×630 share card" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          <Badge>Structured data: SoftwareApplication · Offer</Badge>
          <Badge>SSR metadata: home · CMS pages</Badge>
          <Badge>OpenGraph · Twitter cards</Badge>
        </div>
      </Card>

      {/* Content issues */}
      <Card title="Page content issues" icon={<AlertTriangle size={18} className="text-amber-500" />}>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <IssueStat label="No meta description" value={countIssue(ISSUES.meta)} icon={<Tag size={16} />} />
          <IssueStat label="Thin content" value={countIssue(ISSUES.thin)} icon={<FileText size={16} />} />
        </div>
        {withIssues.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-emerald-100 bg-emerald-50 py-8 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="mb-2" /> Every published page is SEO-optimised.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-4">Page</th>
                  <th className="py-2 pr-4">Issues</th>
                  <th className="py-2 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {withIssues.map(({ p, issues }) => (
                  <tr key={p.id}>
                    <td className="py-2.5 pr-4">
                      <div className="font-medium">{p.title}</div>
                      <div className="text-xs text-slate-400">/{p.slug}</div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {issues.map((i) => (
                          <span key={i} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            {i}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 text-right">
                      <Link href="/dashboard/admin/pages" className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-700">
                        <Pencil size={14} /> Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* External tools */}
      <Card title="More tools" icon={<Gauge size={18} className="text-indigo-600" />}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ToolLink label="Google Search Console" href="https://search.google.com/search-console" desc="Full reports & indexing coverage" />
          <ToolLink label="Bing Webmaster Tools" href="https://www.bing.com/webmasters" desc="Bing indexing & search performance" />
          <ToolLink label="PageSpeed Insights" href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(SITE_URL)}`} desc="Core Web Vitals & speed" />
          <ToolLink label="Rich Results Test" href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(SITE_URL)}`} desc="Validate structured data" />
        </div>
      </Card>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">{icon} {title}</h2>
      {children}
    </div>
  );
}

function Stat({ label, value, icon, sub }: { label: string; value: number | string; icon: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">{icon} {label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-2xl font-bold">{value}</div>
    </div>
  );
}

function MetricTable({ title, keyLabel, rows }: { title: string; keyLabel: string; rows: { key: string; clicks: number; impressions: number }[] }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      {!rows || rows.length === 0 ? (
        <p className="py-2 text-xs text-slate-400">No data yet.</p>
      ) : (
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="py-1 pr-2">{keyLabel}</th>
              <th className="px-2 py-1 text-right">Clicks</th>
              <th className="py-1 pl-2 text-right">Impr.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="max-w-[150px] truncate py-1.5 pr-2 sm:max-w-[240px]" title={r.key}>{r.key}</td>
                <td className="px-2 py-1.5 text-right font-medium">{r.clicks.toLocaleString()}</td>
                <td className="py-1.5 pl-2 text-right text-slate-500">{r.impressions.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function IssueStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${value > 0 ? "border-amber-100 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"}`}>
      <div className="flex items-center gap-1.5 text-xs text-slate-500">{icon} {label}</div>
      <div className={`mt-0.5 text-2xl font-bold ${value > 0 ? "text-amber-700 dark:text-amber-300" : ""}`}>{value}</div>
    </div>
  );
}

function AssetLink({ label, href, note }: { label: string; href: string; note: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
      <div>
        <div className="flex items-center gap-1.5 font-semibold">
          <CheckCircle2 size={15} className="text-emerald-600" /> {label}
        </div>
        <div className="text-xs text-slate-500">{note}</div>
      </div>
      <ExternalLink size={15} className="text-slate-400" />
    </a>
  );
}

function ToolLink({ label, href, desc }: { label: string; href: string; desc: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
      <div>
        <div className="font-semibold">{label}</div>
        <div className="text-xs text-slate-500">{desc}</div>
      </div>
      <ExternalLink size={15} className="text-slate-400" />
    </a>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 dark:border-slate-800 dark:bg-slate-800/50">{children}</span>;
}
