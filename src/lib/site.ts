/**
 * Per-deployment site identity. One codebase, one build per market: the
 * Malaysian and Australian sites differ only by these build-time env vars.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://aichatsupport.my").replace(/\/$/, "");
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
export const MARKET: "my" | "au" = process.env.NEXT_PUBLIC_MARKET === "au" ? "au" : "my";

const PROFILES = {
  my: {
    currency: "MYR",
    locale: "en-MY",
    country: "Malaysia",
    tagline: "AI support chatbot for Malaysian businesses.",
    phonePlaceholder: "+60 12-345 6789",
    orgPlaceholder: "Acme Sdn Bhd (optional)",
    demoQuestion: "Do you ship to Malaysia?",
    demoAnswer: "Yes! Standard shipping to West Malaysia takes 2–3 working days. 🇲🇾",
  },
  au: {
    currency: "AUD",
    locale: "en-AU",
    country: "Australia",
    tagline: "AI support chatbot for Australian businesses.",
    phonePlaceholder: "+61 412 345 678",
    orgPlaceholder: "Acme Pty Ltd (optional)",
    demoQuestion: "Do you ship Australia-wide?",
    demoAnswer: "Yes! Standard shipping to most metro areas takes 3–5 business days. 🇦🇺",
  },
} as const;

export const PROFILE = PROFILES[MARKET];
