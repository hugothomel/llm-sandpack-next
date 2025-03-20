import { NextResponse } from 'next/server';
import { generatePlan, processCommand } from '@/utils/openaiService';
import * as mockService from '@/utils/mockService';

// Use Node.js runtime for OpenAI API
export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const operation = searchParams.get('operation');

  // Handle health check operation
  if (operation === 'health') {
    return NextResponse.json({ status: 'ok' });
  }
  
  // Handle status operation
  if (operation === 'status') {
    // Log for debugging
    console.log('Status API called, OpenAI API Key available:', !!process.env.OPENAI_API_KEY);
    console.log('Using model:', process.env.OPENAI_MODEL || 'gpt-3.5-turbo (default)');
    
    return NextResponse.json({ 
      status: 'ok',
      usingOpenAI: !!process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      message: process.env.OPENAI_API_KEY 
        ? `Using OpenAI API (${process.env.OPENAI_MODEL || 'gpt-3.5-turbo'})` 
        : 'Using mock LLM service (set OPENAI_API_KEY to use OpenAI)'
    });
  }

  // Return error for unknown GET operations
  return NextResponse.json(
    { error: "Unknown operation specified" },
    { status: 400 }
  );
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { operation } = body;
    
    if (!operation) {
      return NextResponse.json(
        { error: "Operation parameter is required" },
        { status: 400 }
      );
    }
    
    // Handle LLM plan operation
    if (operation === 'plan') {
      const { command, activeFile, files } = body;
      
      if (!command) {
        return NextResponse.json(
          { error: "Command is required" },
          { status: 400 }
        );
      }
      
      if (!files || Object.keys(files).length === 0) {
        return NextResponse.json(
          { error: "Files content is required" },
          { status: 400 }
        );
      }
      
      if (!activeFile) {
        return NextResponse.json(
          { error: "Active file path is required" },
          { status: 400 }
        );
      }
      
      // Log for debugging
      console.log(`Generating plan for command: "${command}" with activeFile: ${activeFile}`);
      console.log(`Received ${Object.keys(files).length} files for analysis`);
      console.log(`OpenAI API Key available: ${!!process.env.OPENAI_API_KEY}`);
      
      // Determine which service to use
      let result;
      if (process.env.OPENAI_API_KEY) {
        // Call the OpenAI service to generate a plan
        result = await generatePlan(command, files, activeFile);
      } else {
        // Use mock service if no API key
        if (typeof mockService.generatePlan === 'function') {
          result = await mockService.generatePlan(command, files, activeFile);
        } else {
          // Fallback if mock service doesn't implement generatePlan
          result = {
            plan: {
              description: "Mock plan generated (API key not configured)",
              filesToModify: [activeFile],
              fileExplanations: { [activeFile]: "Will be modified based on the command" }
            },
            message: "Using mock service - limited functionality"
          };
        }
      }
      
      return NextResponse.json(result);
    }
    
    // Handle LLM command operation
    if (operation === 'command') {
      const { command, currentCode, filePath, allFiles, isNewFile } = body;
      
      if (!command || currentCode === undefined || !filePath) {
        return NextResponse.json(
          { message: "Missing required parameters: command, currentCode, or filePath" },
          { status: 400 }
        );
      }
      
      // Log for debugging
      console.log(`Processing command: "${command}" for ${filePath}`);
      console.log(`Is creating new file: ${isNewFile ? 'yes' : 'no'}`);
      console.log(`OpenAI API Key available: ${!!process.env.OPENAI_API_KEY}`);
      
      // Process the command with the appropriate service
      const result = await processCommand(command, currentCode, filePath, allFiles, isNewFile);
      
      return NextResponse.json(result);
    }
    
    // Return error for unknown POST operations
    return NextResponse.json(
      { error: "Unknown operation specified" },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing API request:', error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 