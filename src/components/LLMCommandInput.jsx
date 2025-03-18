'use client';

import React, { useState } from 'react';

const LLMCommandInput = ({ onSubmit, isLoading }) => {
  const [command, setCommand] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!command.trim()) return;
    
    onSubmit(command);
    setCommand('');
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <textarea
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        placeholder="Enter an LLM command (e.g., 'Fix the syntax error in index.js' or 'Create a function that reverses a string')"
        disabled={isLoading}
        className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32 resize-none"
      />
      <button 
        type="submit" 
        disabled={isLoading} 
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Processing...' : 'Run AI Command'}
      </button>
    </form>
  );
};

export default LLMCommandInput; 