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
    apple: "/icon-192.png",
    icon: "/icon-192.png",
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
  interactiveWidget: "overlays-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fbff" },
    { media: "(prefers-color-scheme: dark)", color: "#050507" },
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
      className={`theme-dark ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" sizes="192x192" />
        <link rel="icon" type="image/png" href="/icon-192.png" sizes="192x192" />
        <link rel="icon" type="image/png" href="/icon-512.png" sizes="512x512" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var el=document.documentElement;var t=localStorage.getItem('family-fin-theme');var light=false;if(t==='light'){light=true}else if(t!=='dark'){light=window.matchMedia('(prefers-color-scheme:light)').matches}el.classList.remove('theme-dark','theme-light');el.classList.add(light?'theme-light':'theme-dark');el.style.colorScheme=light?'light':'dark';var st=document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');if(st)st.setAttribute('content',light?'default':'black-translucent');var tc=document.querySelector('meta[name="theme-color"][data-app-theme]')||function(){var m=document.createElement('meta');m.setAttribute('name','theme-color');m.setAttribute('data-app-theme','true');document.head.appendChild(m);return m}();tc.setAttribute('content',light?'#f8fbff':'#050507');if(window.matchMedia('(display-mode:standalone)').matches||window.navigator.standalone===true){el.classList.add('pwa-standalone');el.style.setProperty('--app-height','100vh')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased bg-[var(--bg)] text-[var(--text)]`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
