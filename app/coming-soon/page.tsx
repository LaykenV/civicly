import Link from "next/link";
import Header from "@/components/Header";

export const metadata = {
  title: "Coming Soon • Civicly",
};

export default function ComingSoonPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,hsl(230_60%_99%),hsl(230_52%_98%)_30%,hsl(230_46%_97%))] dark:bg-[linear-gradient(180deg,hsl(220_30%_12%),hsl(220_28%_10%)_35%,hsl(220_26%_9%))] overflow-x-hidden">
      <Header />
      <section className="relative flex items-center justify-center px-4 sm:px-6 lg:px-8 py-28 md:py-36">
        <div aria-hidden className="pointer-events-none absolute -top-40 -left-24 h-[28rem] w-[28rem] rounded-full blur-3xl bg-[hsl(233_85%_60%)]/25" />
        <div aria-hidden className="pointer-events-none absolute -top-16 right-0 h-[22rem] w-[22rem] rounded-full blur-3xl bg-[hsl(43_74%_52%)]/18" />
        <div className="max-w-3xl mx-auto text-center relative">
          <span className="inline-flex items-center gap-2 text-xs md:text-sm font-medium rounded-full px-3 py-1 bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[hsl(230_12%_40%)] dark:text-[hsl(220_12%_78%)] backdrop-blur">
            <span className="inline-block h-2 w-2 rounded-full bg-[hsl(233_85%_60%)] animate-pulse" />
            Building in public
          </span>
          <h1 className="mt-8 md:mt-10 text-4xl md:text-6xl font-heading font-bold tracking-tight leading-[1.15] md:leading-[1.08] pb-1 md:pb-1.5 bg-clip-text text-transparent bg-[linear-gradient(135deg,hsl(233_85%_60%),hsl(43_74%_52%))]">
            Coming soon
          </h1>
          <p className="mt-4 md:mt-6 text-base md:text-lg text-[hsl(230_12%_30%)]/85 dark:text-[hsl(220_12%_78%)]/85">
            We’re putting the finishing touches on this page. Check back shortly, or explore the latest bills in the meantime.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-[hsl(233_85%_60%)] hover:bg-[hsl(233_85%_58%)] shadow-sm"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
} 