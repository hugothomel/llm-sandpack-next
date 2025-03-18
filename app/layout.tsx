import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SandpackStyles from "../src/components/SandpackStyles";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LLM-Integrated Sandpack",
  description: "A code sandbox with integrated LLM commands for modifying code",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <SandpackStyles />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
} 