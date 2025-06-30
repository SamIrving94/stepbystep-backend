import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { 
  ENHANCED_PROCESSING_PROMPT, 
  COOKING_PROMPT, 
  DIY_PROMPT, 
  TECHNICAL_PROMPT,
  CONFIDENCE_PROMPT,
  SAFETY_PROMPT
} from '@/lib/prompts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// Input validation types
interface ProcessInstructionsRequest {
  rawText: string;
  title?: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  preferences?: {
    readingLevel?: 'simple' | 'standard' | 'detailed';
    stepGranularity?: 'basic' | 'detailed' | 'very-detailed';
    includeWarnings?: boolean;
  };
}

interface ProcessedStep {
  stepNumber: number;
  instruction: string;
  estimatedTime: string;
  tips?: string;
}

interface ProcessedInstructions {
  title: string;
  category: string;
  difficulty: string;
  totalTime: string;
  ingredients: string[];
  tools: string[];
  warnings: string[];
  steps: ProcessedStep[];
}

interface ApiResponse {
  success: boolean;
  processedInstructions?: ProcessedInstructions;
  error?: string;
  code?: string;
  details?: string;
}

// Input validation function
function validateInput(data: any): ProcessInstructionsRequest | null {
  if (!data.rawText || typeof data.rawText !== 'string') {
    return null;
  }

  if (data.rawText.trim().length < 10) {
    return null;
  }

  return {
    rawText: data.rawText.trim(),
    title: data.title || 'Untitled Instructions',
    category: data.category || 'general',
    difficulty: data.difficulty || 'beginner',
    preferences: {
      readingLevel: data.preferences?.readingLevel || 'simple',
      stepGranularity: data.preferences?.stepGranularity || 'detailed',
      includeWarnings: data.preferences?.includeWarnings !== false,
    },
  };
}

// AI prompt generation with specialized prompts
function generatePrompt(input: ProcessInstructionsRequest): string {
  const { rawText, title, category, difficulty, preferences } = input;
  
  // Select the appropriate specialized prompt based on category
  let basePrompt: string;
  
  switch (category?.toLowerCase()) {
    case 'cooking':
    case 'recipe':
    case 'food':
      basePrompt = COOKING_PROMPT;
      break;
    case 'diy':
    case 'home':
    case 'repair':
    case 'construction':
      basePrompt = DIY_PROMPT;
      break;
    case 'technical':
    case 'computer':
    case 'software':
    case 'technology':
      basePrompt = TECHNICAL_PROMPT;
      break;
    default:
      basePrompt = ENHANCED_PROCESSING_PROMPT;
  }
  
  // Add confidence-building for overwhelming tasks
  if (difficulty === 'advanced' || preferences?.stepGranularity === 'very-detailed') {
    basePrompt = CONFIDENCE_PROMPT;
  }
  
  // Add safety-first for potentially dangerous categories
  if (category?.toLowerCase().includes('safety') || 
      category?.toLowerCase().includes('dangerous') ||
      rawText.toLowerCase().includes('sharp') ||
      rawText.toLowerCase().includes('hot') ||
      rawText.toLowerCase().includes('electric')) {
    basePrompt = SAFETY_PROMPT;
  }
  
  // Replace placeholders in the prompt
  return basePrompt
    .replace('{{INSTRUCTIONS}}', rawText)
    .replace('{{ENHANCED_PROCESSING_PROMPT}}', ENHANCED_PROCESSING_PROMPT);
}

// Fallback processing for when AI is unavailable
function fallbackProcessing(input: ProcessInstructionsRequest): ProcessedInstructions {
  const sentences = input.rawText
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  const steps: ProcessedStep[] = sentences.map((sentence, index) => ({
    stepNumber: index + 1,
    instruction: sentence.length > 50 ? sentence.substring(0, 50) + '...' : sentence,
    estimatedTime: '2-3 minutes',
  }));

  return {
    title: input.title || 'Untitled Instructions',
    category: input.category || 'general',
    difficulty: input.difficulty || 'beginner',
    totalTime: `${steps.length * 3} minutes`,
    ingredients: [],
    tools: [],
    warnings: ['Please review instructions carefully before starting'],
    steps,
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate input
    const validatedInput = validateInput(body);
    if (!validatedInput) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input: rawText is required and must be at least 10 characters long',
          code: 'INVALID_INPUT',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not found, using fallback processing');
      const fallbackResult = fallbackProcessing(validatedInput);
      return NextResponse.json(
        {
          success: true,
          processedInstructions: fallbackResult,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Generate AI prompt
    const prompt = generatePrompt(validatedInput);

    // Call OpenAI API
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an accessibility expert. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from AI service');
    }

    // Parse AI response
    let processedInstructions: ProcessedInstructions;
    try {
      processedInstructions = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      // Fallback to basic processing
      processedInstructions = fallbackProcessing(validatedInput);
    }

    // Validate processed instructions structure
    if (!processedInstructions.steps || !Array.isArray(processedInstructions.steps)) {
      processedInstructions = fallbackProcessing(validatedInput);
    }

    return NextResponse.json(
      {
        success: true,
        processedInstructions,
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error processing instructions:', error);
    
    // Return fallback processing if AI fails
    try {
      const body = await request.json();
      const validatedInput = validateInput(body);
      if (validatedInput) {
        const fallbackResult = fallbackProcessing(validatedInput);
        return NextResponse.json(
          {
            success: true,
            processedInstructions: fallbackResult,
          },
          { status: 200, headers: corsHeaders }
        );
      }
    } catch (fallbackError) {
      console.error('Fallback processing also failed:', fallbackError);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process instructions',
        code: 'PROCESSING_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503, headers: corsHeaders }
    );
  }
} 