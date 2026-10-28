import type { Metadata, Viewport } from "next";
import { Inter, Saira } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const display = Saira({ variable: "--font-display-face", subsets: ["latin"], weight: ["600", "700", "800", "900"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Game Receipts — Call it. Lock it. Prove it.", template: "%s · Game Receipts" },
  description: "Everyone talks sports. Game Receipts remembers who was right. Lock timestamped sports predictions, get graded, build a permanent reputation.",
  applicationName: "Game Receipts",
  appleWebApp: { capable: true, title: "Game Receipts", statusBarStyle: "black" },
};

export const viewport: Viewport = { themeColor: "#050607", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full bg-stadium font-sans">{children}</body>
    </html>
  );
}
