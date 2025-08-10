"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/cn";

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "text-sm font-medium text-[hsl(230_12%_40%)] dark:text-[hsl(220_12%_72%)]",
        "hover:text-[hsl(233_85%_55%)] dark:hover:text-[hsl(233_85%_65%)]",
        "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(233_85%_60%)]/60 rounded-md px-2 py-1"
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
      <div className="rounded-2xl p-4 bg-white dark:bg-[hsl(220_28%_12%)]/95 border border-black/5 dark:border-white/10 shadow-[0_28px_64px_-28px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-black/5 dark:border-white/10">
          <div className="w-10 h-10 rounded-full bg-[linear-gradient(135deg,hsl(233_85%_60%),hsl(43_74%_52%))] flex items-center justify-center text-white font-semibold">
            {user?.image ? (
              <img src={user.image} alt={user.name || "User"} className="w-full h-full rounded-md object-cover" />
            ) : (
              <span className="text-sm">{user?.name?.[0]?.toUpperCase() || "U"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[hsl(230_16%_20%)] dark:text-white truncate">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-[hsl(230_12%_45%)] dark:text-[hsl(220_12%_78%)]/80 truncate">
              {user?.email || ""}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-[hsl(230_12%_40%)] dark:text-[hsl(220_12%_72%)] hover:text-[hsl(230_16%_20%)] dark:hover:text-white hover:bg-[hsl(230_10%_94%)]/70 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>

          <button
            onClick={onSignOut}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-[hsl(230_12%_40%)] dark:text-[hsl(220_12%_72%)] hover:text-[hsl(230_16%_20%)] dark:hover:text-white hover:bg-[hsl(230_10%_94%)]/70 dark:hover:bg-white/5 rounded-lg transition-colors"
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

export default function Header() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const user = useQuery(api.myFunctions.getUser);
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserMenu && !(event.target as Element).closest(".user-menu-container")) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-50 border-b border-transparent transition-all",
        "supports-[backdrop-filter]:backdrop-blur-xl",
        scrolled
          ? "bg-white/80 dark:bg-[hsl(220_28%_10%)]/80 border-[hsl(230_16%_90%)]/70 dark:border-white/10 shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(233_85%_60%)]/60 rounded-md"
            >
              <div className="relative">
                <span className="absolute inset-0 blur-xl bg-[linear-gradient(135deg,hsl(233_85%_60%),hsl(43_74%_52%))] opacity-40 rounded-full" />
                <div className="relative w-8 h-8 rounded-lg bg-[linear-gradient(135deg,hsl(233_85%_60%),hsl(43_74%_52%))]" />
              </div>
              <h1 className="text-xl sm:text-2xl font-heading font-bold bg-clip-text text-transparent bg-[linear-gradient(135deg,hsl(233_85%_60%),hsl(43_74%_52%))]">
                Civicly
              </h1>
            </Link>

            <nav className="hidden md:flex items-center space-x-6">
              <NavLink href="/coming-soon" label="About" />
              <NavLink href="/coming-soon" label="Politicians" />
              <NavLink href="/coming-soon" label="All Bills" />
            </nav>
          </div>

          <div className="flex items-center space-x-2">
            {isAuthenticated ? (
              <div className="relative user-menu-container">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[hsl(230_10%_94%)]/70 dark:hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(233_85%_60%)]/60"
                >
                  <span className="hidden sm:block text-sm font-medium text-[hsl(230_16%_20%)] dark:text-white">
                    {user?.name || "User"}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[linear-gradient(135deg,hsl(233_85%_60%),hsl(43_74%_52%))] flex items-center justify-center text-white font-semibold">
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
              <>
                <button onClick={() => router.push("/auth?flow=signIn")} className="btn-secondary">
                  Sign In
                </button>
                <button onClick={() => router.push("/auth?flow=signUp")} className="btn-primary">
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 