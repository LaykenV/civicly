"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/cn";
import { Moon, SunDim } from "lucide-react";
import { useTheme } from "next-themes";

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "text-sm font-medium text-[var(--color-muted)]",
        "hover:text-[var(--color-primary-55)]",
        "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/60 rounded-md px-2 py-1"
      )}
    >
      {label}
    </Link>
  );
}

function UserMenu({
  user,
  onClose,
  onSignOut,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null } | null | undefined;
  onClose: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64">
      <div className="rounded-2xl p-4 bg-[var(--color-card-solid)] border border-[var(--color-border)] shadow-[0_28px_64px_-28px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--color-border)]">
          <div className="w-10 h-10 rounded-full bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] flex items-center justify-center text-white font-semibold">
            {user?.image ? (
              <img src={user.image} alt={user.name || "User"} className="w-full h-full rounded-md object-cover" />
            ) : (
              <span className="text-sm">{user?.name?.[0]?.toUpperCase() || "U"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--color-foreground)] truncate">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-[var(--color-muted)]/90 truncate">
              {user?.email || ""}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <Link
            href="/coming-soon"
            onClick={onClose}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-hover-bg)] rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>

          <button
            onClick={onSignOut}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-hover-bg)] rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple theme toggler using next-themes for persistence
function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const toggle = () => {
    const isDark = (resolvedTheme ?? "dark") === "dark";
    setTheme(isDark ? "light" : "dark");
  };

  if (!mounted) {
    return (
      <button aria-label="Toggle theme" title="Toggle theme" className={cn("icon-button", className)}>
        <SunDim className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button onClick={toggle} aria-label="Toggle theme" title="Toggle theme" className={cn("icon-button", className)}>
      {resolvedTheme === "dark" ? <SunDim className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

export default function Header() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const user = useQuery(api.myFunctions.getUser);
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showUserMenu && !target.closest(".user-menu-container")) {
        setShowUserMenu(false);
      }
      if (showMobileMenu && mobileMenuRef.current && !mobileMenuRef.current.contains(target) && !target.closest("label.hamburger") && !target.closest(".mobile-trigger")) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu, showMobileMenu]);

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-50 border-b transition-all",
        "supports-[backdrop-filter]:backdrop-blur-xl",
        scrolled
          ? "bg-[var(--color-card)] border-[var(--color-border-light)] shadow-sm"
          : "bg-transparent border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 relative">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/60 rounded-md"
            >
              <div className="relative">
                <span className="absolute inset-0 blur-xl bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] opacity-40 rounded-full" />
                <div className="relative w-8 h-8 rounded-lg bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))]" />
              </div>
              <h1 className="text-xl sm:text-2xl font-heading font-bold bg-clip-text text-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))]">
                Civicly
              </h1>
            </Link>

            <nav className="hidden md:flex items-center space-x-6">
              <NavLink href="/coming-soon" label="About" />
              <NavLink href="/coming-soon" label="Politicians" />
              <NavLink href="/coming-soon" label="All Bills" />
            </nav>
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center space-x-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <div className="relative user-menu-container">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-hover-bg)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/60"
                >
                  <span className="hidden sm:block text-sm font-medium text-[var(--color-foreground)]">
                    {user?.name || "User"}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] flex items-center justify-center text-white font-semibold">
                    {user?.image ? (
                      <img src={user.image} alt={user?.name || "User"} className="w-full h-full rounded-md object-cover" />
                    ) : (
                      <span className="text-xs">{user?.name?.[0]?.toUpperCase() || "U"}</span>
                    )}
                  </div>
                </button>

                {showUserMenu && (
                  <UserMenu
                    user={user}
                    onClose={() => setShowUserMenu(false)}
                    onSignOut={() => {
                      setShowUserMenu(false);
                      void signOut().then(() => router.push("/auth"));
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => router.push("/auth?flow=signIn")} className="group btn-oauth w-full">
                  <span className="pointer-events-none absolute left-[-150%] top-0 h-full w-[200%] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.6),transparent)] dark:bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.18),transparent)] transition-all duration-700 ease-out group-hover:left-[150%]" />
                  Sign In
                </button>
                <button onClick={() => router.push("/auth?flow=signUp")} className="btn-primary w-full">
                  Get Started
                </button>
              </div>
            )}
          </div>

          {/* Mobile actions */}
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated ? (
              <button
                className="mobile-trigger flex items-center gap-3 px-2 py-1 rounded-lg"
                onClick={() => setShowMobileMenu((s) => !s)}
              >
                <div className="w-8 h-8 rounded-full bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] flex items-center justify-center text-white font-semibold">
                  {user?.image ? (
                    <img src={user.image} alt={user?.name || "User"} className="w-full h-full rounded-md object-cover" />
                  ) : (
                    <span className="text-xs">{user?.name?.[0]?.toUpperCase() || "U"}</span>
                  )}
                </div>
              </button>
            ) : null}

            {/* Hamburger toggle */}
            <label className="hamburger" aria-label="Open menu">
              <input
                type="checkbox"
                checked={showMobileMenu}
                onChange={() => setShowMobileMenu((s) => !s)}
                aria-checked={showMobileMenu}
                aria-controls="mobile-menu"
              />
              <svg viewBox="0 0 32 32" aria-hidden width="32" height="32">
                <path className="line line-top-bottom" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"></path>
                <path className="line" d="M7 16 27 16"></path>
              </svg>
            </label>
          </div>

          {/* Mobile menu drawer */}
          {showMobileMenu && (
            <div id="mobile-menu" ref={mobileMenuRef} className="md:hidden absolute right-4 top-[calc(100%+8px)] z-50 w-[min(92vw,20rem)] mobile-menu-container">
              <div className="relative rounded-2xl p-4 bg-[var(--color-card-solid)] border border-[var(--color-border)] shadow-[0_28px_64px_-28px_rgba(0,0,0,0.45)] backdrop-blur-xl space-y-3">
                <div className="absolute right-3 top-3">
                  <ThemeToggle />
                </div>
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3 pb-3 border-b border-[var(--color-border)]">
                      <div className="w-10 h-10 rounded-full bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] flex items-center justify-center text-white font-semibold">
                        {user?.image ? (
                          <img src={user.image} alt={user?.name || "User"} className="w-full h-full rounded-md object-cover" />
                        ) : (
                          <span className="text-sm">{user?.name?.[0]?.toUpperCase() || "U"}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-foreground)] truncate">{user?.name || "User"}</p>
                        <p className="text-xs text-[var(--color-muted)]/90 truncate">{user?.email || ""}</p>
                      </div>
                    </div>
                    {/* Nav links for mobile */}
                    <Link href="/coming-soon" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-hover-bg)] rounded-lg transition-colors">
                      About
                    </Link>
                    <Link href="/coming-soon" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-hover-bg)] rounded-lg transition-colors">
                      Politicians
                    </Link>
                    <Link href="/coming-soon" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-hover-bg)] rounded-lg transition-colors">
                      All Bills
                    </Link>
                    <div className="my-1 border-t border-[var(--color-border)]" />
                    <Link href="/coming-soon" className="flex items-center gap-3 w-full px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-hover-bg)] rounded-lg transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      </svg>
                      <span>Settings</span>
                    </Link>
                    <button
                      onClick={() => {
                        setShowMobileMenu(false);
                        void signOut().then(() => router.push("/auth"));
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-hover-bg)] rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Nav links for mobile */}
                    <Link href="/coming-soon" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-hover-bg)] rounded-lg transition-colors">
                      About
                    </Link>
                    <Link href="/coming-soon" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-hover-bg)] rounded-lg transition-colors">
                      Politicians
                    </Link>
                    <Link href="/coming-soon" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-hover-bg)] rounded-lg transition-colors">
                      All Bills
                    </Link>
                    <div className="my-1 border-t border-[var(--color-border)]" />
                    <button onClick={() => { setShowMobileMenu(false); router.push("/auth?flow=signIn"); }} className="group btn-oauth w-full">
                      <span className="pointer-events-none absolute left-[-150%] top-0 h-full w-[200%] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.6),transparent)] dark:bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.18),transparent)] transition-all duration-700 ease-out group-hover:left-[150%]" />
                      Sign In
                    </button>
                    <button onClick={() => { setShowMobileMenu(false); router.push("/auth?flow=signUp"); }} className="btn-primary w-full">
                      Get Started
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 