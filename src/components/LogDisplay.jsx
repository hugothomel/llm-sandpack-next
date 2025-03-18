'use client';

import React, { useEffect, useRef } from 'react';

const LogDisplay = ({ logs }) => {
  const logEndRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to bottom of logs
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="logs bg-gray-100 rounded p-4 h-64 overflow-y-auto">
      {logs.map((log, index) => (
        <div 
          key={index} 
          className={`log-item mb-2 p-2 rounded ${
            log.type === 'error' 
              ? 'bg-red-100 text-red-800' 
              : log.type === 'warning' 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-blue-100 text-blue-800'
          }`}
        >
          [{log.type}]: {log.message}
        </div>
      ))}
      <div ref={logEndRef} />
    </div>
  );
};

export default LogDisplay; 