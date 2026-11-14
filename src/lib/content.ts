import { API_URL } from "@/lib/api";

const BASE = `${API_URL}/api/v1/content`;

export interface Feature { icon: string; title: string; text: string }
export interface Faq { q: string; a: string }
export interface FooterLink { label: string; href: string }

export interface Homepage {
  meta_title: string;
  meta_description: string;
  hero: { badge: string; headline: string; subhead: string; cta_primary: string; cta_secondary: string };
  features: Feature[];
  pricing: { heading: string; subhead: string };
  faq: Faq[];
  cta: { headline: string; text: string; button: string };
  footer: { tagline: string; social: FooterLink[] };
  demo_public_key: string;
}

export interface Pkg {
  slug: string;
  name: string;
  price_myr: number; // amount in `currency` (column name is historical)
  currency?: string;
  monthly_token_quota: number;
  max_bots: number;
  features: string[];
}

export interface PageLink { slug: string; title: string }
export interface PageContent {
  slug: string;
  title: string;
  body: string | null;
  meta_description: string | null;
  updated_at: string | null;
}

async function getJson<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const getHomepage = () => getJson<Homepage>("/homepage");
export const getPackages = () => getJson<Pkg[]>("/packages");
export const getPageLinks = () => getJson<PageLink[]>("/pages");
export const getGateways = () => getJson<{ marketplace_url?: string | null }>("/gateways");
export const getPage = (slug: string) => getJson<PageContent>(`/pages/${encodeURIComponent(slug)}`, 30);
