import { NextRequest, NextResponse } from 'next/server';
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { SIMPLIFY_PROMPT } from "@/lib/prompts"
import { corsHeaders } from '@/lib/cors';

export const maxDuration = 30

// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

interface SimplifyRequest {
  instructions: string;
}

interface SimplifyResponse {
  success: boolean;
  steps?: string[];
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<SimplifyResponse>> {
  try {
    const body: SimplifyRequest = await request.json();
    const { instructions } = body;

    if (!instructions) {
      return NextResponse.json(
        { success: false, error: "Instructions are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const prompt = SIMPLIFY_PROMPT.replace("{{INSTRUCTIONS}}", instructions);

    // The AI SDK automatically uses process.env.OPENAI_API_KEY
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
    });

    const steps = JSON.parse(text);

    if (!Array.isArray(steps)) {
      throw new Error("AI did not return a valid array of steps.");
    }

    return NextResponse.json({
      success: true,
      steps: steps,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Simplify error:', error);
    
    let errorMessage = "An unexpected error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    if (error instanceof SyntaxError) {
      errorMessage = "Failed to parse the AI's response. The format might be incorrect.";
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}
