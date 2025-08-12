"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export default function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // Compute the background color currently in effect
    const computedBg = getComputedStyle(document.body).backgroundColor;

    // Ensure body backgroundColor is explicitly set so WebKit nav bar picks it up
    if (computedBg) {
      document.body.style.backgroundColor = computedBg;
    }

    // Find or create the meta[name="theme-color"] tag
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }

    // Update status bar color to match current background
    if (meta) {
      meta.setAttribute("content", computedBg || (resolvedTheme === "dark" ? "#000000" : "#ffffff"));
    }
  }, [resolvedTheme]);

  return null;
} 