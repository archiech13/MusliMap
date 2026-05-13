import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Anton } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Musli Map — Live Music Near You",
  description: "Discover live music gigs on an interactive map. Follow bands and get notified when they play near you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${anton.variable} h-full`}>
      <body className="h-full flex flex-col antialiased bg-black text-white">
        <Navbar />
        {/* flex-1 + min-h-0 lets children control their own scroll/height */}
        <div className="flex-1 min-h-0 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
