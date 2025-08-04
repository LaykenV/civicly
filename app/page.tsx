
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery, useAction } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { BillSearchResult, BillSearchResponse } from "../types";

/*
  Beautiful, opinionated redesign:
  - Elevated brand with gradient surfaces, glass morphism, and soft shadows
  - Rich typography hierarchy with Lora headings & Inter body
  - Polished header with glass, active states, and mobile menu
  - Hero: layered gradient, glow rings, CTA duo, subtle animated dots
  - Search: spotlight card, command-hint, dynamic dropdown, clear button
  - Latest Bills: luxe cards, status badge with icons, content density, hover lift
  - Footer: gradient top border, tighter rhythm, refined colors
  - Accessibility: focus-visible rings, icon labels, time elements, ARIA
*/

interface Bill {
  _id: Id<"bills">;
  congress: number;
  billType: string;
  billNumber: string;
  title: string;
  tagline?: string;
  status: string;
  latestActionDate?: string;
  impactAreas?: string[];
  sponsor?: {
    name: string;
    party: string;
    state: string;
    chamber: "House" | "Senate";
  };
}

export default function Homepage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[hsl(230_60%_99%)] via-[hsl(230_50%_98%)] to-[hsl(230_40%_96%)] dark:from-[hsl(220_30%_12%)] dark:via-[hsl(220_28%_10%)] dark:to-[hsl(220_26%_8%)]">
      <Header />
      <HeroSection />
      <SearchSection />
      <LatestBillsSection />
      <Footer />
    </main>
  );
}

/* ---------- Utilities ---------- */

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

function IconButton({
  title,
  children,
  onClick,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-lg p-2 text-[hsl(230_12%_52%)]",
        "hover:text-[hsl(230_16%_20%)] dark:hover:text-[hsl(220_10%_92%)]",
        "hover:bg-[hsl(230_10%_94%)]/70 dark:hover:bg-white/5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(233_85%_60%)]/50",
        "transition-colors",
        className
      )}
    >
      {children}
    </button>
  );
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/* ---------- Header ---------- */

