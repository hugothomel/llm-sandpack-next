import { NextResponse } from 'next/server';

export const runtime = 'edge'; // Use edge runtime for faster response

export async function GET() {
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