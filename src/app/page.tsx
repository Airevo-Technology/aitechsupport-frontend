import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { Zap, MessageSquare, Users, ShieldCheck, Globe, BarChart3, Sparkles, ArrowRight } from "lucide-react";
import { getGateways, getHomepage, getPackages, getPageLinks, type Feature } from "@/lib/content";
import Nav from "@/components/marketing/Nav";
import Footer from "@/components/marketing/Footer";
import Pricing from "@/components/marketing/Pricing";
import { SITE_URL, SITE_HOST, PROFILE } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const h = await getHomepage();
  return {
    title: h?.meta_title,
    description: h?.meta_description,
    alternates: { canonical: "/" },
    openGraph: { title: h?.meta_title ?? undefined, description: h?.meta_description ?? undefined, url: "/", type: "website" },
  };
}

const ICONS: Record<string, typeof Zap> = {
  bolt: Zap, chat: MessageSquare, user: Users, shield: ShieldCheck, globe: Globe, chart: BarChart3,
};

export default async function Home() {
  const [h, packages, pages, gateways] = await Promise.all([getHomepage(), getPackages(), getPageLinks(), getGateways()]);
  if (!h) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Content is loading…
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "AiChatSupport",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: h.meta_description,
    offers: (packages ?? []).map((p) => ({ "@type": "Offer", name: p.name, price: p.price_myr, priceCurrency: PROFILE.currency })),
  };

  return (
    <>
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50 to-transparent dark:from-indigo-950/30" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div>
            {h.hero.badge && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
                <Sparkles size={13} /> {h.hero.badge}
              </span>
            )}
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{h.hero.headline}</h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-300">{h.hero.subhead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700">
                {h.hero.cta_primary} <ArrowRight size={18} />
              </Link>
              <Link href="/#pricing" className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                {h.hero.cta_secondary}
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">No credit card required · Set up in minutes</p>
          </div>
          <ChatPreview greeting={h.hero.subhead ? "Hi! How can I help you today?" : "Hi!"} />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to automate support</h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {h.features.map((f: Feature, i: number) => {
            const Icon = ICONS[f.icon] ?? Sparkles;
            return (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{f.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing */}
      <div className="bg-slate-50 dark:bg-slate-950/40">
        <Pricing packages={packages ?? []} heading={h.pricing.heading} subhead={h.pricing.subhead} marketplaceUrl={gateways?.marketplace_url} />
      </div>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Frequently asked questions</h2>
        <div className="mt-10 divide-y divide-slate-200 dark:divide-slate-800">
          {h.faq.map((f, i) => (
            <details key={i} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {f.q}
                <span className="ml-4 text-slate-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-slate-500">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-3xl bg-indigo-600 px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{h.cta.headline}</h2>
          <p className="mx-auto mt-3 max-w-xl text-indigo-100">{h.cta.text}</p>
          <Link href="/register" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-medium text-indigo-700 hover:bg-indigo-50">
            {h.cta.button} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <Footer pages={pages ?? []} tagline={h.footer.tagline} />

      <Script id="ld-json" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {h.demo_public_key && (
        <Script src={`${SITE_URL}/widget/v1/widget.js`} data-public-key={h.demo_public_key} strategy="lazyOnload" />
      )}
    </>
  );
}

function ChatPreview({ greeting }: { greeting: string }) {
  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 rounded-t-2xl bg-indigo-600 px-4 py-3 text-white">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20"><MessageSquare size={15} /></span>
        <span className="font-semibold">Acme Support</span>
      </div>
      <div className="space-y-3 p-4">
        <Bubble side="left">{greeting}</Bubble>
        <Bubble side="right">{PROFILE.demoQuestion}</Bubble>
        <Bubble side="left">{PROFILE.demoAnswer}</Bubble>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-400 dark:border-slate-700">
          Type your message…
        </div>
      </div>
    </div>
  );
}

function Bubble({ side, children }: { side: "left" | "right"; children: React.ReactNode }) {
  return (
    <div className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
          side === "right"
            ? "rounded-br-sm bg-indigo-600 text-white"
            : "rounded-bl-sm border border-slate-100 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
