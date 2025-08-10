"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function AuthPage() {
  const { signIn } = useAuthActions();
  const searchParams = useSearchParams();
  const initialFlow = searchParams.get("flow") === "signUp" ? "signUp" : "signIn";
  const [flow, setFlow] = useState<"signIn" | "signUp">(initialFlow);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleEmailPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("flow", flow);
    try {
      setError(null);
      await signIn("password", formData);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden">
      {/* Background accents */}
      <div aria-hidden className="pointer-events-none absolute -top-28 -left-24 h-[28rem] w-[28rem] rounded-full blur-3xl bg-[hsl(233_85%_60%)]/20" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 h-[24rem] w-[24rem] rounded-full blur-3xl bg-[hsl(43_74%_52%)]/18" />

      <div className="w-full max-w-md">
        {/* Back button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-2 py-1 rounded-lg text-sm text-[hsl(230_12%_40%)] dark:text-[hsl(220_12%_78%)] hover:text-[hsl(43_74%_52%)] dark:hover:text-[hsl(43_74%_65%)] hover:bg-[hsl(230_10%_94%)/0.7] dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(233_85%_60%)]/60 cursor-pointer"
            aria-label="Go back"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back</span>
          </button>
        </div>

        {/* Logo / Brand */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="relative">
            <span className="absolute inset-0 blur-xl bg-[linear-gradient(135deg,hsl(233_85%_60%),hsl(43_74%_52%))] opacity-40 rounded-full" />
            <div className="relative w-10 h-10 rounded-lg bg-[linear-gradient(135deg,hsl(233_85%_60%),hsl(43_74%_52%))]" />
          </div>
          <h1 className="text-2xl font-heading font-bold bg-clip-text text-transparent bg-[linear-gradient(135deg,hsl(233_85%_60%),hsl(43_74%_52%))]">
            Civicly
          </h1>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 md:p-7 bg-white/85 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="text-center mb-5">
            <h2 className="text-xl md:text-2xl font-heading font-semibold text-[hsl(230_16%_14%)] dark:text-white">
              {flow === "signIn" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-2 text-sm text-[hsl(230_12%_40%)]/85 dark:text-[hsl(220_12%_78%)]/85">
              {flow === "signIn" ? "Sign in to continue" : "Join to track and understand bills"}
            </p>
          </div>

          {/* OAuth */}
          <button
            className="group relative w-full bg-[hsl(220_28%_12%)] text-white border border-white/10 rounded-lg py-2.5 px-3 flex items-center justify-center gap-2 overflow-hidden transition-colors hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(233_85%_60%)]/60 cursor-pointer"
            onClick={() => {
              setError(null);
              void signIn("google").catch((err) => setError(err.message));
            }}
          >
            <span className="pointer-events-none absolute left-[-150%] top-0 h-full w-[200%] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.18),transparent)] transition-all duration-700 ease-out group-hover:left-[150%]" />
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
              <path fill="#EA4335" d="M21.6 12c0-.98-.08-1.7-.25-2.46H12v4.32h5.4c-.11.9-.73 2.26-2.1 3.17l3.24 2.51C20.47 18.1 21.6 15.3 21.6 12z" />
              <path fill="#34A853" d="M12 21.6c2.7 0 4.96-.9 6.61-2.45l-3.24-2.51c-.9.6-2.08.96-3.37.96-2.6 0-4.81-1.75-5.6-4.1H2.99v2.58A9.6 9.6 0 0 0 12 21.6z" />
              <path fill="#4285F4" d="M6.4 12c0-.8.14-1.56.39-2.29V7.13H2.99A9.6 9.6 0 0 0 2.4 12c0 1.54.37 3 .99 4.29l3.36-2.62A5.79 5.79 0 0 1 6.4 12z" />
              <path fill="#FBBC05" d="M12 6.4c1.48 0 2.8.51 3.84 1.51l2.88-2.88A9.56 9.56 0 0 0 12 2.4c-3.71 0-6.86 2.13-8.21 5.24l3.36 2.62C7.94 8.15 9.86 6.4 12 6.4z" />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
            <span className="text-xs text-[hsl(230_12%_45%)] dark:text-[hsl(220_12%_78%)]/80">or</span>
            <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
          </div>

          {/* Form */}
          <form className="flex flex-col gap-3" onSubmit={handleEmailPassword}>
            <label className="sr-only" htmlFor="email">Email</label>
            <input
              id="email"
              className="bg-white/80 dark:bg-white/[0.04] text-foreground rounded-lg px-3 py-2.5 border-2 border-transparent focus:border-[hsl(233_85%_60%)]/60 focus:outline-none placeholder:text-[hsl(230_12%_55%)]/85 dark:placeholder:text-[hsl(220_12%_78%)]/70"
              type="email"
              name="email"
              placeholder="Email"
              required
              autoComplete="email"
            />
            <label className="sr-only" htmlFor="password">Password</label>
            <input
              id="password"
              className="bg-white/80 dark:bg-white/[0.04] text-foreground rounded-lg px-3 py-2.5 border-2 border-transparent focus:border-[hsl(233_85%_60%)]/60 focus:outline-none placeholder:text-[hsl(230_12%_55%)]/85 dark:placeholder:text-[hsl(220_12%_78%)]/70"
              type="password"
              name="password"
              placeholder="Password"
              required
              autoComplete={flow === "signUp" ? "new-password" : "current-password"}
            />
            <button className="btn-primary w-full mt-1" type="submit">
              {flow === "signIn" ? "Sign in" : "Create account"}
            </button>
          </form>

          {/* Switch + Error */}
          <div className="flex items-center justify-center gap-2 mt-4 text-sm">
            <span className="text-[hsl(230_12%_40%)]/85 dark:text-[hsl(220_12%_78%)]/85">
              {flow === "signIn" ? "Don't have an account?" : "Already have an account?"}
            </span>
            <button
              className="text-[hsl(233_85%_55%)] hover:text-[hsl(233_85%_60%)] dark:text-[hsl(233_85%_65%)] dark:hover:text-[hsl(233_85%_72%)] underline decoration-from-font underline-offset-2"
              onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
            >
              {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-[hsl(351_83%_10%)]/5 dark:bg-[hsl(351_83%_10%)]/40 border-2 border-[hsl(351_83%_55%)]/30 rounded-lg p-3">
              <p className="text-[hsl(351_83%_25%)] dark:text-[hsl(351_83%_65%)] text-xs font-mono">
                Error: {error}
              </p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <p className="mt-4 text-center text-xs text-[hsl(230_12%_45%)]/85 dark:text-[hsl(220_12%_78%)]/80">
          By continuing, you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </main>
  );
} 