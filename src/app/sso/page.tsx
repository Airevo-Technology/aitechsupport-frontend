"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { TOKEN_KEY } from "@/lib/api";

/**
 * Landing page for "Open app" on airevo.com.au. The backend has already checked
 * Airevo's one-time token and passes our own access token in the URL fragment,
 * which browsers never send to a server, so it stays out of logs and Referers.
 */
export default function SsoPage() {
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (!token) {
      window.location.replace("/login?from=airevo");
      return;
    }
    localStorage.setItem(TOKEN_KEY, token);
    window.location.replace("/dashboard");
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin" /> Signing you in…
      </div>
    </main>
  );
}
