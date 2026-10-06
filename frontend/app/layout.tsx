import type { Metadata, Viewport } from "next";
import { Open_Sans, Cascadia_Mono } from "next/font/google";
import RevealHighlight from "@/components/ui/RevealHighlight";
import "./globals.css";

// Segoe UI Variable is the WinUI typeface and is used wherever the OS ships it.
// Open Sans (same designer, near-identical metrics) stands in everywhere else.
const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

const cascadia = Cascadia_Mono({
  variable: "--font-cascadia",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "ChainIns — Blockchain-Enhanced Insurance Claim Verification",
  description: "Claims you can verify, not just trust.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f3f3" },
    { media: "(prefers-color-scheme: dark)", color: "#202020" },
  ],
};

// Resolves the saved preference (light / dark / system) before first paint and
// keeps following the OS while the preference is "system".
const THEME_SCRIPT = `(function(){try{var d=document.documentElement,m=window.matchMedia("(prefers-color-scheme: dark)");function a(){var p=localStorage.getItem("theme")||"system";d.setAttribute("data-theme",p==="system"?(m.matches?"dark":"light"):p);d.setAttribute("data-theme-pref",p)}a();m.addEventListener("change",a);window.addEventListener("storage",function(e){if(e.key==="theme")a()})}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${openSans.variable} ${cascadia.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <div className="splash" role="status" aria-label="Loading">
          <div className="splash-ring">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <span key={n}>
                <span />
              </span>
            ))}
          </div>
        </div>
        {children}
        <RevealHighlight />
      </body>
    </html>
  );
}
