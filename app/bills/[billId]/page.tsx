"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useConvexAuth, useQuery, useAction } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { useConvex } from "convex/react";
import Link from "next/link";
import Header from "@/components/Header";

// Responsive helper to detect mobile viewport
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < breakpoint);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [breakpoint]);
  return isMobile;
}

// Props from Next.js dynamic routing
type PageProps = {
  params: Promise<{
    billId: string;
  }>;
};

type ChangeAnalysisItem = {
  title?: string;
  currentLaw?: string;
  proposedChange?: string;
  citations?: Array<{ label: string; sectionId: string }>;
};

type BillData = {
  _id: Id<"bills">;
  _creationTime: number;
  congress: number;
  billType: string;
  billNumber: string;
  title: string;
  cleanedShortTitle?: string;
  sponsorId?: Id<"politicians">;
  committees?: string[];
  latestVersionCode?: string;
  latestActionDate?: string;
  status: string;
  tagline?: string;
  summary?: string;
  changeAnalysis?: string | Array<ChangeAnalysisItem>;
  impactAreas?: string[];
  structuredSummary?: Array<{
    title: string;
    text: string;
    citations?: Array<{ label: string; sectionId: string }>;
  }>;
};

type BillVersionData = {
  _id: Id<"billVersions">;
  _creationTime: number;
  billId: Id<"bills">;
  versionCode: string;
  title: string;
  publishedDate: string;
  xmlUrl: string;
};

type SearchResult = {
  excerpt: string;
  position: number;
};

type MobileTabType = "summary" | "chat" | "text";

const statusClassMap: Record<string, string> = {
  IN_COMMITTEE: "status-committee",
  PASSED_HOUSE: "status-passed",
  PASSED_SENATE: "status-passed",
  ENACTED: "status-enacted",
  INTRODUCED: "status-introduced",
  FAILED: "status-failed",
};

const lifecycleOrder = [
  "INTRODUCED",
  "IN_COMMITTEE",
  "PASSED_HOUSE",
  "PASSED_SENATE",
  "ENACTED",
];

function getLifecycleProgress(status?: string) {
  if (!status) return 0.1;
  const idx = lifecycleOrder.indexOf(status);
  if (idx < 0) return 0.1;
  return (idx + 1) / lifecycleOrder.length;
}

function classNames(...arr: Array<string | false | undefined>) {
  return arr.filter(Boolean).join(" ");
}

// Split long, newline-less text into display-friendly chunks while preserving
// character positions so scroll mapping based on char indices stays correct.
function chunkTextByDisplay(text: string, maxCharsPerLine = 280): Array<string> {
  const chunks: Array<string> = [];
  let startIndex = 0;
  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + maxCharsPerLine, text.length);

    if (endIndex < text.length) {
      const lastWhitespace = text.lastIndexOf(" ", endIndex);
      // Only wrap on whitespace if it meaningfully shortens the line to avoid tiny chunks
      if (lastWhitespace > startIndex + Math.floor(maxCharsPerLine * 0.5)) {
        endIndex = lastWhitespace + 1; // include the space to preserve exact character positions
      }
    }

    chunks.push(text.slice(startIndex, endIndex));
    startIndex = endIndex;
  }
  return chunks;
}

