"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { BillSearchResult, BillSearchResponse } from "../types";
import Header from "@/components/Header";
import { cn } from "@/lib/cn";

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

/* ---------- Impact Colors ---------- */

const IMPACT_COLORS: Record<
  string,
  {
    light: string;
    dark: string;
    textLight: string;
    textDark: string;
    borderLight: string;
    borderDark: string;
  }
> = {
  Agriculture: {
    light: "bg-lime-100/70",
    dark: "bg-lime-400/10",
    textLight: "text-lime-900",
    textDark: "text-lime-300",
    borderLight: "border-lime-200",
    borderDark: "border-lime-300/20",
  },
  "Armed Forces": {
    light: "bg-slate-100/70",
    dark: "bg-slate-400/10",
    textLight: "text-slate-900",
    textDark: "text-slate-300",
    borderLight: "border-slate-200",
    borderDark: "border-slate-300/20",
  },
  "Civil Rights": {
    light: "bg-rose-100/70",
    dark: "bg-rose-400/10",
    textLight: "text-rose-900",
    textDark: "text-rose-300",
    borderLight: "border-rose-200",
    borderDark: "border-rose-300/20",
  },
  Commerce: {
    light: "bg-amber-100/70",
    dark: "bg-amber-400/10",
    textLight: "text-amber-900",
    textDark: "text-amber-300",
    borderLight: "border-amber-200",
    borderDark: "border-amber-300/20",
  },
  Crime: {
    light: "bg-rose-100/70",
    dark: "bg-rose-400/10",
    textLight: "text-rose-900",
    textDark: "text-rose-300",
    borderLight: "border-rose-200",
    borderDark: "border-rose-300/20",
  },
  Economics: {
    light: "bg-emerald-100/70",
    dark: "bg-emerald-400/10",
    textLight: "text-emerald-900",
    textDark: "text-emerald-300",
    borderLight: "border-emerald-200",
    borderDark: "border-emerald-300/20",
  },
  Education: {
    light: "bg-sky-100/70",
    dark: "bg-sky-400/10",
    textLight: "text-sky-900",
    textDark: "text-sky-300",
    borderLight: "border-sky-200",
    borderDark: "border-sky-300/20",
  },
  Energy: {
    light: "bg-orange-100/70",
    dark: "bg-orange-400/10",
    textLight: "text-orange-900",
    textDark: "text-orange-300",
    borderLight: "border-orange-200",
    borderDark: "border-orange-300/20",
  },
  Environment: {
    light: "bg-emerald-100/70",
    dark: "bg-emerald-400/10",
    textLight: "text-emerald-900",
    textDark: "text-emerald-300",
    borderLight: "border-emerald-200",
    borderDark: "border-emerald-300/20",
  },
  Finance: {
    light: "bg-indigo-100/70",
    dark: "bg-indigo-400/10",
    textLight: "text-indigo-900",
    textDark: "text-indigo-300",
    borderLight: "border-indigo-200",
    borderDark: "border-indigo-300/20",
  },
  "Government Operations": {
    light: "bg-violet-100/70",
    dark: "bg-violet-400/10",
    textLight: "text-violet-900",
    textDark: "text-violet-300",
    borderLight: "border-violet-200",
    borderDark: "border-violet-300/20",
  },
  Health: {
    light: "bg-red-100/70",
    dark: "bg-red-400/10",
    textLight: "text-red-900",
    textDark: "text-red-300",
    borderLight: "border-red-200",
    borderDark: "border-red-300/20",
  },
  Housing: {
    light: "bg-fuchsia-100/70",
    dark: "bg-fuchsia-400/10",
    textLight: "text-fuchsia-900",
    textDark: "text-fuchsia-300",
    borderLight: "border-fuchsia-200",
    borderDark: "border-fuchsia-300/20",
  },
  Immigration: {
    light: "bg-teal-100/70",
    dark: "bg-teal-400/10",
    textLight: "text-teal-900",
    textDark: "text-teal-300",
    borderLight: "border-teal-200",
    borderDark: "border-teal-300/20",
  },
  "International Affairs": {
    light: "bg-cyan-100/70",
    dark: "bg-cyan-400/10",
    textLight: "text-cyan-900",
    textDark: "text-cyan-300",
    borderLight: "border-cyan-200",
    borderDark: "border-cyan-300/20",
  },
  Labor: {
    light: "bg-yellow-100/70",
    dark: "bg-yellow-400/10",
    textLight: "text-yellow-900",
    textDark: "text-yellow-300",
    borderLight: "border-yellow-200",
    borderDark: "border-yellow-300/20",
  },
  Law: {
    light: "bg-stone-100/70",
    dark: "bg-stone-400/10",
    textLight: "text-stone-900",
    textDark: "text-stone-300",
    borderLight: "border-stone-200",
    borderDark: "border-stone-300/20",
  },
  "Native Americans": {
    light: "bg-amber-100/70",
    dark: "bg-amber-400/10",
    textLight: "text-amber-900",
    textDark: "text-amber-300",
    borderLight: "border-amber-200",
    borderDark: "border-amber-300/20",
  },
  "Public Lands": {
    light: "bg-green-100/70",
    dark: "bg-green-400/10",
    textLight: "text-green-900",
    textDark: "text-green-300",
    borderLight: "border-green-200",
    borderDark: "border-green-300/20",
  },
  Science: {
    light: "bg-purple-100/70",
    dark: "bg-purple-400/10",
    textLight: "text-purple-900",
    textDark: "text-purple-300",
    borderLight: "border-purple-200",
    borderDark: "border-purple-300/20",
  },
  "Social Issues": {
    light: "bg-pink-100/70",
    dark: "bg-pink-400/10",
    textLight: "text-pink-900",
    textDark: "text-pink-300",
    borderLight: "border-pink-200",
    borderDark: "border-pink-300/20",
  },
  "Social Security": {
    light: "bg-blue-100/70",
    dark: "bg-blue-400/10",
    textLight: "text-blue-900",
    textDark: "text-blue-300",
    borderLight: "border-blue-200",
    borderDark: "border-blue-300/20",
  },
  Sports: {
    light: "bg-emerald-100/70",
    dark: "bg-emerald-400/10",
    textLight: "text-emerald-900",
    textDark: "text-emerald-300",
    borderLight: "border-emerald-200",
    borderDark: "border-emerald-300/20",
  },
  Taxation: {
    light: "bg-orange-100/70",
    dark: "bg-orange-400/10",
    textLight: "text-orange-900",
    textDark: "text-orange-300",
    borderLight: "border-orange-200",
    borderDark: "border-orange-300/20",
  },
  Technology: {
    light: "bg-cyan-100/70",
    dark: "bg-cyan-400/10",
    textLight: "text-cyan-900",
    textDark: "text-cyan-300",
    borderLight: "border-cyan-200",
    borderDark: "border-cyan-300/20",
  },
  Transportation: {
    light: "bg-indigo-100/70",
    dark: "bg-indigo-400/10",
    textLight: "text-indigo-900",
    textDark: "text-indigo-300",
    borderLight: "border-indigo-200",
    borderDark: "border-indigo-300/20",
  },
  "Water Resources": {
    light: "bg-sky-100/70",
    dark: "bg-sky-400/10",
    textLight: "text-sky-900",
    textDark: "text-sky-300",
    borderLight: "border-sky-200",
    borderDark: "border-sky-300/20",
  },
};

