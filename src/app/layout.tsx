import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  preload: true,
});

export const metadata: Metadata = {
  title: "ReGlow — ניהול סלון לקוסמטיקאיות",
  description: "פלטפורמה לניהול לקוחות, תורים והחזרת לקוחות אבודות לסלונים.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className={`${heebo.variable} font-sans antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
