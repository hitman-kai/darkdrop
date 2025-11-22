import type { Metadata, Viewport } from "next";
import { Fira_Code } from "next/font/google";
import "./globals.css";

import { MatrixBackground } from "@/components/MatrixBackground";
import { SolanaProviders } from "@/components/providers/SolanaProviders";
import { SettingsDock } from "@/components/SettingsDock";

const fira = Fira_Code({
  variable: "--font-fira",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DarkDrop",
  description: "Anonymous Solana dead drops with zero trail.",
  icons: { icon: "/icons/icon-192.png" },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fira.variable} antialiased`}>
        <SolanaProviders>
          <div className="relative min-h-screen bg-[color:var(--background)] text-[color:var(--text)]">
            <SettingsDock />
            <MatrixBackground />
            <main className="relative z-10 min-h-screen">{children}</main>
          </div>
        </SolanaProviders>
      </body>
    </html>
  );
}
