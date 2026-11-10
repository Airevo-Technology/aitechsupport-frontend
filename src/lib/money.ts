import { PROFILE } from "@/lib/site";

const SYMBOLS: Record<string, string> = { MYR: "RM", AUD: "A$", USD: "US$", SGD: "S$" };

/** "RM49" / "A$49" / "NZD 49" — whole-unit package price in the deployment's currency. */
export function price(amount: number, currency: string = PROFILE.currency): string {
  const sym = SYMBOLS[currency];
  return sym ? `${sym}${amount}` : `${currency} ${amount}`;
}

/** Same, from minor units (payments store cents/sen), with 2 decimals. */
export function priceFromCents(cents: number, currency: string = PROFILE.currency): string {
  const n = (cents / 100).toLocaleString(PROFILE.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sym = SYMBOLS[currency];
  return sym ? `${sym}${n}` : `${currency} ${n}`;
}
