import type { MetadataRoute } from "next";
import { IS_STAGING } from "@/components/StagingBanner";
import { SITE_URL, SITE_HOST, PROFILE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (IS_STAGING) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard/", "/admin/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