/* ---------- Page ---------- */

export default function Homepage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,hsl(230_60%_99%),hsl(230_52%_98%)_30%,hsl(230_46%_97%))] dark:bg-[linear-gradient(180deg,hsl(220_30%_12%),hsl(220_28%_10%)_35%,hsl(220_26%_9%))] overflow-x-hidden">
      <Header />
      <HeroSection />
      <LatestBillsSection />
      <Footer />
    </main>
  );
}

/* ---------- Utilities ---------- */

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function ImpactChip({ label }: { label: string }) {
  const c = IMPACT_COLORS[label] ?? {
    light: "bg-[hsl(233_85%_60%)]/12",
    dark: "bg-white/[0.08]",
    textLight: "text-[hsl(233_85%_45%)]",
    textDark: "text-white/90",
    borderLight: "border-black/5",
    borderDark: "border-white/10",
  };

  return (
    <span
      className={cn(
        "text-[10px] px-2 py-0.5 rounded-full border",
        c.light,
        c.textLight,
        c.borderLight,
        "dark:" + c.dark,
        "dark:" + c.textDark,
        "dark:" + c.borderDark
      )}
    >
      {label}
    </span>
  );
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
      className={cn("icon-button", className)}
    >
      {children}
    </button>
  );
}

/* ---------- Header ---------- */

