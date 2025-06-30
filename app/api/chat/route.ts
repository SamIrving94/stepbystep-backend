import { NextRequest, NextResponse } from 'next/server';
import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"
import { ENHANCED_QA_PROMPT } from "@/lib/prompts"
import { corsHeaders } from '@/lib/cors';

export const maxDuration = 30

// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  const { messages, data } = await request.json()
  const { instructionContext } = data

  const systemPrompt = ENHANCED_QA_PROMPT.replace("{{INSTRUCTIONS}}", instructionContext)

  const result = await streamText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages,
  })

  const response = result.toDataStreamResponse();
  
  // Add CORS headers to the streaming response
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}
