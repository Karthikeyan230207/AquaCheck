import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "AquaCheck | Water Quality Report Analysis & Screening",
  description:
    "Upload water quality lab reports to screen pH, TDS, turbidity, nitrate, iron, hardness, and contaminants with interactive 3D visualizations and standards-grounded analysis.",
  keywords: [
    "water quality",
    "drinking water safety",
    "water test analysis",
    "pH",
    "TDS",
    "turbidity",
    "water report scanner",
  ],
  authors: [{ name: "AquaCheck Team" }],
  openGraph: {
    title: "AquaCheck | Water Quality Report Analysis",
    description:
      "Screen and visualize water laboratory test reports in seconds against national and international drinking water guidelines.",
    siteName: "AquaCheck",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#256d58",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
