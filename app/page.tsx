'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Use dynamic import with no SSR for Sandpack components
const SandpackEditor = dynamic(
  () => import('@/components/SandpackEditor'),
  { ssr: false }
);

// Loading fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-96 w-full">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
      <p className="mt-4 text-lg">Loading Sandpack Editor...</p>
    </div>
  </div>
);

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-6 sm:p-12">
      <div className="w-full max-w-6xl space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">LLM-Integrated Sandpack</h1>
          <p className="text-xl text-gray-600">
            Enter commands in plain language to modify the code in the sandbox.
          </p>
        </div>
        
        <Suspense fallback={<LoadingFallback />}>
          <SandpackEditor />
        </Suspense>
        
        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>Built with Next.js and Sandpack</p>
        </footer>
      </div>
    </main>
  );
} 