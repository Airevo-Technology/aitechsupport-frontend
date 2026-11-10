/** Shown only on the staging deployment (NEXT_PUBLIC_APP_ENV=staging, set at build time). */
export const IS_STAGING = process.env.NEXT_PUBLIC_APP_ENV === "staging";

export default function StagingBanner() {
  if (!IS_STAGING) return null;
  return (
    <div className="pointer-events-none fixed left-3 top-3 z-[100] rounded-md bg-amber-400 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-950 shadow">
      Staging — test data
    </div>
  );
}
