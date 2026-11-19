// Airevo runs one marketplace per country (airevo.com.au, airevo.my). Which one sells this
// deployment's plans follows from the listing / manage URL the backend hands out, so the
// wording customers see (site name, reseller country, tax on the invoice) follows it too.

export type Marketplace = {
  /** "airevo.my" */
  site: string;
  /** "Malaysian"; empty when the domain isn't a known region. */
  country: string;
  /** Sales tax named on Airevo's invoice: "SST" | "GST" | "tax". */
  tax: string;
};

const REGIONS: { suffix: string; country: string; tax: string }[] = [
  { suffix: ".com.au", country: "Australian", tax: "GST" },
  { suffix: ".my", country: "Malaysian", tax: "SST" },
];

export function marketplaceFor(url?: string | null): Marketplace {
  let host = "";
  try {
    host = url ? new URL(url).hostname.replace(/^www\./, "") : "";
  } catch {
    host = "";
  }
  const region = REGIONS.find((r) => host.endsWith(r.suffix));
  return { site: host || "Airevo", country: region?.country ?? "", tax: region?.tax ?? "tax" };
}
