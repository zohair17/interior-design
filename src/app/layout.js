import { Archivo, Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
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
      className={`${archivo.variable} ${inter.variable} ${instrument.variable} antialiased`}
    >
      <body>
        {children}
      </body>
    </html>
  );
}
