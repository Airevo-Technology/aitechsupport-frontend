import type { Metadata } from "next";
import { getPageLinks } from "@/lib/content";
import Nav from "@/components/marketing/Nav";
import Footer from "@/components/marketing/Footer";
import ContactForm from "@/components/marketing/ContactForm";
import { PROFILE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact — AiChatSupport",
  description: "Get in touch with the AiChatSupport team.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const pages = await getPageLinks();
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Contact us</h1>
        <p className="mt-3 text-slate-500">Questions about AiChatSupport? Send us a message and we&apos;ll reply by email.</p>
        <ContactForm />
      </main>
      <Footer pages={pages ?? []} tagline={PROFILE.tagline} />
    </>
  );
}
