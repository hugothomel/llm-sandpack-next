import { Inter } from "next/font/google";
import "./globals.css";
import { SandpackStylesHandler } from "@/components/SandpackPanel";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "LLM-Integrated Sandpack",
  description: "A code sandbox with integrated LLM commands for modifying code",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <SandpackStylesHandler />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
} 