function Header() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const NavLink = ({ href, label }: { href: string; label: string }) => (
    <Link
      href={href}
      className={cn(
        "text-sm font-medium text-[hsl(230_12%_40%)] dark:text-[hsl(220_12%_72%)]",
        "hover:text-[hsl(233_85%_55%)] dark:hover:text-[hsl(233_85%_65%)]",
        "transition-colors data-[active=true]:text-[hsl(233_85%_55%)] dark:data-[active=true]:text-[hsl(233_85%_65%)]"
      )}
      data-active={typeof window !== "undefined" && window.location.hash === href}
    >
      {label}
    </Link>
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-transparent transition-all",
        "supports-[backdrop-filter]:backdrop-blur-xl",
        scrolled
          ? "bg-white/75 dark:bg-[hsl(220_28%_10%)]/75 border-[hsl(230_16%_90%)]/70 dark:border-white/10 shadow-sm"
          : "bg-white/40 dark:bg-[hsl(220_28%_10%)]/40"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(233_85%_60%)]/50 rounded-md"
          >
            <div className="relative">
              <span className="absolute inset-0 blur-xl bg-[linear-gradient(135deg,hsl(233_85%_60%),hsl(43_74%_52%))] opacity-40 rounded-full" />
              <div className="relative w-8 h-8 rounded-lg bg-[linear-gradient(135deg,hsl(233_85%_60%),hsl(43_74%_52%))]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold bg-clip-text text-transparent bg-[linear-gradient(135deg,hsl(233_85%_60%),hsl(43_74%_52%))]">
              Civicly
            </h1>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            <NavLink href="#search" label="Search" />
            <NavLink href="#bills" label="Bills" />
            <NavLink href="#politicians" label="Politicians" />
          </nav>

          <div className="hidden md:flex items-center space-x-2">
            {isAuthenticated ? (
              <button
                onClick={() => void signOut().then(() => router.push("/signin"))}
                className={cn(
                  "text-sm px-3 py-2 rounded-lg",
                  "text-[hsl(230_12%_40%)] dark:text-[hsl(220_12%_72%)] hover:text-[hsl(230_16%_20%)] dark:hover:text-white",
                  "hover:bg-[hsl(230_10%_94%)]/70 dark:hover:bg-white/5",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(233_85%_60%)]/50"
                )}
              >
                Sign Out
              </button>
            ) : (
              <>
                <button
                  onClick={() => router.push("/signin")}
                  className={cn(
                    "text-sm px-3 py-2 rounded-lg",
                    "text-[hsl(230_12%_40%)] dark:text-[hsl(220_12%_72%)] hover:text-[hsl(230_16%_20%)] dark:hover:text-white",
                    "hover:bg-[hsl(230_10%_94%)]/70 dark:hover:bg-white/5",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(233_85%_60%)]/50"
                  )}
                >
                  Sign In
                </button>
                <button
                  onClick={() => router.push("/signin")}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-semibold text-white",
                    "bg-[linear-gradient(135deg,hsl(233_85%_60%),hsl(43_74%_52%))]",
                    "shadow-[0_10px_20px_-10px_rgba(66,99,235,0.5)] hover:shadow-[0_15px_30px_-10px_rgba(66,99,235,0.6)]",
                    "transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(233_85%_60%)]/50"
                  )}
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          <div className="md:hidden">
            <IconButton title="Toggle Menu" onClick={() => setOpen((v) => !v)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                {open ? (
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </IconButton>
          </div>
        </div>

        {open && (
          <div className="md:hidden pb-4 space-y-2">
            <div className="flex flex-col space-y-2">
              <Link href="#search" onClick={() => setOpen(false)} className="px-2 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                Search
              </Link>
              <Link href="#bills" onClick={() => setOpen(false)} className="px-2 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                Bills
              </Link>
              <Link href="#politicians" onClick={() => setOpen(false)} className="px-2 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                Politicians
              </Link>
            </div>
            <div className="pt-2 border-t border-black/10 dark:border-white/10">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setOpen(false);
                    router.push("/signin");
                  }}
                  className="flex-1 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-sm"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    router.push("/signin");
                  }}
                  className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-[linear-gradient(135deg,hsl(233_85%_60%),hsl(43_74%_52%))]"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */

function HeroSection() {
  return (
    <section className="relative py-24 md:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Glow Orbs */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl bg-[hsl(233_85%_60%)]/25" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full blur-3xl bg-[hsl(43_74%_52%)]/20" />
      {/* Gradient ring */}
      <div aria-hidden className="absolute inset-0 [mask-image:radial-gradient(60%_60%_at_50%_10%,black,transparent)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(233_85%_60%)]/40 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto text-center relative">
        <span className="inline-flex items-center gap-2 text-xs md:text-sm font-medium rounded-full px-3 py-1 bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[hsl(230_12%_40%)] dark:text-[hsl(220_12%_78%)] backdrop-blur">
          <span className="inline-block h-2 w-2 rounded-full bg-[hsl(233_85%_60%)] animate-pulse" />
          Live legislative insights updated daily
        </span>

        <h1 className="mt-6 text-4xl md:text-6xl lg:text-7xl font-heading font-bold leading-tight tracking-tight">
          <span className="bg-clip-text text-transparent bg-[linear-gradient(135deg,hsl(233_85%_60%),hsl(43_74%_52%))]">
            Understand Congress
          </span>{" "}
          with clarity.
        </h1>

        <p className="mt-5 md:mt-6 text-lg md:text-2xl text-[hsl(230_12%_36%)]/85 dark:text-[hsl(220_12%_78%)]/85 max-w-3xl mx-auto">
          Beautiful, credible, and human-friendly bill summaries. Track what matters, follow progress, and engage with confidence.
        </p>

        <div className="mt-8 md:mt-10 flex items-center justify-center gap-3 md:gap-4">
          <Link
            href="#bills"
            className={cn(
              "rounded-xl px-6 md:px-7 py-3 md:py-3.5 text-base md:text-lg font-semibold text-white",
              "bg-[linear-gradient(135deg,hsl(233_85%_60%),hsl(256_85%_60%))]",
              "shadow-[0_15px_35px_-15px_rgba(66,99,235,0.6)] hover:shadow-[0_20px_40px_-15px_rgba(66,99,235,0.7)]",
              "transition-[box-shadow,transform] hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(233_85%_60%)]/50"
            )}
          >
            Explore Bills
          </Link>
          <Link
            href="#search"
            className="rounded-xl px-6 md:px-7 py-3 md:py-3.5 text-base md:text-lg font-semibold bg-white/70 dark:bg-white/[0.06] text-[hsl(230_16%_20%)] dark:text-white border border-black/5 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/[0.1] transition-colors backdrop-blur"
          >
            Try a search →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Search ---------- */

function SearchSection() {
  const [value, setValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const searchBills = useAction(api.agent.searchBills);
  const debouncedValue = useDebounce(value, 300);

  const placeholders = useMemo(
    () => [
      "Search for healthcare reform bills...",
      "Find climate policy legislation...",
      "Explore immigration reform...",
      "Discover tax policy changes...",
      "Show me bills about small businesses...",
      "Education funding in the House...",
    ],
    []
  );

  const [searchResults, setSearchResults] = useState<BillSearchResponse | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((p) => (p + 1) % placeholders.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  useEffect(() => {
    const onK = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("main-search")?.focus();
      }
    };
    window.addEventListener("keydown", onK);
    return () => window.removeEventListener("keydown", onK);
  }, []);

  // Perform search when debounced value changes
  useEffect(() => {
    if (debouncedValue.trim() && debouncedValue.length > 2) {
      setIsSearching(true);
      searchBills({
        query: debouncedValue,
        limit: 6,
      })
        .then((results) => {
          setSearchResults(results);
          setShowDropdown(true);
        })
        .catch((error) => {
          console.error("Search error:", error);
          setSearchResults(null);
        })
        .finally(() => {
          setIsSearching(false);
        });
    } else {
      setSearchResults(null);
      setShowDropdown(false);
    }
  }, [debouncedValue, searchBills]);

  const handleResultClick = (result: BillSearchResult) => {
    // Extract bill information and navigate
    // For now, just log the result
    console.log("Selected result:", result);
    setShowDropdown(false);
    setValue("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (!e.target.value.trim()) {
      setShowDropdown(false);
      setSearchResults(null);
    }
  };

  return (
    <section id="search" className="relative py-16 md:py-20 px-4 sm:px-6 lg:px-8">
      {/* Soft spotlight */}
      <div aria-hidden className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_60%_at_50%_10%,black,transparent)]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-72 w-[42rem] rounded-full blur-3xl bg-[hsl(233_85%_60%)]/15" />
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="relative">
          <div
            className={cn(
              "relative rounded-2xl p-5 md:p-6",
              "bg-white/70 dark:bg-white/[0.06] border border-black/5 dark:border-white/10",
              "shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)] backdrop-blur-xl"
            )}
          >
            <label htmlFor="main-search" className="sr-only">
              Search bills
            </label>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                {isSearching ? (
                  <div className="animate-spin h-5 w-5 border-2 border-[hsl(233_85%_60%)] border-t-transparent rounded-full" />
                ) : (
                  <svg className="h-5 w-5 text-[hsl(230_12%_52%)] dark:text-[hsl(220_12%_72%)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>

              <input
                id="main-search"
                type="text"
                value={value}
                onChange={handleInputChange}
                className={cn(
                  "w-full rounded-xl border-2 border-transparent bg-transparent",
                  "pl-12 pr-28 py-4 text-lg md:text-xl",
                  "placeholder:text-[hsl(230_12%_60%)]/80 dark:placeholder:text-[hsl(220_12%_78%)]/70",
                  "text-[hsl(230_16%_20%)] dark:text-[hsl(220_12%_92%)]",
                  "focus:outline-none focus:border-[hsl(233_85%_60%)]/60"
                )}
                placeholder={placeholders[placeholderIndex]}
                autoComplete="off"
              />

              {value && (
                <button
                  type="button"
                  onClick={() => {
                    setValue("");
                    setShowDropdown(false);
                    setSearchResults(null);
                  }}
                  className="absolute inset-y-0 right-14 pr-2 flex items-center text-[hsl(230_12%_52%)] hover:text-[hsl(230_16%_20%)] dark:hover:text-white"
                  aria-label="Clear search"
                  title="Clear"
                >
                  ×
                </button>
              )}
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <kbd className="inline-flex items-center rounded-md border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/[0.06] px-2 py-1 text-xs text-[hsl(230_12%_40%)] dark:text-[hsl(220_12%_78%)] backdrop-blur">
                  ⌘K
                </kbd>
              </div>
            </div>
          </div>

          {/* Dynamic Search Results Dropdown */}
          {showDropdown && searchResults && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50">
              <div className="rounded-2xl p-4 bg-white/90 dark:bg-white/[0.08] border border-black/5 dark:border-white/10 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)] backdrop-blur-xl">
                {searchResults.summary && (
                  <div className="mb-4 p-3 rounded-lg bg-[hsl(233_85%_60%)]/10 dark:bg-white/[0.06]">
                    <p className="text-sm text-[hsl(233_85%_45%)] dark:text-white/90">{searchResults.summary}</p>
                  </div>
                )}
                
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {searchResults.results.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left p-3 rounded-lg hover:bg-white/60 dark:hover:bg-white/[0.08] transition-colors border border-transparent hover:border-[hsl(233_85%_60%)]/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-[hsl(230_12%_45%)] dark:text-[hsl(220_12%_78%)]/80 mb-1">
                            {result.billInfo}
                          </div>
                          <p className="text-sm text-[hsl(230_16%_20%)] dark:text-white/90 line-clamp-2 mb-2">
                            {result.relevantText}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-[hsl(233_85%_60%)]/15 dark:bg-white/[0.08] text-xs text-[hsl(233_85%_45%)] dark:text-white/80">
                            {(result.score * 100).toFixed(0)}% match
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[hsl(230_12%_40%)]/80 dark:text-[hsl(220_12%_78%)]/80 mt-4">
          Use natural language to search through thousands of bills and find what matters to you.
        </p>
      </div>
    </section>
  );
}

/* ---------- Latest Bills ---------- */

function LatestBillsSection() {
  const bills = useQuery(api.homepage.getLatestBills);

  return (
    <section id="bills" className="relative py-18 md:py-20 px-4 sm:px-6 lg:px-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_60%_at_50%_0%,black,transparent)]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-64 w-[50rem] rounded-full blur-3xl bg-[hsl(43_74%_52%)]/12" />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight text-[hsl(230_16%_14%)] dark:text-white">
            Latest Bills
          </h2>
          <p className="mt-2 text-[hsl(230_12%_40%)]/85 dark:text-[hsl(220_12%_78%)]/85">
            Fresh updates, clean summaries, and easy tracking.
          </p>
        </div>

        {bills === undefined ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-2xl p-6",
                  "bg-white/80 dark:bg-white/[0.06] border border-black/5 dark:border-white/10",
                  "animate-pulse"
                )}
              >
                <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-1/3 mb-3" />
                <div className="h-5 bg-black/10 dark:bg-white/10 rounded w-3/4 mb-3" />
                <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-full mb-2" />
                <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : bills.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[hsl(230_12%_40%)]/85 dark:text-[hsl(220_12%_78%)]/85 text-lg">
              No bills found. Check back soon for updates.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {bills.map((bill) => (
              <BillCard key={bill._id} bill={bill} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  let color =
    "bg-amber-100/70 text-amber-900 border-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-300/20";
  let icon = (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
  );

  if (s.includes("passed") || s.includes("enacted")) {
    color =
      "bg-emerald-100/70 text-emerald-900 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-300/20";
    icon = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />;
  } else if (s.includes("failed") || s.includes("rejected")) {
    color =
      "bg-rose-100/70 text-rose-900 border-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:border-rose-300/20";
    icon = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />;
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium", color)}>
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
        {icon}
      </svg>
      {status}
    </span>
  );
}

function BillCard({ bill }: { bill: Bill }) {
  const formatDate = (dateString?: string) =>
    dateString
      ? new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
      : "";

  const truncate = (s: string, n = 140) => (s.length <= n ? s : s.slice(0, n) + "…");

  return (
    <article
      className={cn(
        "group rounded-2xl p-6 h-full flex flex-col",
        "bg-white/80 dark:bg-white/[0.06] border border-black/5 dark:border-white/10",
        "hover:border-[hsl(233_85%_60%)]/40 hover:shadow-[0_20px_50px_-25px_rgba(66,99,235,0.35)]",
        "transition-all"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-[hsl(230_12%_45%)] dark:text-[hsl(220_12%_78%)]/80">
          {bill.congress}th Congress • {bill.billType.toUpperCase()} {bill.billNumber}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/bills/${bill._id}`}
            className="text-[hsl(233_85%_55%)] hover:text-[hsl(233_85%_60%)] dark:text-[hsl(233_85%_65%)] dark:hover:text-[hsl(233_85%_72%)] text-xs font-semibold"
          >
            Details →
          </Link>
        </div>
      </div>

      <h3 className="text-lg md:text-xl font-heading font-semibold text-[hsl(230_16%_14%)] dark:text-white mb-2 line-clamp-2">
        {truncate(bill.title)}
      </h3>

      {bill.tagline && (
        <p className="text-[hsl(230_12%_35%)]/85 dark:text-[hsl(220_12%_78%)]/85 mb-4 text-sm italic line-clamp-2">
          {bill.tagline}
        </p>
      )}

      <div className="flex items-center gap-3 mb-4">
        <StatusBadge status={bill.status} />
        {bill.latestActionDate && (
          <time dateTime={bill.latestActionDate} className="text-xs text-[hsl(230_12%_45%)] dark:text-[hsl(220_12%_78%)]/80">
            {formatDate(bill.latestActionDate)}
          </time>
        )}
      </div>

      {bill.sponsor && (
        <div className="text-sm text-[hsl(230_12%_35%)]/85 dark:text-[hsl(220_12%_78%)]/85 mb-4">
          <span className="font-medium">Sponsor:</span> {bill.sponsor.name}{" "}
          <span className="text-xs">({bill.sponsor.party}-{bill.sponsor.state})</span>
        </div>
      )}

      {bill.impactAreas && bill.impactAreas.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {bill.impactAreas.slice(0, 3).map((area, i) => (
            <span
              key={i}
              className="bg-[hsl(233_85%_60%)]/12 dark:bg-white/[0.08] text-[hsl(233_85%_45%)] dark:text-white/90 text-xs px-2.5 py-1 rounded-full"
            >
              {area}
            </span>
          ))}
          {bill.impactAreas.length > 3 && (
            <span className="text-xs text-[hsl(230_12%_45%)] dark:text-[hsl(220_12%_78%)]/80">
              +{bill.impactAreas.length - 3} more
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-black/5 dark:border-white/10">
        <div className="flex items-center space-x-2">
          <IconButton title="Follow">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </IconButton>
          <IconButton title="Share">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
              />
            </svg>
          </IconButton>
        </div>
        <Link
          href={`/bills/${bill._id}`}
          className="text-[hsl(233_85%_55%)] hover:text-[hsl(233_85%_60%)] dark:text-[hsl(233_85%_65%)] dark:hover:text-[hsl(233_85%_75%)] transition-colors text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(233_85%_60%)]/50 rounded px-1"
        >
          Read More →
        </Link>
      </div>
    </article>
  );
}

/* ---------- Footer ---------- */

function Footer() {
  return (
    <footer className="relative mt-16 bg-gradient-to-b from-transparent to-white/70 dark:to-white/[0.04]">
      <div aria-hidden className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(233_85%_60%)]/50 to-transparent" />
      <div className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[linear-gradient(135deg,hsl(233_85%_60%),hsl(43_74%_52%))]" />
              <h3 className="text-lg font-heading font-bold bg-clip-text text-transparent bg-[linear-gradient(135deg,hsl(233_85%_60%),hsl(43_74%_52%))]">
                Civicly
              </h3>
            </div>
            <p className="text-[hsl(230_12%_35%)]/85 dark:text-[hsl(220_12%_78%)]/85 mb-4 max-w-lg">
              Making complex legislative information accessible, credible, and empowering for every citizen.
            </p>
            <p className="text-sm text-[hsl(230_12%_45%)]/85 dark:text-[hsl(220_12%_72%)]/80">© 2024 Civicly. All rights reserved.</p>
          </div>

          <div>
            <h4 className="font-medium text-[hsl(230_16%_20%)] dark:text-white mb-3">Platform</h4>
            <ul className="space-y-2 text-sm text-[hsl(230_12%_40%)]/90 dark:text-[hsl(220_12%_78%)]/90">
              <li><Link href="#" className="hover:text-[hsl(233_85%_60%)] transition-colors">Bills</Link></li>
              <li><Link href="#" className="hover:text-[hsl(233_85%_60%)] transition-colors">Politicians</Link></li>
              <li><Link href="#" className="hover:text-[hsl(233_85%_60%)] transition-colors">Search</Link></li>
              <li><Link href="#" className="hover:text-[hsl(233_85%_60%)] transition-colors">API</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-[hsl(230_16%_20%)] dark:text-white mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-[hsl(230_12%_40%)]/90 dark:text-[hsl(220_12%_78%)]/90">
              <li><Link href="#" className="hover:text-[hsl(233_85%_60%)] transition-colors">About</Link></li>
              <li><Link href="#" className="hover:text-[hsl(233_85%_60%)] transition-colors">Privacy</Link></li>
              <li><Link href="#" className="hover:text-[hsl(233_85%_60%)] transition-colors">Terms</Link></li>
              <li><Link href="#" className="hover:text-[hsl(233_85%_60%)] transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
