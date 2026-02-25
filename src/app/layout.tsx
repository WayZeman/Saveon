import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./Providers";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Saveon",
  description: "Сімейний фінансовий облік для двох",
  manifest: "/manifest.json",
  icons: {
    apple: "/icon-192-v2.png",
    icon: "/icon-192-v2.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Saveon",
  },
  formatDetection: { telephone: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#007aff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a84ff" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="uk"
      className={`scroll-smooth theme-dark ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="apple-touch-icon" href="/icon-192-v2.png" sizes="192x192" />
        <link rel="icon" type="image/png" href="/icon-192-v2.png" sizes="192x192" />
        <link rel="icon" type="image/png" href="/icon-512-v2.png" sizes="512x512" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('family-fin-theme');var el=document.documentElement;el.classList.remove('theme-dark','theme-light');if(t==='light'){el.classList.add('theme-light');el.style.colorScheme='light'}else if(t==='system'){var light=window.matchMedia('(prefers-color-scheme:light)').matches;el.classList.add(light?'theme-light':'theme-dark');el.style.colorScheme=light?'light':'dark'}else{el.classList.add('theme-dark');el.style.colorScheme='dark'}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased min-h-screen min-h-[100dvh] bg-[var(--bg)] text-[var(--text)]`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
