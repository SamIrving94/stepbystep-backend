import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

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

// AI prompt generation
function generatePrompt(input: ProcessInstructionsRequest): string {
  const { rawText, title, category, difficulty, preferences } = input;
  
  return `You are an accessibility expert helping users with dyslexia and ADHD follow instructions. 
Transform the given instructions into a clear, step-by-step format.

INSTRUCTIONS TO PROCESS:
${rawText}

TITLE: ${title}
CATEGORY: ${category}
DIFFICULTY: ${difficulty}

REQUIREMENTS:
1. Use short, simple sentences (max 15 words)
2. Number each step clearly
3. Extract and list all ingredients/tools at the beginning
4. Include safety warnings as separate bullet points
5. Add estimated time for each step
6. Use active voice and direct commands
7. Avoid jargon and complex terminology
8. Reading level: ${preferences?.readingLevel || 'simple'}
9. Step detail level: ${preferences?.stepGranularity || 'detailed'}

RESPOND IN THIS EXACT JSON FORMAT:
{
  "title": "string",
  "category": "string", 
  "difficulty": "string",
  "totalTime": "string (e.g., '45 minutes')",
  "ingredients": ["string array"],
  "tools": ["string array"],
  "warnings": ["string array"],
  "steps": [
    {
      "stepNumber": 1,
      "instruction": "string",
      "estimatedTime": "string (e.g., '5 minutes')",
      "tips": "string (optional)"
    }
  ]
}

Only return valid JSON, no additional text.`;
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
        { status: 400 }
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
        { status: 200 }
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
      { status: 200 }
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
          { status: 200 }
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
      { status: 503 }
    );
  }
} 