// [Removed in-file Header in favor of reusable `components/Header`]

/* ---------- Hero (Search-first) ---------- */

function HeroSection() {
  // Added a subtle texture layer + larger top/bottom space for prime focus.
  return (
    <section className="relative min-h-[60vh] sm:min-h-[70vh] flex items-center px-4 sm:px-6 lg:px-8 py-20 md:py-24 mt-16">
      <div aria-hidden className="pointer-events-none absolute -top-40 -left-24 h-[28rem] w-[28rem] rounded-full blur-3xl bg-[hsl(233_85%_60%)]/25" />
      <div aria-hidden className="pointer-events-none absolute -top-16 right-0 h-[22rem] w-[22rem] rounded-full blur-3xl bg-[hsl(43_74%_52%)]/18" />
      <div aria-hidden className="absolute inset-0 [mask-image:radial-gradient(60%_60%_at_50%_5%,black,transparent)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(233_85%_60%)]/40 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto text-center relative w-full">
        <span className="inline-flex items-center gap-2 text-xs md:text-sm font-medium rounded-full px-3 py-1 bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[hsl(230_12%_40%)] dark:text-[hsl(220_12%_78%)] backdrop-blur">
          <span className="inline-block h-2 w-2 rounded-full bg-[hsl(233_85%_60%)] animate-pulse" />
          Live legislative insights updated daily
        </span>

        <h1 className="mt-8 md:mt-10 text-4xl md:text-6xl lg:text-7xl font-heading font-bold leading-[1.05] tracking-tight">
          <span className="inline-block pr-[0.04em] bg-clip-text text-transparent bg-[linear-gradient(135deg,hsl(233_85%_60%),hsl(43_74%_52%))]">
            Understand Congress,
          </span>{" "}
          instantly.
        </h1>

        <p className="mt-6 md:mt-8 text-base md:text-xl text-[hsl(230_12%_30%)]/85 dark:text-[hsl(220_12%_78%)]/85 max-w-3xl mx-auto">
          Search thousands of bills with natural language. See summaries, sponsors, status, and impact—fast.
        </p>

        <div className="mt-12 md:mt-16">
          <HeroSearch />
        </div>
      </div>
    </section>
  );
}

/* ---------- Search Result Card ---------- */

