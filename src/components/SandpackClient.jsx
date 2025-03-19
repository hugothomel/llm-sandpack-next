'use client';

import { useEffect } from 'react';
import { getSandpackCssText } from "@codesandbox/sandpack-react";

/**
 * Client-side only component to inject Sandpack CSS
 */
export default function SandpackClient() {
  useEffect(() => {
    // Only run in browser context
    if (typeof window !== 'undefined') {
      try {
        // Get the CSS text from Sandpack
        const sandpackCss = getSandpackCssText();
        
        // Create or update the style element
        let styleElement = document.getElementById('sandpack-css');
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = 'sandpack-css';
          document.head.appendChild(styleElement);
        }
        styleElement.textContent = sandpackCss;
      } catch (error) {
        console.error('Error setting up Sandpack CSS:', error);
      }
    }
  }, []);

  return null;
} 