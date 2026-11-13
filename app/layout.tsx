import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carms · Your coding workspace",
  description: "A focused AI workspace for thinking through and building software.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}