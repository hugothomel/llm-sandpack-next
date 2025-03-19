import { NextRequest, NextResponse } from 'next/server';
import * as openaiService from '@/utils/openaiService';
import * as mockService from '@/utils/mockService';
import { processCommand } from "../../../src/utils/openaiService";

// Use Node.js runtime for OpenAI API
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { command, currentCode, filePath, allFiles, isNewFile } = body;
    
    if (!command || currentCode === undefined || !filePath) {
      return NextResponse.json(
        { error: "Command, code, and filePath are required" },
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
    
    // Call the OpenAI service to process the command with the new file flag
    const result = await processCommand(command, currentCode, filePath, allFiles, isNewFile);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in LLM command API:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 