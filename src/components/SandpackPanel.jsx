'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  SandpackProvider, 
  SandpackCodeEditor, 
  SandpackPreview,
  useSandpack,
  getSandpackCssText
} from '@codesandbox/sandpack-react';
// Module has no explicit type declarations
import { SandpackFileExplorer } from 'sandpack-file-explorer';
import { useServerInsertedHTML } from "next/navigation";
import ChatPanel from './ChatPanel';

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
 * Ensures CSS-in-JS styles for Sandpack are loaded server side.
 */
export const SandpackStylesHandler = () => {
  useServerInsertedHTML(() => {
    return (
      <style
        dangerouslySetInnerHTML={{ __html: getSandpackCssText() }}
        id="sandpack"
      />
    );
  });
  return null;
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

// Command handling component
const CommandPanel = () => {
  const { sandpack } = useSandpack();
  const { files, activeFile, updateFile } = sandpack;
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [planningStep, setPlanningStep] = useState(false);
  const [plan, setPlan] = useState(null);
  const [apiStatus, setApiStatus] = useState({ 
    usingOpenAI: false, 
    model: null, 
    message: 'Checking API status...' 
  });

  // Helper to add a log message
  const addLog = (log) => {
    setLogs(prev => [...prev, log]);
  };

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

  // Handler for generating a plan
  const handleGeneratePlan = async (commandText) => {
    if (!commandText) {
      addLog({ type: 'error', message: 'Please enter a command.' });
      return;
    }
    
    // Set loading and planning states
    setIsLoading(true);
    setPlanningStep(true);
    setPlan(null);
    addLog({ type: 'info', message: 'Analyzing codebase to create a plan...' });
    
    try {
      // Prepare all files to send to the API
      const allFiles = {};
      
      // Get all files content from Sandpack
      Object.entries(files).forEach(([filePath, fileData]) => {
        // Only include code files that aren't generated
        if (typeof fileData.code === 'string' && !filePath.includes('/node_modules/')) {
          allFiles[filePath] = fileData.code;
        }
      });
      
      // Call the API to generate a plan
      const response = await fetch('/api/llm-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: commandText,
          files: allFiles,
          activeFile
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate a plan');
      }
      
      if (data.plan) {
        // Store the plan with the original command attached
        const planWithCommand = {
          ...data.plan,
          originalCommand: commandText
        };
        setPlan(planWithCommand);
        addLog({ 
          type: 'success', 
          message: `Plan generated: ${planWithCommand.description}` 
        });
      } else {
        addLog({ type: 'error', message: data.message || 'Failed to generate a plan' });
      }
    } catch (error) {
      console.error('Error generating plan:', error);
      addLog({ type: 'error', message: `Error: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  // Execute the plan
  const handleExecutePlan = async (commandText) => {
    if (!plan || isLoading) return;
    
    // Turn off planning mode and enter execution mode
    setPlanningStep(false);
    setIsLoading(true);
    addLog({ type: 'info', message: 'Executing plan...' });
    
    try {
      if (!commandText) {
        addLog({ type: 'error', message: 'Command text is missing.' });
        return;
      }
      
      // Prepare all files to send to the API
      const allFiles = {};
      
      // Get all files content from Sandpack
      Object.entries(files).forEach(([filePath, fileData]) => {
        // Only include code files that aren't generated
        if (typeof fileData.code === 'string' && !filePath.includes('/node_modules/')) {
          allFiles[filePath] = fileData.code;
        }
      });
      
      // Process each file in sequence
      for (const filePath of plan.filesToModify) {
        // Check if the file already exists or needs to be created
        const fileExists = files[filePath] !== undefined;
        
        if (!fileExists) {
          addLog({ type: 'info', message: `Creating new file: ${filePath}` });
          
          // For new files, generate content from scratch
          const response = await fetch('/api/llm-command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              command: `${commandText} - Create new file ${filePath}`,
              currentCode: '', // Start with empty content
              filePath: filePath,
              allFiles: allFiles,
              isNewFile: true // Indicate this is a new file
            })
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            addLog({ type: 'error', message: `Error creating ${filePath}: ${data.error || 'Unknown error'}` });
            continue;
          }
          
          if (data.newCode) {
            // Create the new file in Sandpack
            updateFile(filePath, data.newCode);
            addLog({ type: 'success', message: `Created new file ${filePath}: ${data.message}` });
            
            // Add the new file to our context for subsequent file modifications
            allFiles[filePath] = data.newCode;
          } else {
            addLog({ type: 'warning', message: `Failed to create new file ${filePath}: ${data.message}` });
          }
        } else {
          addLog({ type: 'info', message: `Modifying: ${filePath}` });
          
          // Call API to process command for this existing file
          const response = await fetch('/api/llm-command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              command: commandText,
              currentCode: files[filePath].code,
              filePath: filePath,
              allFiles: allFiles,
              isNewFile: false
            })
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            addLog({ type: 'error', message: `Error updating ${filePath}: ${data.error || 'Unknown error'}` });
            continue;
          }
          
          if (data.newCode) {
            // Update the file in Sandpack
            updateFile(filePath, data.newCode);
            addLog({ type: 'success', message: `Updated ${filePath}: ${data.message}` });
            
            // Update our context with the new content
            allFiles[filePath] = data.newCode;
          } else {
            addLog({ type: 'warning', message: `No changes made to ${filePath}: ${data.message}` });
          }
        }
      }
      
      addLog({ type: 'success', message: 'Plan execution completed.' });
    } catch (error) {
      console.error('Error executing plan:', error);
      addLog({ type: 'error', message: `Execution error: ${error.message}` });
    } finally {
      setIsLoading(false);
      setPlan(null);
    }
  };

  // Cancel the current plan
  const handleCancelPlan = () => {
    setPlanningStep(false);
    setPlan(null);
    addLog({ type: 'info', message: 'Plan cancelled.' });
  };

  // Execute the command
  const handleExecuteCommand = async (commandText) => {
    // Begin with planning phase
    await handleGeneratePlan(commandText);
  };

  // Conditionally render either plan execution UI or chat panel
  if (planningStep && plan) {
    return (
      <div className="flex flex-col h-full">
        {/* API Status Display */}
        <div className="px-4 py-2 bg-gray-100 border-b text-sm flex justify-between items-center">
          <div>
            {apiStatus.usingOpenAI ? (
              <span className="text-green-600 font-medium">
                Using OpenAI API ({apiStatus.model})
              </span>
            ) : (
              <span className="text-orange-500 font-medium">
                Using Mock API (limited functionality)
              </span>
            )}
          </div>
          <div className="text-gray-600">
            {apiStatus.message}
          </div>
        </div>
        
        {/* Plan Execution UI */}
        <div className="flex-grow overflow-auto p-4 bg-gray-50">
          <div className="bg-white p-4 rounded border">
            <h4 className="text-lg font-semibold mb-2">Execution Plan</h4>
            <p className="mb-3">{plan.description}</p>
            
            <div className="my-3">
              <h5 className="text-sm font-medium">Files to be modified:</h5>
              <ul className="list-disc pl-5 mt-1">
                {plan.filesToModify.map(file => {
                  const isNewFile = plan.fileExplanations && 
                    plan.fileExplanations[file] && 
                    plan.fileExplanations[file].startsWith('NEW:');
                    
                  return (
                    <li key={file} className="text-sm mb-2">
                      <div className="flex items-center">
                        <strong>{file}</strong>
                        {isNewFile && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                            New File
                          </span>
                        )}
                      </div>
                      {plan.fileExplanations && plan.fileExplanations[file] && (
                        <p className="text-xs text-gray-600 mt-1">
                          {isNewFile 
                            ? plan.fileExplanations[file].replace('NEW:', '') 
                            : plan.fileExplanations[file]
                          }
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
                      
            <div className="flex mt-4 space-x-3">
              <button 
                onClick={() => handleExecutePlan(plan.originalCommand)}
                disabled={isLoading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Execute Plan'}
              </button>
                    
              <button 
                onClick={handleCancelPlan}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Display the ChatPanel component in normal mode
  return (
    <div className="flex flex-col h-full">
      {/* API Status Display */}
      <div className="px-4 py-2 bg-gray-100 border-b text-sm flex justify-between items-center">
        <div>
          {apiStatus.usingOpenAI ? (
            <span className="text-green-600 font-medium">
              Using OpenAI API ({apiStatus.model})
            </span>
          ) : (
            <span className="text-orange-500 font-medium">
              Using Mock API (limited functionality)
            </span>
          )}
        </div>
        <div className="text-gray-600">
          {apiStatus.message}
        </div>
      </div>
        
      {/* Use the new ChatPanel component */}
      <ChatPanel 
        logs={logs}
        isLoading={isLoading}
        onSubmitCommand={handleExecuteCommand}
      />
    </div>
  );
};

/**
 * SandpackPanel - Consolidated component that combines:
 * 1. SandpackClient - Client-side CSS handling
 * 2. SandpackStyles - Server-side CSS handling
 * 3. SandpackEditor - Main editor functionality
 */
const SandpackPanel = () => {
  // Include both CSS handlers
  SandpackStylesHandler();
  
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
    <div className="flex flex-col space-y-6">
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
            <div style={{ height: '180px', borderTop: '1px solid rgb(55, 55, 55)' }}>
              <CommandPanel />
            </div>
          </div>
        </SandpackProvider>
      </div>
    </div>
  );
};

export default SandpackPanel; 