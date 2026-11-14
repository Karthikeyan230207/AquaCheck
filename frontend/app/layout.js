import { AuthProvider } from "../hooks/useAuth";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
  themeColor: "#07131d",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AuthProvider>
          <div className="appContentWrapper">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
