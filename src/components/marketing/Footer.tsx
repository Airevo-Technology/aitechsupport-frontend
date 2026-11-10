import Link from "next/link";
import { Bot } from "lucide-react";
import type { PageLink } from "@/lib/content";
import { SITE_HOST } from "@/lib/site";

export default function Footer({ pages, tagline }: { pages: PageLink[]; tagline: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 font-semibold">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white"><Bot size={16} /></span>
              AiChatSupport
            </div>
            <p className="mt-3 max-w-xs text-sm text-slate-500">{tagline}</p>
          </div>
          <div>
            <div className="mb-3 text-sm font-semibold">Product</div>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/#features" className="hover:text-slate-900 dark:hover:text-white">Features</Link></li>
              <li><Link href="/#pricing" className="hover:text-slate-900 dark:hover:text-white">Pricing</Link></li>
              <li><Link href="/contact" className="hover:text-slate-900 dark:hover:text-white">Contact</Link></li>
              <li><Link href="/register" className="hover:text-slate-900 dark:hover:text-white">Get started</Link></li>
            </ul>
          </div>
          <div>
            <div className="mb-3 text-sm font-semibold">Company</div>
            <ul className="space-y-2 text-sm text-slate-500">
              {pages.map((p) => (
                <li key={p.slug}>
                  <Link href={`/${p.slug}`} className="hover:text-slate-900 dark:hover:text-white">{p.title}</Link>
                </li>
              ))}
              {pages.length === 0 && <li className="text-slate-400">—</li>}
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-400 dark:border-slate-800">
          © {year} AiChatSupport · {SITE_HOST}
        </div>
      </div>
    </footer>
  );
}
