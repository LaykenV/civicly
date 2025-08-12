"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export default function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const update = () => {
      // Compute the background color currently in effect (after theme class applies)
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

      if (!meta) return;

      // Pick a stable final color for the status bar based on theme
      // Use solid colors to avoid parsing issues across browsers
      const final = resolvedTheme === "dark" ? "#0f141e" : "#ffffff";

      // Force Safari status bar repaint by setting a slightly different color first,
      // then the real color on the next frame (prevents needing hex alpha hacks on dynamic values)
      const nudge = resolvedTheme === "dark" ? "#0f141f" : "#fffffe";
      meta.setAttribute("content", nudge);
      requestAnimationFrame(() => {
        meta!.setAttribute("content", final);
      });
    };

    // Run twice: immediately and on next frame to ensure html.class has applied
    update();
    requestAnimationFrame(update);
  }, [resolvedTheme]);

  return null;
} 