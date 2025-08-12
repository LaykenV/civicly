import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ThemeProvider } from "next-themes";

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
  // Ensure browser UI (status/address bar) matches theme on mobile
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "hsl(225, 40%, 95%)" },
    { media: "(prefers-color-scheme: dark)", color: "hsl(220, 30%, 12%)" },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        </head>
        <body className="font-body antialiased min-h-screen">
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
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
