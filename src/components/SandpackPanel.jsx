import React, { useState, useEffect } from 'react';
import { 
  SandpackProvider, 
  SandpackCodeEditor, 
  SandpackPreview,
  useSandpack,
  getSandpackCssText
} from '@codesandbox/sandpack-react';
import { SandpackFileExplorer } from 'sandpack-file-explorer';

// Basic initial files
const initialFiles = {
  '/index.js': {
    code: `// This is a sample JavaScript file
// Try asking the LLM to modify this code

function greet(name) {
  console.log("Hello, " + name + "!");
  document.getElementById("app").innerHTML = \`<h1>Hello, \${name}!</h1>\`;
}

greet("Sandpack User");

// Try asking for a bug fix:
function brokenFunction() {
  let x = 5
  console.log("The value is: " + x)
  return x
}`
  },
  '/index.html': {
    code: `<!DOCTYPE html>
<html>
  <head>
    <title>Sandpack Example</title>
    <meta charset="UTF-8" />
  </head>
  <body>
    <div id="app"></div>
    <script src="index.js"></script>
  </body>
</html>`
  }
};

/**
 * Client-side CSS injection for Sandpack
 */
const SandpackClientCSS = () => {
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
};

/**
 * Sandpack wrapper that provides access to files
 */
const SandpackWrapper = ({ onSandpackReady }) => {
  const { sandpack } = useSandpack();
  
  // Expose sandpack functionality to parent components
  useEffect(() => {
    if (onSandpackReady) {
      console.log('SandpackWrapper: sandpack ready, providing methods');
      
      // Create a stable reference to the methods
      const methods = {
        getFiles: () => sandpack.files,
        getActiveFile: () => sandpack.activeFile,
        updateFile: (filePath, newCode) => sandpack.updateFile(filePath, newCode)
      };
      
      // Call the callback with the methods - only once
      onSandpackReady(methods);
    }
    
    // This effect should only run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: '240px', overflowY: 'auto', borderRight: '1px solid rgb(55, 55, 55)' }}>
          <SandpackFileExplorer />
        </div>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <SandpackCodeEditor 
            style={{ flex: 1, height: '100%', minWidth: 0 }}
            showLineNumbers={true}
            showInlineErrors={true} 
            wrapContent
          />
          <SandpackPreview 
            style={{ flex: 1, height: '100%', minWidth: 0 }}
            showNavigator={true}
            showRefreshButton={true}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * SandpackPanel - Provides a code editor with Sandpack
 */
const SandpackPanel = ({ onSandpackReady }) => {
  // Browser-side rendering check
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="h-[600px] w-full border border-gray-700 rounded-lg bg-[#1e1e1e] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-400 border-r-transparent"></div>
        <p className="mt-4 text-lg text-gray-300">Loading Sandpack Editor...</p>
      </div>
    </div>;
  }

  return (
    <div className="flex flex-col">
      {/* Include client-side CSS handler */}
      <SandpackClientCSS />
      
      <div className="h-[600px] w-full">
        <SandpackProvider
          template="vanilla"
          theme="dark"
          files={initialFiles}
          options={{
            bundlerURL: "https://sandpack-bundler.codesandbox.io",
            externalResources: ["https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css"]
          }}
        >
          <SandpackWrapper onSandpackReady={onSandpackReady} />
        </SandpackProvider>
      </div>
    </div>
  );
};

export default SandpackPanel; 