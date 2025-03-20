import React, { useState, useEffect, useRef } from 'react';

/**
 * ChatPanel - Component that handles:
 * 1. Command input and submission
 * 2. Log display
 * 3. Plan generation and execution
 */
const ChatPanel = ({ sandpackMethods }) => {
  // State for command handling
  const [command, setCommand] = useState('');
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [planningStep, setPlanningStep] = useState(false);
  const [plan, setPlan] = useState(null);
  const [apiStatus, setApiStatus] = useState({ 
    usingOpenAI: false, 
    model: null, 
    message: 'Checking API status...' 
  });
  
  // Auto-scroll reference (from LogDisplay)
  const logEndRef = useRef(null);
  
  // Ref to track if we've shown the initialization message
  const hasShownInitMessage = useRef(false);

  // Helper to add a log message
  const addLog = (log) => {
    setLogs(prev => [...prev, log]);
  };

  // Auto-scroll to bottom of logs when they change
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Display a welcome message when the component mounts
  useEffect(() => {
    addLog({ 
      type: 'info', 
      message: 'Welcome! Enter a command to modify the code in the sandbox above.'
    });
    
    // Also inform about Sandpack availability
    if (!sandpackMethods) {
      addLog({ 
        type: 'warning', 
        message: 'Waiting for Sandpack editor to initialize...'
      });
    }
  }, []);

  // Update log when Sandpack methods become available
  useEffect(() => {
    if (sandpackMethods && !hasShownInitMessage.current) {
      addLog({ 
        type: 'success', 
        message: 'Sandpack editor initialized. Ready to accept commands!'
      });
      hasShownInitMessage.current = true;
    }
  }, [sandpackMethods]);

  // Fetch API status on component mount
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch('/api/ai?operation=status');
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
    
    // Check if Sandpack is available
    if (!sandpackMethods) {
      addLog({ 
        type: 'error', 
        message: 'Sandpack editor is not ready yet. Please wait a moment and try again.'
      });
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
      const files = sandpackMethods.getFiles();
      const activeFile = sandpackMethods.getActiveFile();
      
      // Get all files content from Sandpack
      Object.entries(files).forEach(([filePath, fileData]) => {
        // Only include code files that aren't generated
        if (typeof fileData.code === 'string' && !filePath.includes('/node_modules/')) {
          allFiles[filePath] = fileData.code;
        }
      });
      
      // Call the API to generate a plan
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'plan',
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
      setPlanningStep(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute the plan
  const handleExecutePlan = async (commandText) => {
    if (!plan || isLoading) return;
    
    // Check if Sandpack is available
    if (!sandpackMethods) {
      addLog({ 
        type: 'error', 
        message: 'Sandpack editor is not ready yet. Please wait a moment and try again.'
      });
      return;
    }
    
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
      const files = sandpackMethods.getFiles();
      
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
          const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: 'command',
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
            sandpackMethods.updateFile(filePath, data.newCode);
            addLog({ type: 'success', message: `Created new file ${filePath}: ${data.message}` });
            
            // Add the new file to our context for subsequent file modifications
            allFiles[filePath] = data.newCode;
          } else {
            addLog({ type: 'warning', message: `Failed to create new file ${filePath}: ${data.message}` });
          }
        } else {
          addLog({ type: 'info', message: `Modifying: ${filePath}` });
          
          // Call API to process command for this existing file
          const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: 'command',
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
            sandpackMethods.updateFile(filePath, data.newCode);
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

  // Handle command submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!command.trim()) return;
    
    handleExecuteCommand(command);
    setCommand('');
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
                disabled={isLoading || !sandpackMethods}
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

  // Standard chat panel UI
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
      
      {/* Sandpack Status Indicator */}
      {!sandpackMethods && (
        <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-100 text-yellow-800 text-sm flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Waiting for Sandpack editor to initialize...
        </div>
      )}
      
      {/* Log Display Section */}
      <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
        <div className="space-y-2">
          {logs.map((log, index) => (
            <div 
              key={index} 
              className={`p-2 rounded ${
                log.type === 'error' 
                  ? 'bg-red-100 text-red-800' 
                  : log.type === 'warning' 
                    ? 'bg-yellow-100 text-yellow-800'
                    : log.type === 'success'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
              }`}
            >
              {log.message}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
      
      {/* Command Input Section */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Enter an LLM command..."
            disabled={isLoading || !sandpackMethods}
            className="flex-grow px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading || !sandpackMethods}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Working...' : 'Execute'}
          </button>
        </form>
        {!sandpackMethods && (
          <div className="mt-2 text-xs text-yellow-600">
            Please wait for the Sandpack editor to finish loading before submitting commands.
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPanel; 