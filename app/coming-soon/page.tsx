import Link from "next/link";
import Header from "@/components/Header";

export const metadata = {
  title: "Coming Soon • Civicly",
};

export default function ComingSoonPage() {
  return (
    <main
      className="min-h-screen overflow-x-hidden"
      style={{ background: "linear-gradient(180deg, var(--color-background), var(--color-background-end) 30%)" }}
    >
      <Header />
      <section className="relative flex items-center justify-center px-4 sm:px-6 lg:px-8 py-28 md:py-36">
        <div aria-hidden className="pointer-events-none absolute -top-40 -left-24 h-[28rem] w-[28rem] rounded-full blur-3xl bg-[var(--color-primary)]/25" />
        <div aria-hidden className="pointer-events-none absolute -top-16 right-0 h-[22rem] w-[22rem] rounded-full blur-3xl bg-[var(--color-accent)]/18" />
        <div className="max-w-3xl mx-auto text-center relative">
          <span className="inline-flex items-center gap-2 text-xs md:text-sm font-medium rounded-full px-3 py-1 bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-muted)] backdrop-blur">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
            Building in public
          </span>
          <h1 className="mt-8 md:mt-10 text-4xl md:text-6xl font-heading font-bold tracking-tight leading-[1.15] md:leading-[1.08] pb-1 md:pb-1.5 bg-clip-text text-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))]">
            Coming soon
          </h1>
          <p className="mt-4 md:mt-6 text-base md:text-lg text-[var(--color-muted-darker)]/85">
            We’re putting the finishing touches on this page. Check back shortly, or explore the latest bills in the meantime.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              href="/"
              className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
} 