import { NextRequest, NextResponse } from 'next/server';
import * as openaiService from '@/utils/openaiService';
import * as mockService from '@/utils/mockService';
import { processCommand } from '@/utils/openaiService';

// Use Node.js runtime for OpenAI API
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
    
    // Determine which service to use
    const llmService = process.env.OPENAI_API_KEY 
      ? openaiService 
      : mockService;
    
    // Process the command with the chosen LLM service
    const result = await processCommand(command, currentCode, filePath, allFiles, isNewFile);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error processing LLM command:', error);
    return NextResponse.json(
      { message: `Server error processing LLM command: ${error.message}` },
      { status: 500 }
    );
  }
} 