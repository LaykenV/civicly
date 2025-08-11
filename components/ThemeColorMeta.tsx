"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

export default function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    const bg = getComputedStyle(root).getPropertyValue("--color-background").trim();
    const color = bg || (resolvedTheme === "dark" ? "#0b1220" : "#eef2f9");

    const ensureMeta = (name: string, content: string) => {
      let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    // Update theme-color so Safari/Chrome mobile toolbars match our background
    ensureMeta("theme-color", color);
  }, [resolvedTheme]);

  return null;
} 