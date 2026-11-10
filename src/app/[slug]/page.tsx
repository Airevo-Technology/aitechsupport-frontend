import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage, getPageLinks } from "@/lib/content";
import Nav from "@/components/marketing/Nav";
import Footer from "@/components/marketing/Footer";
import { PROFILE } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPage(slug);
  if (!p) return { title: "Not found" };
  return {
    title: `${p.title} — AiChatSupport`,
    description: p.meta_description ?? undefined,
    alternates: { canonical: `/${slug}` },
  };
}

export default async function ContentPage({ params }: Props) {
  const { slug } = await params;
  const [p, pages] = await Promise.all([getPage(slug), getPageLinks()]);
  if (!p) notFound();
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{p.title}</h1>
        <article
          className="mt-8 leading-relaxed text-slate-600 dark:text-slate-300 [&_a]:text-indigo-600 [&_a]:underline [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:font-semibold [&_li]:mb-1 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: p.body ?? "" }}
        />
      </main>
      <Footer pages={pages ?? []} tagline={PROFILE.tagline} />
    </>
  );
}
