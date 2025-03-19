'use client';

import React, { useState, useEffect, useRef } from 'react';

/**
 * ChatPanel - A combined component that includes:
 * 1. Command input functionality (from LLMCommandInput)
 * 2. Log display functionality (from LogDisplay)
 */
const ChatPanel = ({ onSubmitCommand, isLoading, logs }) => {
  // Command input state (from LLMCommandInput)
  const [command, setCommand] = useState('');
  
  // Auto-scroll reference (from LogDisplay)
  const logEndRef = useRef(null);

  // Auto-scroll to bottom of logs when they change
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Handle command submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!command.trim()) return;
    
    onSubmitCommand(command);
    setCommand('');
  };

  return (
    <div className="flex flex-col h-full">
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
            disabled={isLoading}
            className="flex-grow px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Working...' : 'Execute'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel; 