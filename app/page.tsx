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
    light: "bg-[color:var(--color-success-bg)]/40",
    dark: "bg-[color:var(--color-success-bg)]/10",
    textLight: "text-[color:var(--color-success-text)]",
    textDark: "text-[color:var(--color-success-text)]",
    borderLight: "border-[color:var(--color-success-border)]",
    borderDark: "border-[color:var(--color-success-border)]/20",
  },
  "Armed Forces": {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  "Civil Rights": {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  Commerce: {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  Crime: {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  Economics: {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  Education: {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  Energy: {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  Environment: {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  Finance: {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  "Government Operations": {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  Health: {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  Housing: {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  Immigration: {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  "International Affairs": {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  Labor: {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  Law: {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  "Native Americans": {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  "Public Lands": {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  Science: {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  "Social Issues": {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  "Social Security": {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  Sports: {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  Taxation: {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  Technology: {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  Transportation: {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
  "Water Resources": {
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-muted-dark)]",
    textDark: "text-[var(--color-muted)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  },
};

/* ---------- Page ---------- */

export default function Homepage() {
  return (
    <main className="min-h-screen overflow-x-hidden" style={{ background: "linear-gradient(180deg, var(--color-background), var(--color-background-end) 30%)" }}>
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
    light: "bg-[var(--color-card)]",
    dark: "bg-[var(--color-card)]",
    textLight: "text-[var(--color-primary-55)]",
    textDark: "text-[var(--color-foreground)]",
    borderLight: "border-[var(--color-border)]",
    borderDark: "border-[var(--color-border)]",
  };

  return (
    <span
      className={cn(
        "text-[10px] px-2 py-0.5 rounded-full border",
        c.light,
        c.textLight,
        c.borderLight
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
      <div aria-hidden className="pointer-events-none absolute -top-40 -left-24 h-[28rem] w-[28rem] rounded-full blur-3xl bg-[var(--color-primary)]/25" />
      <div aria-hidden className="pointer-events-none absolute -top-16 right-0 h-[22rem] w-[22rem] rounded-full blur-3xl bg-[var(--color-accent)]/18" />
      <div aria-hidden className="absolute inset-0 [mask-image:radial-gradient(60%_60%_at_50%_5%,black,transparent)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/40 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto text-center relative w-full">
        <span className="inline-flex items-center gap-2 text-xs md:text-sm font-medium rounded-full px-3 py-1 bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-muted)] backdrop-blur">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
          Live legislative insights updated daily
        </span>

        <h1 className="mt-8 md:mt-10 text-4xl md:text-6xl lg:text-7xl font-heading font-bold leading-[1.05] tracking-tight">
          <span className="inline-block pr-[0.04em] bg-clip-text text-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))]">
            Understand Congress,
          </span>{" "}
          instantly.
        </h1>

        <p className="mt-6 md:mt-8 text-base md:text-xl text-[var(--color-muted-darker)]/85 max-w-3xl mx-auto">
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
      className="w-full text-left p-4 rounded-xl transition-colors border border-[var(--color-border)] hover:border-[var(--color-primary)]/35 hover:bg-[var(--color-card)] bg-[var(--color-card)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/60"
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)] mb-1">
            {result.congress}th • {result.billType.toUpperCase()} {result.billNumber}
          </div>
          <h3 className="text-sm font-semibold text-[var(--color-foreground-dark)] line-clamp-2">
            {result.title}
          </h3>
          {result.tagline && (
            <p className="mt-1 text-xs text-[var(--color-muted-dark)]/85 italic line-clamp-1">
              {result.tagline}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <span className="inline-flex items-center px-2 py-1 rounded-md bg-[var(--color-primary)]/15 text-[10px] text-[var(--color-primary-55)]">
            {(result.relevanceScore * 100).toFixed(0)}% match
          </span>
          <span className="text-[10px] text-[var(--color-muted)]">
            {result.relevantChunks} section{result.relevantChunks !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {result.sponsor && (
        <div className="text-xs text-[var(--color-muted-dark)] mt-2">
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
            <span className="text-[10px] text-[var(--color-muted)]">
              +{result.impactAreas.length - 4} more
            </span>
          )}
        </div>
      )}

      <div className="mt-2 text-xs text-[var(--color-muted)] line-clamp-2">
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
      "Healthcare Reform",
      "Climate Policy",
      "Immigration Reform",
      "Tax Policy",
      "Small Business",
      "Education Funding",
      "Federal Budget",
      "Criminal Justice",
      "Technology Policy",
      "Defense Spending",
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
          "bg-[var(--color-card)] border border-[var(--color-border)]",
          "shadow-xl backdrop-blur-xl"
        )}
      >
        <label htmlFor="main-search" className="sr-only">
          Search bills
        </label>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            {isSearching ? (
              <div className="animate-spin h-5 w-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
            ) : (
              <svg
                className="h-5 w-5 text-[var(--color-muted-lighter)]"
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
              "placeholder:text-[var(--color-placeholder)]",
              "text-[var(--color-foreground-light)]",
              "focus:outline-none focus:border-[var(--color-primary)]/70",
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
              className="absolute inset-y-0 right-14 pr-2 flex items-center text-[var(--color-muted-lighter)] hover:text-[var(--color-foreground)] focus:outline-none"
              aria-label="Clear search"
              title="Clear"
            >
              ×
            </button>
          )}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <kbd className="inline-flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-xs text-[var(--color-muted)] backdrop-blur">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Dropdown results */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 max-w-full">
          <div className="rounded-2xl p-3 md:p-4 bg-[var(--color-card-solid)] border border-[var(--color-border)] shadow-xl backdrop-blur-xl">
            {isSearching && (
              <div className="p-4 flex items-center gap-3 text-sm text-[var(--color-muted)]">
                <div className="animate-spin h-4 w-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
                Searching bills…
              </div>
            )}

            {!isSearching && searchResults?.summary && (
              <div className="mb-3 md:mb-4 p-3 rounded-lg bg-[var(--color-primary)]/10">
                <p className="text-sm text-[var(--color-primary-55)]">{searchResults.summary}</p>
                {searchResults.totalChunks > 0 && (
                  <p className="text-xs text-[var(--color-muted)] mt-1">
                    Searched {searchResults.totalChunks} sections of legislative text
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {!isSearching && (!searchResults || searchResults.results.length === 0) && (
                <div className="p-8 text-center text-sm text-[var(--color-muted)]">
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-64 w-[50rem] rounded-full blur-3xl bg-[var(--color-accent)]/12" />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="text-left mb-8 md:mb-10">
          <h2 className="text-2xl md:text-4xl font-heading font-bold tracking-tight text-[var(--color-foreground-dark)]">
            Latest Bills
          </h2>
          <p className="mt-2 text-[var(--color-muted)]">
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
                      "bg-[var(--color-card)] border border-[var(--color-border)]",
                      "animate-pulse"
                    )}
                  >
                    <div className="h-3 bg-[var(--color-border-light)] rounded w-1/3 mb-3" />
                    <div className="h-5 bg-[var(--color-border-light)] rounded w-3/4 mb-3" />
                    <div className="h-4 bg-[var(--color-border-light)] rounded w-full mb-2" />
                    <div className="h-4 bg-[var(--color-border-light)] rounded w-2/3" />
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
                    "bg-[var(--color-card)] border border-[var(--color-border)]",
                    "animate-pulse"
                  )}
                >
                  <div className="h-3 bg-[var(--color-border-light)] rounded w-1/3 mb-3" />
                  <div className="h-5 bg-[var(--color-border-light)] rounded w-3/4 mb-3" />
                  <div className="h-4 bg-[var(--color-border-light)] rounded w-full mb-2" />
                  <div className="h-4 bg-[var(--color-border-light)] rounded w-2/3" />
                </div>
              ))}
            </div>
          </>
        ) : bills.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--color-muted)] text-lg">
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
                        selectedIndex === index ? "w-8 h-2 bg-[var(--color-primary)]" : "w-2 h-2 bg-[var(--color-primary)]/40"
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
        "bg-[var(--color-card)] border border-[var(--color-border)]",
        "hover:border-[var(--color-primary)]/40 hover:shadow-xl",
        "transition-all"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-[var(--color-muted)]">
          {bill.congress}th Congress • {bill.billType.toUpperCase()} {bill.billNumber}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/bills/${bill._id}`}
            className="text-[var(--color-primary-55)] hover:text-[var(--color-primary)] text-xs font-semibold"
          >
            Details →
          </Link>
        </div>
      </div>

      <h3 className="text-lg md:text-xl font-heading font-semibold text-[var(--color-foreground-dark)] mb-2 line-clamp-2">
        {truncate(bill.title)}
      </h3>

      {bill.tagline && (
        <p className="text-[var(--color-muted-dark)] mb-4 text-sm italic line-clamp-2">
          {bill.tagline}
        </p>
      )}

      <div className="flex items-center gap-3 mb-4">
        <StatusBadge status={bill.status} />
        {bill.latestActionDate && (
          <time dateTime={bill.latestActionDate} className="text-xs text-[var(--color-muted)]">
            {formatDate(bill.latestActionDate)}
          </time>
        )}
      </div>

      {bill.sponsor && (
        <div className="text-sm text-[var(--color-muted-dark)] mb-4">
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
            <span className="text-xs text-[var(--color-muted)]">+{bill.impactAreas.length - 3} more</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--color-border)]">
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
          className="text-[var(--color-primary-55)] hover:text-[var(--color-primary-65)] transition-colors text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/60 rounded px-1"
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
    <footer id="about" className="relative mt-16 bg-gradient-to-b from-transparent to-[color:var(--color-card)]">
      <div aria-hidden className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/50 to-transparent" />
      <div className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))]" />
              <h3 className="text-lg font-heading font-bold bg-clip-text text-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))]">
                Civicly
              </h3>
            </div>
            <p className="text-[var(--color-muted-dark)] mb-4 max-w-lg">
              Making complex legislative information accessible, credible, and empowering for every citizen.
            </p>
            <p className="text-sm text-[var(--color-muted)]">© 2024 Civicly. All rights reserved.</p>
          </div>

          <div>
            <h4 className="font-medium text-[var(--color-foreground-dark)] mb-3">Platform</h4>
            <ul className="space-y-2 text-sm text-[var(--color-muted)]">
              <li>
                <Link href="/coming-soon" className="hover:text-[var(--color-primary)] transition-colors">
                  Bills
                </Link>
              </li>
              <li>
                <Link href="/coming-soon" className="hover:text-[var(--color-primary)] transition-colors">
                  Politicians
                </Link>
              </li>
              <li>
                <Link href="/coming-soon" className="hover:text-[var(--color-primary)] transition-colors">
                  Search
                </Link>
              </li>
              <li>
                <Link href="/coming-soon" className="hover:text-[var(--color-primary)] transition-colors">
                  API
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-[var(--color-foreground-dark)] mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-[var(--color-muted)]">
              <li>
                <Link href="/coming-soon" className="hover:text-[var(--color-primary)] transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/coming-soon" className="hover:text-[var(--color-primary)] transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/coming-soon" className="hover:text-[var(--color-primary)] transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/coming-soon" className="hover:text-[var(--color-primary)] transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}