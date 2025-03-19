import { NextRequest, NextResponse } from "next/server";
import { generatePlan } from "@/utils/openaiService";
import * as mockService from "@/utils/mockService";

// Use Node.js runtime for OpenAI API
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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
  } catch (error: any) {
    console.error("Error in LLM planning API:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 