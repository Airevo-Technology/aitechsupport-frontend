import type { MetadataRoute } from "next";
import { IS_STAGING } from "@/components/StagingBanner";

export default function robots(): MetadataRoute.Robots {
  if (IS_STAGING) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard/", "/admin/"] },
    sitemap: "https://aichatsupport.my/sitemap.xml",
    host: "https://aichatsupport.my",
  };
}
