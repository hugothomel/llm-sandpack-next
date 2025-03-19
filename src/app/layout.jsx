import { Inter } from "next/font/google";
import "./globals.css";
import SandpackStyles from "@/components/SandpackStyles";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "LLM-Integrated Sandpack",
  description: "A code sandbox with integrated LLM commands for modifying code",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <SandpackStyles />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
} 