function SearchResultCard({ result, onClick }: { result: BillSearchResult; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl transition-colors border border-black/5 dark:border-white/10 hover:border-[hsl(233_85%_60%)]/35 hover:bg-white dark:hover:bg-white/[0.06] bg-white/80 dark:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(233_85%_60%)]/60"
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-[hsl(230_12%_45%)] dark:text-[hsl(220_12%_78%)]/80 mb-1">
            {result.congress}th • {result.billType.toUpperCase()} {result.billNumber}
          </div>
          <h3 className="text-sm font-semibold text-[hsl(230_16%_20%)] dark:text-white/90 line-clamp-2">
            {result.title}
          </h3>
          {result.tagline && (
            <p className="mt-1 text-xs text-[hsl(230_12%_35%)]/85 dark:text-[hsl(220_12%_78%)]/85 italic line-clamp-1">
              {result.tagline}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <span className="inline-flex items-center px-2 py-1 rounded-md bg-[hsl(233_85%_60%)]/15 dark:bg-white/[0.08] text-[10px] text-[hsl(233_85%_45%)] dark:text-white/80">
            {(result.relevanceScore * 100).toFixed(0)}% match
          </span>
          <span className="text-[10px] text-[hsl(230_12%_45%)] dark:text-[hsl(220_12%_78%)]/80">
            {result.relevantChunks} section{result.relevantChunks !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {result.sponsor && (
        <div className="text-xs text-[hsl(230_12%_35%)]/85 dark:text-[hsl(220_12%_78%)]/85 mt-2">
          <span className="font-medium">Sponsor:</span> {result.sponsor.name}
          {result.sponsor.party && result.sponsor.state && (
            <span className="text-xs"> ({result.sponsor.party}-{result.sponsor.state})</span>
          )}
        </div>
      )}

      {result.impactAreas && result.impactAreas.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {result.impactAreas.slice(0, 4).map((area, i) => (
            <ImpactChip key={i} label={area} />
          ))}
          {result.impactAreas.length > 4 && (
            <span className="text-[10px] text-[hsl(230_12%_45%)] dark:text-[hsl(220_12%_78%)]/80">
              +{result.impactAreas.length - 4} more
            </span>
          )}
        </div>
      )}

      <div className="mt-2 text-xs text-[hsl(230_12%_40%)]/85 dark:text-[hsl(220_12%_78%)]/85 line-clamp-2">
        {result.bestMatchText}
      </div>
    </button>
  );
}

/* ---------- Hero Search (main focus) ---------- */

function HeroSearch() {
  const [value, setValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [typedPlaceholder, setTypedPlaceholder] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchBills = useAction(api.agent.searchBills);
  const debouncedValue = useDebounce(value, 300);

  const placeholders = useMemo(
    () => [
      "Search healthcare reform bills…",
      "Find climate policy legislation…",
      "Explore immigration reform…",
      "Discover tax policy changes…",
      "Bills about small businesses…",
      "Education funding in the House…",
    ],
    []
  );

  const [searchResults, setSearchResults] = useState<BillSearchResponse | null>(null);

  // Typewriter effect for placeholder
  useEffect(() => {
    if (value.trim().length > 0) {
      // Pause typewriter while user is typing
      return;
    }

    let isCancelled = false;
    let timeoutId: number | undefined;

    const typeSpeed = 38; // ms per character
    const deleteSpeed = 26; // ms per character
    const holdAfterType = 1200; // ms to hold full text
    const holdAfterDelete = 500; // ms before next phrase

    const phrase = placeholders[placeholderIndex] ?? "";

    const run = async () => {
      // Type characters
      for (let i = 1; i <= phrase.length; i++) {
        if (isCancelled) return;
        setTypedPlaceholder(phrase.slice(0, i));
        await new Promise((r) => (timeoutId = window.setTimeout(r, typeSpeed)));
      }

      // Hold full phrase
      await new Promise((r) => (timeoutId = window.setTimeout(r, holdAfterType)));
      if (isCancelled) return;

      // Delete characters
      for (let i = phrase.length - 1; i >= 0; i--) {
        if (isCancelled) return;
        setTypedPlaceholder(phrase.slice(0, i));
        await new Promise((r) => (timeoutId = window.setTimeout(r, deleteSpeed)));
      }

      // Hold after delete and move to next phrase
      await new Promise((r) => (timeoutId = window.setTimeout(r, holdAfterDelete)));
      if (isCancelled) return;
      setPlaceholderIndex((p) => (p + 1) % placeholders.length);
    };

    run();

    return () => {
      isCancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [placeholderIndex, placeholders, value]);

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

  useEffect(() => {
    if (debouncedValue.trim() && debouncedValue.length > 2) {
      setIsSearching(true);
      searchBills({ query: debouncedValue, limit: 6 })
        .then((results) => {
          setSearchResults(results);
          setShowDropdown(true);
        })
        .catch((error) => {
          console.error("Search error:", error);
          setSearchResults(null);
          setShowDropdown(true);
        })
        .finally(() => setIsSearching(false));
    } else {
      setSearchResults(null);
      setShowDropdown(false);
    }
  }, [debouncedValue, searchBills]);

  const handleResultClick = (result: BillSearchResult) => {
    console.log(result);
    // TODO: Navigate to bill details page using result.billId
    setShowDropdown(false);
    setValue("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (!e.target.value.trim()) {
      setShowDropdown(false);
      setSearchResults(null);
      // resume typewriter from current index
    }
  };

  return (
    <div className="relative max-w-3xl mx-auto">
      {/* Search card */}
      <div
        className={cn(
          "relative rounded-2xl p-3 md:p-4",
          "bg-white/85 dark:bg-white/[0.06] border border-black/5 dark:border-white/10",
          "shadow-[0_18px_44px_-24px_rgba(0,0,0,0.35)] backdrop-blur-xl"
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
              <svg
                className="h-5 w-5 text-[hsl(230_12%_52%)] dark:text-[hsl(220_12%_72%)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden
              >
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
              "pl-12 pr-28 py-3.5 md:py-4 text-base md:text-lg",
              "placeholder:text-[hsl(230_12%_55%)]/85 dark:placeholder:text-[hsl(220_12%_78%)]/70",
              "text-[hsl(230_16%_16%)] dark:text-[hsl(220_12%_94%)]",
              "focus:outline-none focus:border-[hsl(233_85%_60%)]/70",
              "input-placeholder-typewriter"
            )}
            placeholder={typedPlaceholder}
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
              className="absolute inset-y-0 right-14 pr-2 flex items-center text-[hsl(230_12%_52%)] hover:text-[hsl(230_16%_20%)] dark:hover:text-white focus:outline-none"
              aria-label="Clear search"
              title="Clear"
            >
              ×
            </button>
          )}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <kbd className="inline-flex items-center rounded-md border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.06] px-2 py-1 text-xs text-[hsl(230_12%_40%)] dark:text-[hsl(220_12%_78%)] backdrop-blur">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Dropdown results */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 max-w-full">
          <div className="rounded-2xl p-3 md:p-4 bg-white dark:bg-[hsl(220_28%_12%)]/95 border border-black/5 dark:border-white/10 shadow-[0_28px_64px_-28px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            {isSearching && (
              <div className="p-4 flex items-center gap-3 text-sm text-[hsl(230_12%_45%)] dark:text-[hsl(220_12%_78%)]/85">
                <div className="animate-spin h-4 w-4 border-2 border-[hsl(233_85%_60%)] border-t-transparent rounded-full" />
                Searching bills…
              </div>
            )}

            {!isSearching && searchResults?.summary && (
              <div className="mb-3 md:mb-4 p-3 rounded-lg bg-[hsl(233_85%_60%)]/10 dark:bg-white/[0.06]">
                <p className="text-sm text-[hsl(233_85%_45%)] dark:text-white/90">{searchResults.summary}</p>
                {searchResults.totalChunks > 0 && (
                  <p className="text-xs text-[hsl(230_12%_45%)] dark:text-[hsl(220_12%_78%)]/80 mt-1">
                    Searched {searchResults.totalChunks} sections of legislative text
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {!isSearching && (!searchResults || searchResults.results.length === 0) && (
                <div className="p-8 text-center text-sm text-[hsl(230_12%_45%)] dark:text-[hsl(220_12%_78%)]/80">
                  No results yet. Try “farm bill subsidies” or “student loan forgiveness”.
                </div>
              )}

              {searchResults?.results.map((result) => (
                <SearchResultCard key={result.billId} result={result} onClick={() => handleResultClick(result)} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Latest Bills ---------- */

function LatestBillsSection() {
  const bills = useQuery(api.homepage.getLatestBills);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (!container || !bills || bills.length === 0) return;

    const scrollLeft = container.scrollLeft;
    const totalWidth = container.scrollWidth - container.clientWidth;
    if (totalWidth <= 0) return;

    const cardWidthEstimate = container.scrollWidth / bills.length;
    const centerScrollPosition = scrollLeft + container.clientWidth / 2;
    let newIndex = Math.floor(centerScrollPosition / cardWidthEstimate);
    newIndex = Math.max(0, Math.min(bills.length - 1, newIndex));

    if (newIndex !== selectedIndex) {
      setSelectedIndex(newIndex);
    }
  };

  return (
    <section id="bills" className="relative py-4 md:py-6 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_60%_at_50%_0%,black,transparent)]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-64 w-[50rem] rounded-full blur-3xl bg-[hsl(43_74%_52%)]/12" />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="text-left mb-8 md:mb-10">
          <h2 className="text-2xl md:text-4xl font-heading font-bold tracking-tight text-[hsl(230_16%_14%)] dark:text-white">
            Latest Bills
          </h2>
          <p className="mt-2 text-[hsl(230_12%_40%)]/85 dark:text-[hsl(220_12%_78%)]/85">
            Fresh updates, clean summaries, and easy tracking.
          </p>
        </div>

        {bills === undefined ? (
          <>
            {/* Mobile Loading Skeleton */}
            <div className="md:hidden flex overflow-x-auto space-x-4 pb-2 -mx-4 px-4 scrollbar-hide">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="min-w-[280px] w-[85vw] max-w-[340px] flex-shrink-0">
                  <div
                    className={cn(
                      "rounded-2xl p-6 h-full",
                      "bg-white/80 dark:bg-white/[0.06] border border-black/5 dark:border-white/10",
                      "animate-pulse"
                    )}
                  >
                    <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-1/3 mb-3" />
                    <div className="h-5 bg-black/10 dark:bg-white/10 rounded w-3/4 mb-3" />
                    <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-full mb-2" />
                    <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Loading Skeleton */}
            <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
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
          </>
        ) : bills.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[hsl(230_12%_40%)]/85 dark:text-[hsl(220_12%_78%)]/85 text-lg">
              No bills found. Check back soon for updates.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: Horizontal Scrollable */}
            <div
              ref={scrollContainerRef}
              className="md:hidden flex overflow-x-auto space-x-4 pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide"
              onScroll={handleScroll}
            >
              {bills.map((bill) => (
                <div key={bill._id} className="min-w-[280px] w-[85vw] max-w-[340px] snap-center flex-shrink-0">
                  <BillCard bill={bill} />
                </div>
              ))}
            </div>

            {/* Mobile Scroll Indicators */}
            {bills.length > 1 && (
              <div className="md:hidden flex justify-center mt-6">
                <div className="flex space-x-2">
                  {bills.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "transition-all duration-300 rounded-full",
                        selectedIndex === index ? "w-8 h-2 bg-[hsl(233_85%_60%)]" : "w-2 h-2 bg-[hsl(233_85%_60%)]/40"
                      )}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Desktop: Grid layout */}
            <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
              {bills.map((bill) => (
                <BillCard key={bill._id} bill={bill} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  let colorClass = "status-committee"; // Default to warning/committee status
  let icon = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />;

  if (s.includes("passed") || s.includes("enacted")) {
    colorClass = "status-passed";
    icon = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />;
  } else if (s.includes("failed") || s.includes("rejected")) {
    colorClass = "status-failed";
    icon = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />;
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium", colorClass)}>
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
        "hover:border-[hsl(233_85%_60%)]/40 hover:shadow-[0_24px_60px_-28px_rgba(66,99,235,0.35)]",
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
            <ImpactChip key={i} label={area} />
          ))}
          {bill.impactAreas.length > 3 && (
            <span className="text-xs text-[hsl(230_12%_45%)] dark:text-[hsl(220_12%_78%)]/80">+{bill.impactAreas.length - 3} more</span>
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
          className="text-[hsl(233_85%_55%)] hover:text-[hsl(233_85%_60%)] dark:text-[hsl(233_85%_65%)] dark:hover:text-[hsl(233_85%_75%)] transition-colors text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(233_85%_60%)]/60 rounded px-1"
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
    <footer id="about" className="relative mt-16 bg-gradient-to-b from-transparent to-white/70 dark:to-white/[0.04]">
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
              <li>
                <Link href="/bills" className="hover:text-[hsl(233_85%_60%)] transition-colors">
                  Bills
                </Link>
              </li>
              <li>
                <Link href="/politicians" className="hover:text-[hsl(233_85%_60%)] transition-colors">
                  Politicians
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-[hsl(233_85%_60%)] transition-colors">
                  Search
                </a>
              </li>
              <li>
                <a href="/api" className="hover:text-[hsl(233_85%_60%)] transition-colors">
                  API
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-[hsl(230_16%_20%)] dark:text-white mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-[hsl(230_12%_40%)]/90 dark:text-[hsl(220_12%_78%)]/90">
              <li>
                <a href="/about" className="hover:text-[hsl(233_85%_60%)] transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[hsl(233_85%_60%)] transition-colors">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[hsl(233_85%_60%)] transition-colors">
                  Terms
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[hsl(233_85%_60%)] transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}