import { Archivo, Inter_Tight, Newsreader } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

// Inter Tight over Inter: at the sizes this site sets labels and running copy,
// the tighter fit reads as drawn for the layout rather than defaulted into it.
const inter = Inter_Tight({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// The headline face. Newsreader is cut for text, so it holds its shape at the
// small sizes too — and its light weights carry the large ones without the
// display-serif fragility that made the old headlines look thin over footage.
const serif = Newsreader({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata = {
  title: `${site.name} — ${site.tagline}`,
  description: site.mission,
  openGraph: {
    title: `${site.name} — ${site.tagline}`,
    description: site.mission,
    locale: "en_CH",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#0b0b0c",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${inter.variable} ${serif.variable} antialiased`}
    >
      <body>
        {children}
      </body>
    </html>
  );
}
