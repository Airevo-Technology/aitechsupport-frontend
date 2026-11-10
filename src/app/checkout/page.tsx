"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { ChevronRight, CreditCard, Info, Loader2, Lock, MailCheck } from "lucide-react";
import Nav from "@/components/marketing/Nav";
import { checkEmail, checkoutSignup, login, register } from "@/lib/auth";
import { api, API_URL } from "@/lib/api";
import type { Pkg } from "@/lib/content";
import { price } from "@/lib/money";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800";
const labelCls = "mb-1 block text-sm font-medium";

function priceLabel(p: Pkg): string {
  return p.price_myr === 0 ? "Free" : price(p.price_myr, p.currency);
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
      {n}
    </span>
  );
}

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planSlug = searchParams.get("plan") || "free";

  const [plan, setPlan] = useState<Pkg | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [org, setOrg] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // null = not checked yet, true = existing account (needs password), false = new signup
  const [accountExists, setAccountExists] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const isPaid = (plan?.price_myr ?? 0) > 0;

  useEffect(() => {
    fetch(`${API_URL}/api/v1/content/packages`)
      .then((res) => (res.ok ? res.json() : []))
      .then((pkgs: Pkg[]) => setPlan(pkgs.find((p) => p.slug === planSlug) || null))
      .catch(() => setPlan(null));
  }, [planSlug]);

  const onEmailBlur = async () => {
    const value = email.trim().toLowerCase();
    if (!value || !value.includes("@")) {
      setAccountExists(null);
      return;
    }
    setCheckingEmail(true);
    try {
      const exists = await checkEmail(value);
      setAccountExists(exists);
    } catch {
      setAccountExists(null);
    } finally {
      setCheckingEmail(false);
    }
  };

  const goToPayment = async () => {
    if (!plan) return false;
    try {
      const res = await api.post("/billing/checkout", { package_slug: plan.slug });
      if (res.data.payment_url) {
        window.location.href = res.data.payment_url;
        return true;
      }
      return false;
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Couldn't start payment — our team will follow up to activate your plan.");
      return false;
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Enter your first and last name");
      return;
    }
    if (!email.trim()) {
      toast.error("Enter your email");
      return;
    }
    if (!phone.trim()) {
      toast.error("Enter your phone number");
      return;
    }
    setBusy(true);
    try {
      if (accountExists === null) {
        // Blur didn't fire (e.g. autofill + direct submit) — resolve it now.
        const exists = await checkEmail(email.trim().toLowerCase());
        setAccountExists(exists);
        if (exists) {
          setBusy(false);
          return; // let them fill in the password field that just appeared
        }
      }

      if (accountExists) {
        if (!password) {
          toast.error("Enter your password");
          setBusy(false);
          return;
        }
        await login(email.trim().toLowerCase(), password);
        if (isPaid) {
          const redirected = await goToPayment();
          if (redirected) return;
          router.push("/dashboard");
        } else {
          try {
            await api.post("/billing/subscribe", { package_slug: planSlug });
          } catch {
            // Already on this plan, or a non-owner — fine, proceed to dashboard.
          }
          toast.success("Signed in");
          router.push("/dashboard");
        }
      } else {
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        const orgName = org.trim() || fullName;

        if (isPaid) {
          if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            setBusy(false);
            return;
          }
          await register(orgName, email.trim().toLowerCase(), password, fullName, phone);
          const redirected = await goToPayment();
          if (redirected) return;
          toast.success("Account created");
          router.push("/dashboard");
        } else {
          await checkoutSignup(orgName, email.trim().toLowerCase(), fullName, phone, planSlug);
          setSent(true);
        }
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Something went wrong — try again");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Nav />
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
          <MailCheck size={36} className="mb-4 text-indigo-600" />
          <h1 className="text-xl font-semibold">Check your email</h1>
          <p className="mt-2 text-sm text-slate-500">
            We&apos;ve sent a verification link to <span className="font-medium text-slate-700 dark:text-slate-200">{email}</span>.
            Open it to verify your email and set your password.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Nav />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center gap-1.5 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-800 dark:hover:text-slate-200">Home</Link>
          <ChevronRight size={14} />
          <Link href="/#pricing" className="hover:text-slate-800 dark:hover:text-slate-200">Pricing</Link>
          <ChevronRight size={14} />
          <span className="text-slate-800 dark:text-slate-200">Checkout</span>
        </div>
        <h1 className="mb-8 text-2xl font-bold tracking-tight sm:text-3xl">Checkout</h1>

        <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <StepBadge n={1} />
                <div className="text-sm font-semibold">Customer Information</div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>First Name *</label>
                  <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} placeholder="John" />
                </div>
                <div>
                  <label className={labelCls}>Last Name *</label>
                  <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} placeholder="Doe" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setAccountExists(null);
                    }}
                    onBlur={onEmailBlur}
                    className={inputCls}
                    placeholder="you@company.com"
                  />
                  {checkingEmail && <p className="mt-1 text-xs text-slate-400">Checking…</p>}
                </div>
                <div>
                  <label className={labelCls}>Phone *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputCls}
                    placeholder="+60 12-345 6789"
                  />
                </div>
              </div>

              {accountExists === true && (
                <div>
                  <label className={labelCls}>Password *</label>
                  <input
                    type="password"
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                    placeholder="••••••••"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    We found an account for this email — welcome back. Sign in to continue.{" "}
                    <Link href="/forgot-password" className="font-medium text-indigo-600 hover:underline">Forgot password?</Link>
                  </p>
                </div>
              )}

              {accountExists === false && (
                <>
                  <div>
                    <label className={labelCls}>Business / organization</label>
                    <input value={org} onChange={(e) => setOrg(e.target.value)} className={inputCls} placeholder="Acme Sdn Bhd (optional)" />
                  </div>
                  {isPaid ? (
                    <div>
                      <label className={labelCls}>Password *</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputCls}
                        placeholder="At least 6 characters"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      No password needed here — we&apos;ll email you a link to verify your address and set one.
                    </p>
                  )}
                </>
              )}
            </div>

            {isPaid && (
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2.5">
                  <StepBadge n={2} />
                  <div className="text-sm font-semibold">Payment Method</div>
                </div>

                <div className="rounded-xl border border-indigo-500 bg-indigo-50 p-4 dark:bg-indigo-950/30">
                  <label className="flex items-start gap-3">
                    <input type="radio" checked readOnly className="mt-1 accent-indigo-600" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <CreditCard size={16} className="text-indigo-600" />
                        Online Payment
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">via Billplz</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Pay securely online via FPX (online banking) or credit/debit card.</p>
                    </div>
                  </label>
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-white/70 p-3 text-xs text-indigo-800 dark:bg-slate-900/50 dark:text-indigo-300">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    You&apos;ll be redirected to Billplz to complete your payment after this step.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-semibold text-slate-500">Order summary</div>
            {plan ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">{plan.name} plan</span>
                  <span className="font-medium">{priceLabel(plan)}{plan.price_myr > 0 && "/mo"}</span>
                </div>
                <ul className="space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">
                  <li>{plan.max_bots} bot{plan.max_bots === 1 ? "" : "s"}</li>
                  <li>{plan.monthly_token_quota.toLocaleString()} tokens / month</li>
                </ul>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-base font-semibold dark:border-slate-800">
                  <span>Total due today</span>
                  <span>{plan.price_myr === 0 ? price(0, plan.currency) : priceLabel(plan)}</span>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-400">Loading plan…</div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isPaid ? (
                "Proceed to Payment"
              ) : accountExists ? (
                "Sign in & continue"
              ) : (
                "Create account"
              )}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <Lock size={12} /> Your details are encrypted and never shared.
            </p>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-indigo-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutForm />
    </Suspense>
  );
}
