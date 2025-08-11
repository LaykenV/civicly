import type { Metadata } from "next";
import type { Viewport } from "next";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ThemeProvider } from "next-themes";
import ThemeColorMeta from "@/components/ThemeColorMeta";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Civicly - Making Complex Legislation Accessible",
  description:
    "Civicly makes complex legislative information accessible, credible, and empowering for the average citizen. AI-powered bill analysis, semantic search, and real-time legislative tracking.",
  keywords: [
    "legislation",
    "bills",
    "congress",
    "politics",
    "civic engagement",
    "government",
    "AI analysis",
    "legislative tracking",
  ],
  authors: [{ name: "Civicly Team" }],
  creator: "Civicly",
  publisher: "Civicly",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/convex.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Civicly - Making Complex Legislation Accessible",
    description: "AI-powered legislative analysis and tracking platform for civic engagement",
    url: "https://civicly.com",
    siteName: "Civicly",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Civicly - Making Complex Legislation Accessible",
    description: "AI-powered legislative analysis and tracking platform for civic engagement",
    creator: "@civicly",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Ensure browser UI (address bar/status bar) matches our background on mobile
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "hsl(225, 40%, 95%)" },
    { media: "(prefers-color-scheme: dark)", color: "hsl(220, 30%, 12%)" },
  ],
  // Let iOS overlay the status bar so background shows behind the notch (PWA)
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" className="scroll-smooth" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          {/* Default to dark to avoid white status bar flash on iOS; script below corrects it */}
          <meta name="theme-color" content="hsl(220, 30%, 12%)" />
          {/* Set initial theme-color ASAP for iOS Safari before hydration */}
          <script
            dangerouslySetInnerHTML={{
              __html: `(() => {
  try {
    var stored = localStorage.getItem('theme');
    var isDark = stored ? stored === 'dark' : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var color = isDark ? 'hsl(220, 30%, 12%)' : 'hsl(225, 40%, 95%)';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', color);
  } catch (e) {}
})();`,
            }}
          />
        </head>
        <body className="font-body antialiased min-h-screen">
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <ThemeColorMeta />
            <ConvexClientProvider>
              <div id="root" className="relative">
                {children}
              </div>
            </ConvexClientProvider>
          </ThemeProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