// Add BillCard-style date parsing/formatting helpers
function parseBillDate(input?: string): Date | null {
  if (!input) return null;
  const s = String(input).trim();
  if (/^\d{8}$/.test(s)) {
    const year = Number(s.slice(0, 4));
    const month = Number(s.slice(4, 6)) - 1;
    const day = Number(s.slice(6, 8));
    const d = new Date(Date.UTC(year, month, day));
    return isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{10}$/.test(s)) {
    const d = new Date(Number(s) * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{13}$/.test(s)) {
    const d = new Date(Number(s));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(dateString?: string) {
  const d = parseBillDate(dateString);
  return d
    ? d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "";
}

const BillPage: React.FC<PageProps> = ({ params }) => {
  const { isAuthenticated } = useConvexAuth();
  const convex = useConvex();
  const isMobile = useIsMobile();

  const [billId, setBillId] = useState<Id<"bills"> | null>(null);

  useEffect(() => {
    const getBillId = async () => {
      const resolvedParams = await params;
      setBillId(resolvedParams.billId as Id<"bills">);
    };
    getBillId();
  }, [params]);

  const billWithSponsor = useQuery(
    api.billpage.getBillWithSponsor,
    billId ? { billId } : "skip"
  );
  const latestVersion = useQuery(
    api.billpage.getLatestBillVersion,
    billId ? { billId } : "skip"
  );
  const versions = useQuery(
    api.billpage.getBillVersions,
    billId ? { billId } : "skip"
  );

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const versionIdToLoad = selectedVersionId ?? latestVersion?._id ?? null;
  const versionText = useQuery(
    api.billpage.getBillVersionText,
    versionIdToLoad ? { versionId: versionIdToLoad as Id<"billVersions"> } : "skip"
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [activeMobileTab, setActiveMobileTab] = useState<MobileTabType>("summary");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([
    {
      role: "assistant",
      content:
        "Welcome! Ask me anything about this bill—scope, impact, changes to current law.",
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const chatAboutBill = useAction(api.agent.chatAboutBill);

  const textContainerRef = useRef<HTMLDivElement | null>(null);
  const [highlightRanges, setHighlightRanges] = useState<number[]>([]);

  useEffect(() => {
    if (!selectedVersionId && latestVersion?._id) {
      setSelectedVersionId(latestVersion._id as unknown as string);
    }
  }, [latestVersion, selectedVersionId]);

  const bill = billWithSponsor?.bill;
  const sponsor = billWithSponsor?.sponsor;
  const impactAreas = bill?.impactAreas ?? [];
  const lifecycleProgress = getLifecycleProgress(bill?.status);
  const statusClass = bill?.status ? statusClassMap[bill.status] ?? "" : "";

  const parsedChangeAnalysis: ChangeAnalysisItem[] = useMemo(() => {
    if (!bill?.changeAnalysis) return [];
    if (typeof bill.changeAnalysis === "string") {
      try {
        const arr = JSON.parse(bill.changeAnalysis);
        if (Array.isArray(arr)) return arr as ChangeAnalysisItem[];
        return [];
      } catch {
        return [
          {
            title: "Proposed Changes",
            proposedChange: bill.changeAnalysis,
          },
        ];
      }
    }
    if (Array.isArray(bill.changeAnalysis)) {
      return bill.changeAnalysis as ChangeAnalysisItem[];
    }
    return [];
  }, [bill?.changeAnalysis]);

  const lines = useMemo(() => {
    const text = versionText?.fullText ?? "";
    if (!text) return [] as Array<string>;

    // Prefer natural newlines when present; otherwise, create virtual lines for display
    const split = text.split(/\r?\n/);
    if (split.length > 1) return split;

    return chunkTextByDisplay(text, 280);
  }, [versionText?.fullText]);

  const scrollToPosition = (charIndex: number) => {
    const container = textContainerRef.current;
    if (!container) return;

    const rawText = versionText?.fullText ?? "";
    const hasNewlines = /\r?\n/.test(rawText);

    let cumulative = 0;
    let targetLineIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      // If the source had newlines and we split on them, add one to account for the removed newline char.
      // If we generated virtual lines, do not add an extra character.
      cumulative += lines[i].length + (hasNewlines ? 1 : 0);
      if (cumulative >= charIndex) {
        targetLineIdx = i;
        break;
      }
    }

    const lineEl = container.querySelector<HTMLDivElement>(
      `[data-line-index="${targetLineIdx}"]`
    );
    if (lineEl && container) {
      container.scrollTo({
        top: (lineEl.offsetTop ?? 0) - 16,
        behavior: "smooth",
      });
      setHighlightRanges([targetLineIdx]);
      setTimeout(() => setHighlightRanges([]), 2200);
    }
  };

  const handleCitationClick = async (sectionId: string) => {
    if (!billId) return;
    try {
      const section = await convex.query(api.billpage.getBillSection, {
        billId,
        sectionId,
      });
      if (section?.startPosition != null) {
        if (section.versionId !== versionIdToLoad) {
          setSelectedVersionId(section.versionId as unknown as string);
        }
        setActiveMobileTab("text");
        setTimeout(() => {
          scrollToPosition(section.startPosition);
        }, 100);
      }
    } catch (e) {
      console.error("Failed to load section", e);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchTerm.trim() || !billId) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await convex.query(api.billpage.searchBillText, {
        billId,
        searchTerm: searchTerm.trim(),
      });
      const flatResults: SearchResult[] = [];
      results.forEach((versionResult) => {
        versionResult.matches.forEach((match: SearchResult) => {
          flatResults.push(match);
        });
      });
      setSearchResults(flatResults);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClickSearchResult = (pos: number) => {
    setActiveMobileTab("text");
    scrollToPosition(pos);
  };

  const handleVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVersionId(e.target.value);
    setHighlightRanges([]);
  };

  const handleSendChat = async () => {
    const content = chatInput.trim();
    if (!content || !billId || isChatLoading) return;

    if (!isAuthenticated) {
      setChatMessages((prev) => [
        ...prev,
        { role: "user", content },
        {
          role: "assistant",
          content:
            "Please sign in to chat about this bill. This feature requires authentication to provide personalized responses.",
        },
      ]);
      setChatInput("");
      return;
    }

    setChatMessages((prev) => [...prev, { role: "user", content }]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await chatAboutBill({
        billId: billId,
        question: content,
      });
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.answer,
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error processing your question. Please try again.",
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Hover vs click state resolution
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const openDetails = isMobile ? detailsOpen : isHovering;
  useEffect(() => {
    const el = detailsRef.current;
    if (!el) return;
    const update = () => setMeasuredHeight(el.scrollHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [bill?.tagline, impactAreas.length, lifecycleProgress, detailsOpen, isHovering, isMobile]);

  if (!billId) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] pt-16">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-[var(--color-primary)] hover:opacity-80 transition"
            >
              ← Back to Home
            </Link>
          </div>
          <div className="max-w-7xl mx-auto px-4 py-20 text-center">
            <div className="text-lg">Loading bill information...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] pt-16">
        {/* Top Nav / Back */}
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-end gap-3" />

        {/* Header */}
        <header className="max-w-7xl mx-auto px-4">
          <div
            className="card p-0 shadow-[var(--shadow-lg)] rounded-xl border border-[var(--color-border)]/60 overflow-hidden"
            onMouseEnter={() => !isMobile && setIsHovering(true)}
            onMouseLeave={() => !isMobile && setIsHovering(false)}
          >
            {/* Top bar (accordion header) */}
            <button
              type="button"
              className="relative w-full text-left p-4 md:p-5 flex items-start gap-4 bg-[var(--color-card)] hover:bg-[var(--color-card-muted)]/60 transition-colors header-bar"
              onClick={() => {
                if (isMobile) setDetailsOpen((o) => !o);
              }}
              aria-expanded={openDetails}
            >
              <div className="flex-1 min-w-0 pr-10 md:pr-12">
                <div className="text-xs md:text-sm font-medium text-[var(--color-muted-foreground)]">
                  {bill
                    ? `${bill.congress}th — ${bill.billType} ${bill.billNumber}`
                    : "Loading..."}
                </div>
                <h1
                  className="mt-1 text-lg md:text-2xl leading-snug tracking-tight line-clamp-2"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {bill?.title ?? (
                    <span className="inline-block h-6 w-2/3 bg-[var(--color-card-muted)] rounded animate-pulse" />
                  )}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={classNames(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs shadow-sm border border-[var(--color-border)]/70",
                      statusClass
                    )}
                    title="Current status"
                  >
                    {bill?.status ?? "—"}
                  </span>
                  {bill?.latestActionDate && (() => {
                    const d = parseBillDate(bill.latestActionDate);
                    const display = formatDate(bill.latestActionDate);
                    return d ? (
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        Updated <time dateTime={d.toISOString()}>{display}</time>
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>
              <svg
                className={classNames(
                  "absolute right-4 md:right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-muted-foreground)] transition-transform",
                  openDetails ? "rotate-180" : "rotate-0"
                )}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expanded details with animated height */}
            <div
              ref={detailsRef}
              className={classNames(
                "bg-[var(--color-card)] transition-[max-height,opacity,transform] duration-300 ease-out",
                openDetails ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
              )}
              style={{ maxHeight: openDetails ? measuredHeight : 0, overflow: "hidden" }}
            >
              <div className={classNames("md:p-5 p-4", openDetails ? "border-t border-[var(--color-border)]" : "border-t-0")}> 
                {bill?.tagline && (
                  <div className="section-block mb-3">
                    <div className="section-title">Overview</div>
                    <div className="text-[var(--color-muted-foreground)]">{bill.tagline}</div>
                  </div>
                )}

                {(sponsor?.name || (bill?.committees && bill.committees.length > 0)) && (
                  <div className="section-block mb-3">
                    <div className="section-title">Sponsor & Committees</div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {sponsor?.name && (
                        <div>
                          <div className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)] mb-1">Sponsor</div>
                          <div className="text-sm">{sponsor.name}</div>
                        </div>
                      )}
                      {bill?.committees && bill.committees.length > 0 && (
                        <div>
                          <div className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)] mb-1">Committees</div>
                          <div className="flex flex-wrap gap-1.5">
                            {bill.committees.map((c, i) => (
                              <span key={i} className="pill">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="section-block mb-3">
                  <div className="section-title">Legislative Status</div>
                  <div className="mt-2">
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.round(lifecycleProgress * 100)}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wide">
                      {lifecycleOrder.map((step) => (
                        <span key={step} className="w-1/5 text-center">
                          {step.replace("_", " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {impactAreas.length > 0 && (
                  <div className="section-block">
                    <div className="section-title">Impact Areas</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {impactAreas.map((area: string, idx: number) => (
                        <span key={idx} className="pill">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Tabs (sticky) */}
        <div className="md:hidden max-w-7xl mx-auto px-4 mt-4 sticky top-0 z-20">
          <div className="flex rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden">
            {[
              { key: "summary" as const, label: "Summary" },
              { key: "chat" as const, label: "Chat" },
              { key: "text" as const, label: "Bill Text" },
            ].map((tab) => (
              <button
                key={tab.key}
                className={classNames(
                  "flex-1 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] transition",
                  activeMobileTab === tab.key
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-card-muted)]"
                )}
                onClick={() => setActiveMobileTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 mt-4 md:grid md:grid-cols-2 md:gap-4">
          {/* Left Pane */}
          <section className="md:col-span-1 space-y-4">
            {/* Desktop Tabs */}
            <div className="hidden md:block">
              <div className="card p-0 overflow-hidden shadow-[var(--shadow-md)] rounded-xl border border-[var(--color-border)]/60">
                <DesktopTabs>
                  <DesktopTab label="AI Summary" defaultActive>
                    <AISummary
                      bill={bill}
                      parsedChangeAnalysis={parsedChangeAnalysis}
                      onCitationClick={handleCitationClick}
                    />
                  </DesktopTab>
                  <DesktopTab label="Chat">
                    <ChatBox
                      messages={chatMessages}
                      input={chatInput}
                      onChangeInput={setChatInput}
                      onSend={handleSendChat}
                      isLoading={isChatLoading}
                      isAuthenticated={isAuthenticated}
                    />
                  </DesktopTab>
                </DesktopTabs>
              </div>
            </div>

            {/* Mobile conditional content */}
            <div className="md:hidden">
              {activeMobileTab === "summary" && (
                <div className="card p-4 shadow-[var(--shadow-md)] rounded-xl border border-[var(--color-border)]/60">
                  <AISummary
                    bill={bill}
                    parsedChangeAnalysis={parsedChangeAnalysis}
                    onCitationClick={handleCitationClick}
                  />
                </div>
              )}
              {activeMobileTab === "chat" && (
                <div className="card p-0 shadow-[var(--shadow-md)] rounded-xl border border-[var(--color-border)]/60 overflow-hidden">
                  <ChatBox
                    messages={chatMessages}
                    input={chatInput}
                    onChangeInput={setChatInput}
                    onSend={handleSendChat}
                    isLoading={isChatLoading}
                    isAuthenticated={isAuthenticated}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Right Pane: Bill Text */}
          <section className="hidden md:block md:col-span-1 mt-4 md:mt-0">
            <div className="card p-0 shadow-[var(--shadow-md)] rounded-xl border border-[var(--color-border)]/60 overflow-hidden">
              {/* Header controls (sticky) */}
              <div className="p-3 border-b border-[var(--color-border)] flex flex-col gap-2 bg-[var(--color-card)] sticky top-[0] z-10">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-[var(--color-muted-foreground)]">
                    Version
                  </label>
                  <select
                    className="px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] transition"
                    value={selectedVersionId ?? ""}
                    onChange={handleVersionChange}
                  >
                    {versions?.map((v: BillVersionData) => (
                      <option key={v._id} value={v._id}>
                        {v.versionCode} — {new Date(v.publishedDate).toLocaleDateString()}
                      </option>
                    )) ?? <option>Loading...</option>}
                  </select>
                  {versionText?.fullText && (
                    <span className="ml-auto text-xs text-[var(--color-muted-foreground)]">
                      {lines.length.toLocaleString()} lines
                    </span>
                  )}
                </div>

                <form className="flex gap-2 items-center" onSubmit={handleSearch}>
                  <input
                    className="search-input flex-1"
                    placeholder="Search bill text..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button
                    className="btn-primary disabled:opacity-60"
                    type="submit"
                    disabled={isSearching}
                  >
                    {isSearching ? "Searching..." : "Search"}
                  </button>
                </form>

                {/* Search results list */}
                {searchResults.length > 0 && (
                  <div className="max-h-44 overflow-auto border border-[var(--color-border)] rounded-md bg-[var(--color-card)]">
                    {searchResults.map((r: SearchResult, idx: number) => (
                      <button
                        key={idx}
                        className="w-full text-left p-2 hover:bg-[var(--color-card-muted)] border-b last:border-b-0 border-[var(--color-border)] transition group"
                        onClick={() => handleClickSearchResult(r.position)}
                        title="Jump to position in text"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-[var(--color-muted-foreground)]">
                            Match at position {r.position}
                          </div>
                          <span className="opacity-0 group-hover:opacity-100 text-[var(--color-primary)] text-xs transition">
                            Jump →
                          </span>
                        </div>
                        <div className="text-sm line-clamp-2 mt-0.5">{r.excerpt}</div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.length === 0 && searchTerm && !isSearching && (
                  <div className="text-xs text-[var(--color-muted-foreground)]">
                    No matches for “{searchTerm}”.
                  </div>
                )}
              </div>

              {/* Bill Text */}
              <div
                className="h-[58vh] md:h-[72vh] overflow-auto bg-[var(--color-card-muted)]"
                ref={textContainerRef}
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {lines.length === 0 ? (
                  <div className="p-6 text-sm text-[var(--color-muted-foreground)]">
                    {versionIdToLoad ? "Loading bill text..." : "Select a version"}
                  </div>
                ) : (
                  <div className="p-4">
                    {lines.map((ln: string, i: number) => {
                      const highlighted = highlightRanges.includes(i);
                      return (
                        <div
                          key={i}
                          data-line-index={i}
                          className={classNames(
                            "whitespace-pre-wrap break-words py-0.5 rounded-sm px-1",
                            highlighted &&
                              "bg-[var(--color-primary)]/15 outline outline-1 outline-[var(--color-primary)]/40 transition-colors"
                          )}
                        >
                          {ln || " "}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          {activeMobileTab === "text" && (
            <section className="md:hidden mt-4">
              <div className="card p-0 shadow-[var(--shadow-md)] rounded-xl border border-[var(--color-border)]/60 overflow-hidden">
                <div className="p-3 border-b border-[var(--color-border)] flex flex-col gap-2 bg-[var(--color-card)] sticky top-[0] z-10">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-[var(--color-muted-foreground)]">Version</label>
                    <select
                      className="px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] transition"
                      value={selectedVersionId ?? ""}
                      onChange={handleVersionChange}
                    >
                      {versions?.map((v: BillVersionData) => (
                        <option key={v._id} value={v._id}>
                          {v.versionCode} — {new Date(v.publishedDate).toLocaleDateString()}
                        </option>
                      )) ?? <option>Loading...</option>}
                    </select>
                    {versionText?.fullText && (
                      <span className="ml-auto text-xs text-[var(--color-muted-foreground)]">
                        {lines.length.toLocaleString()} lines
                      </span>
                    )}
                  </div>

                  <form className="flex gap-2 items-center" onSubmit={handleSearch}>
                    <input
                      className="search-input flex-1"
                      placeholder="Search bill text..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button
                      className="btn-primary disabled:opacity-60"
                      type="submit"
                      disabled={isSearching}
                    >
                      {isSearching ? "Searching..." : "Search"}
                    </button>
                  </form>

                  {searchResults.length > 0 && (
                    <div className="max-h-44 overflow-auto border border-[var(--color-border)] rounded-md bg-[var(--color-card)]">
                      {searchResults.map((r: SearchResult, idx: number) => (
                        <button
                          key={idx}
                          className="w-full text-left p-2 hover:bg-[var(--color-card-muted)] border-b last:border-b-0 border-[var(--color-border)] transition group"
                          onClick={() => handleClickSearchResult(r.position)}
                          title="Jump to position in text"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-[var(--color-muted-foreground)]">
                              Match at position {r.position}
                            </div>
                            <span className="opacity-0 group-hover:opacity-100 text-[var(--color-primary)] text-xs transition">
                              Jump →
                            </span>
                          </div>
                          <div className="text-sm line-clamp-2 mt-0.5">{r.excerpt}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.length === 0 && searchTerm && !isSearching && (
                    <div className="text-xs text-[var(--color-muted-foreground)]">
                      No matches for “{searchTerm}”.
                    </div>
                  )}
                </div>

                <div
                  className="h-[58vh] overflow-auto bg-[var(--color-card-muted)]"
                  ref={textContainerRef}
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {lines.length === 0 ? (
                    <div className="p-6 text-sm text-[var(--color-muted-foreground)]">
                      {versionIdToLoad ? "Loading bill text..." : "Select a version"}
                    </div>
                  ) : (
                    <div className="p-4">
                      {lines.map((ln: string, i: number) => {
                        const highlighted = highlightRanges.includes(i);
                        return (
                          <div
                            key={i}
                            data-line-index={i}
                            className={classNames(
                              "whitespace-pre-wrap break-words py-0.5 rounded-sm px-1",
                              highlighted &&
                                "bg-[var(--color-primary)]/15 outline outline-1 outline-[var(--color-primary)]/40 transition-colors"
                            )}
                          >
                            {ln || " "}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </main>

        <footer className="h-8" />
      </div>
    </>
  );
};

/* ---------- Subcomponents ---------- */

interface DesktopTabProps {
  label: string;
  defaultActive?: boolean;
  children: React.ReactNode;
}

const DesktopTabs: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const childrenArray = React.Children.toArray(children);
  const [activeIndex, setActiveIndex] = useState(
    childrenArray.findIndex((child) => {
      if (React.isValidElement(child)) {
        return (child.props as DesktopTabProps).defaultActive;
      }
      return false;
    }) || 0
  );
  const items = childrenArray.filter(React.isValidElement) as React.ReactElement<DesktopTabProps>[];

  return (
    <div>
      <div className="flex bg-[var(--color-card)]/70 border-b border-[var(--color-border)]">
        {items.map((child, idx) => (
          <button
            key={idx}
            className={classNames(
              "px-4 py-2 text-sm border-b-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] transition",
              idx === activeIndex
                ? "text-[var(--color-primary)] border-[var(--color-primary)]"
                : "text-[var(--color-muted-foreground)] border-transparent hover:text-[var(--color-foreground)]"
            )}
            onClick={() => setActiveIndex(idx)}
          >
            {child.props.label}
          </button>
        ))}
      </div>
      <div className="p-4">{items[activeIndex]}</div>
    </div>
  );
};

const DesktopTab: React.FC<DesktopTabProps> = ({ children }) => <div>{children}</div>;

const AISummary: React.FC<{
  bill?: BillData;
  parsedChangeAnalysis: ChangeAnalysisItem[];
  onCitationClick: (sectionId: string) => void;
}> = ({ bill, parsedChangeAnalysis, onCitationClick }) => {
  const renderSummaryWithCitations = (text: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /\[([^\]]+)\]\(section:([^)]+)\)|\{([^|}]+)\|([^\}]+)\}/g;
    let lastIdx = 0;
    let match;
    while ((match = regex.exec(text))) {
      const before = text.slice(lastIdx, match.index);
      if (before) parts.push(<span key={lastIdx}>{before}</span>);
      const label = match[1] || match[3];
      const sectionId = match[2] || match[4];
      parts.push(
        <button
          key={`${match.index}-${sectionId}`}
          className="text-[var(--color-primary)] underline underline-offset-2 hover:opacity-80"
          onClick={() => onCitationClick(sectionId)}
        >
          {label}
        </button>
      );
      lastIdx = regex.lastIndex;
    }
    const after = text.slice(lastIdx);
    if (after) parts.push(<span key={`end-${lastIdx}`}>{after}</span>);
    return parts;
  };

  return (
    <div className="space-y-5">
      <div>
        <h2
          className="text-lg font-semibold mb-2 tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          AI Summary
        </h2>
        <div className="prose prose-sm max-w-none text-[var(--color-foreground)]">
          {bill?.summary ? (
            <p className="leading-relaxed">{renderSummaryWithCitations(bill.summary)}</p>
          ) : (
            <p className="text-[var(--color-muted-foreground)]">No summary available.</p>
          )}
        </div>
      </div>

      {bill?.structuredSummary && bill.structuredSummary.length > 0 && (
        <div>
          <h3
            className="text-base font-semibold mb-2 tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Key Sections
          </h3>
          <div className="space-y-3">
            {bill.structuredSummary.map((sec, idx) => (
              <div key={idx} className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-[var(--color-card)]">
                <div className="px-3 py-2 bg-[var(--color-card-muted)]/70 border-b border-[var(--color-border)] font-medium">
                  {sec.title}
                </div>
                <div className="p-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {sec.text}
                </div>
                {sec.citations && sec.citations.length > 0 && (
                  <div className="px-3 py-2 border-t border-[var(--color-border)] bg-[var(--color-card)]">
                    <div className="text-xs text-[var(--color-muted-foreground)] mb-1">Citations</div>
                    <div className="flex flex-wrap gap-2">
                      {sec.citations.map((c, i) => (
                        <button
                          key={i}
                          className="px-2 py-1 rounded-full text-xs bg-[var(--color-card-muted)] border border-[var(--color-border)] text-[var(--color-primary)] hover:opacity-90 transition"
                          onClick={() => onCitationClick(c.sectionId)}
                          title="Jump to section in Bill Text"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3
          className="text-base font-semibold mb-2 tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Current Law vs. Proposed Changes
        </h3>
        {parsedChangeAnalysis.length === 0 ? (
          <div className="text-sm text-[var(--color-muted-foreground)]">
            No change analysis available.
          </div>
        ) : (
          <div className="space-y-3">
            {parsedChangeAnalysis.map((item, idx) => (
              <div
                key={idx}
                className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-[var(--color-card)]"
              >
                {item.title && (
                  <div className="px-3 py-2 bg-[var(--color-card-muted)]/70 border-b border-[var(--color-border)] font-medium">
                    {item.title}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="p-3">
                    <div className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)] mb-1">
                      Current Law
                    </div>
                    <div className="text-sm leading-relaxed">
                      {item.currentLaw ?? "—"}
                    </div>
                  </div>
                  <div className="p-3 border-t md:border-t-0 md:border-l border-[var(--color-border)]">
                    <div className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)] mb-1">
                      Proposed Change
                    </div>
                    <div className="text-sm leading-relaxed">
                      {item.proposedChange ?? "—"}
                    </div>
                  </div>
                </div>
                {item.citations && item.citations.length > 0 && (
                  <div className="px-3 py-2 border-t border-[var(--color-border)] bg-[var(--color-card)]">
                    <div className="text-xs text-[var(--color-muted-foreground)] mb-1">
                      Citations
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.citations.map((c, i) => (
                        <button
                          key={i}
                          className="px-2 py-1 rounded-full text-xs bg-[var(--color-card-muted)] border border-[var(--color-border)] text-[var(--color-primary)] hover:opacity-90 transition"
                          onClick={() => onCitationClick(c.sectionId)}
                          title="Jump to section in Bill Text"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ChatBox: React.FC<{
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  input: string;
  onChangeInput: (s: string) => void;
  onSend: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}> = ({ messages, input, onChangeInput, onSend, isLoading, isAuthenticated }) => {
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div className="flex flex-col h-[52vh] md:h-[62vh]">
      <div
        ref={bodyRef}
        className="flex-1 overflow-auto px-4 py-3 space-y-3 bg-[var(--color-card-muted)]"
      >
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={classNames(
              "max-w-[85%] px-3 py-2 rounded-2xl shadow-[var(--shadow-sm)] leading-relaxed",
              m.role === "user"
                ? "ml-auto bg-[var(--color-primary)] text-white"
                : "mr-auto bg-[var(--color-card)] border border-[var(--color-border)]"
            )}
          >
            <div className="text-sm">{m.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="mr-auto bg-[var(--color-card)] border border-[var(--color-border)] max-w-[85%] px-3 py-2 rounded-2xl shadow-[var(--shadow-sm)]">
            <div className="text-sm text-[var(--color-muted-foreground)]">
              Analyzing bill content...
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-[var(--color-border)] p-2 flex items-center gap-2 bg-[var(--color-card)]">
        <input
          className="search-input flex-1"
          placeholder={
            isAuthenticated ? "Ask about the bill..." : "Sign in to chat about this bill"
          }
          value={input}
          onChange={(e) => onChangeInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          disabled={isLoading || !isAuthenticated}
        />
        <button
          className="btn-primary"
          onClick={onSend}
          disabled={isLoading || !isAuthenticated}
          title={isAuthenticated ? "Send" : "Sign in required"}
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default BillPage;