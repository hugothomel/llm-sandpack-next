import { Inter } from "next/font/google";
import Head from "next/head";
import { useEffect } from "react";
import { getSandpackCssText } from "@codesandbox/sandpack-react";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

function MyApp({ Component, pageProps }) {
  // Add Sandpack CSS on the client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const styleEl = document.createElement("style");
      styleEl.innerHTML = getSandpackCssText();
      styleEl.setAttribute("id", "sandpack-css");
      document.head.appendChild(styleEl);
    }
  }, []);

  return (
    <>
      <Head>
        <title>LLM-Integrated Sandpack</title>
        <meta name="description" content="A code sandbox with integrated LLM commands for modifying code" />
      </Head>
      <main className={inter.className}>
        <Component {...pageProps} />
      </main>
    </>
  );
}

export default MyApp; 