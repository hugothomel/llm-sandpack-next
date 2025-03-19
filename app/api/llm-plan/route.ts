import { NextRequest, NextResponse } from "next/server";
import { generatePlan } from "../../../src/utils/openaiService";

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
    
    // Call the OpenAI service to generate a plan
    const result = await generatePlan(command, files, activeFile);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in LLM planning API:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 