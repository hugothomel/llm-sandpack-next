'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SandpackClient from '../src/components/SandpackClient';

// Use dynamic import with no SSR for Sandpack
const SandpackEditor = dynamic(
  () => import('../src/components/SandpackEditor'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[600px] w-full border rounded-lg bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="mt-4 text-lg">Loading Sandpack Editor...</p>
        </div>
      </div>
    )
  }
);

export default function Home() {
  // State to handle browser-side rendering
  const [isMounted, setIsMounted] = useState(false);

  // Ensure we're rendering in the browser
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-6 md:p-8">
      {/* Client-side Sandpack CSS injection */}
      <SandpackClient />
      
      <div className="w-full max-w-7xl space-y-6">
        <div className="text-center mb-4 md:mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">LLM-Integrated Sandpack</h1>
          <p className="text-lg md:text-xl text-gray-600">
            Enter commands in plain language to modify the code in the sandbox.
          </p>
        </div>
        
        {isMounted && <SandpackEditor />}
        
        <footer className="mt-6 text-center text-gray-500 text-sm">
          <p>Built with Next.js and Sandpack</p>
        </footer>
      </div>
    </main>
  );
} 