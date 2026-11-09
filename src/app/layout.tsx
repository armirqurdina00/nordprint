import { Unbounded, Instrument_Sans, Montserrat } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import ServiceWorker from "@/components/site/ServiceWorker";
import "./globals.css";

const unbounded = Unbounded({ subsets: ["latin"], variable: "--font-unbounded", weight: ["400", "500", "600", "700"] });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", weight: ["500"] });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "NordPrint" },
};

export const viewport: Viewport = { themeColor: "#1e2b30" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = (await headers()).get("x-lang") === "en" ? "en" : "sv";
  return (
    <html lang={lang} className={`${unbounded.variable} ${instrument.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <head>
        {/* lets CSS hide scroll-reveal content only when JS can reveal it again */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
