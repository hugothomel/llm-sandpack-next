'use client';

import React, { useState, useEffect } from 'react';
import { 
  SandpackProvider, 
  SandpackLayout, 
  SandpackCodeEditor, 
  SandpackPreview,
  useSandpack
} from '@codesandbox/sandpack-react';
import LogDisplay from './LogDisplay';
import LLMCommandInput from './LLMCommandInput';

interface Log {
  type: 'info' | 'warning' | 'error';
  message: string;
}

interface ApiStatus {
  usingOpenAI: boolean;
  model: string | null;
  message: string;
}

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

// Command handling component
const CommandPanel = () => {
  const { sandpack } = useSandpack();
  const { files, activeFile, updateFile } = sandpack;
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ 
    usingOpenAI: false, 
    model: null, 
    message: 'Checking API status...' 
  });

  // Fetch API status on component mount
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        setApiStatus({
          usingOpenAI: data.usingOpenAI,
          model: data.model,
          message: data.message
        });
      } catch (error) {
        console.error('Error checking API status:', error);
        setApiStatus({
          usingOpenAI: false,
          model: null,
          message: 'Error connecting to API server'
        });
      }
    };

    checkApiStatus();
  }, []);

  const handleLLMCommand = async (command: string) => {
    setIsLoading(true);
    setLogs(prev => [...prev, { type: 'info', message: `Command: ${command}` }]);

    try {
      // Get the current code from the active file
      const currentCode = files[activeFile].code;
      
      // Send to backend API
      const response = await fetch('/api/llm-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          currentCode,
          filePath: activeFile
        }),
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      const { newCode, message } = data;
      
      // Update the file with the new code
      if (newCode) {
        updateFile(activeFile, newCode);
        setLogs(prev => [...prev, { type: 'info', message: `Code updated: ${message || 'Done'}` }]);
      } else {
        setLogs(prev => [...prev, { type: 'warning', message: message || 'No changes made' }]);
      }
    } catch (error: any) {
      console.error('Error processing LLM command:', error);
      setLogs(prev => [...prev, { 
        type: 'error', 
        message: `Error: ${error.message}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const apiStatusBadge = (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
      apiStatus.usingOpenAI ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
    }`}>
      {apiStatus.usingOpenAI ? `🟢 Using OpenAI (${apiStatus.model})` : '🟠 Using Mock LLM'} 
    </div>
  );

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium">LLM Command</h3>
        {apiStatusBadge}
      </div>
      <LLMCommandInput onSubmit={handleLLMCommand} isLoading={isLoading} />
      <h3 className="text-lg font-medium mt-6 mb-2">Logs</h3>
      <LogDisplay logs={logs} />
    </div>
  );
};

// Main component - following the structure from the documentation
const SandpackEditor = () => {
  // Browser-side rendering check
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="h-[600px] w-full border rounded-lg bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
        <p className="mt-4 text-lg">Loading Sandpack Editor...</p>
      </div>
    </div>;
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="h-[600px] w-full">
        <SandpackProvider
          template="vanilla"
          theme="light"
          files={initialFiles}
          options={{
            bundlerURL: "https://sandpack-bundler.codesandbox.io",
            externalResources: ["https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css"]
          }}
        >
          <SandpackLayout>
            <SandpackCodeEditor 
              showLineNumbers={true} 
              showInlineErrors={true}
              wrapContent
              style={{ height: '100%', minWidth: '40%', maxWidth: '50%' }}
            />
            <SandpackPreview 
              showNavigator={true}
              showRefreshButton={true}
              style={{ height: '100%', minWidth: '50%', flexGrow: 1 }}
            />
          </SandpackLayout>
          <CommandPanel />
        </SandpackProvider>
      </div>
    </div>
  );
};

export default SandpackEditor; 