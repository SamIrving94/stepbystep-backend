import { NextRequest, NextResponse } from 'next/server';
import { ComputerVisionClient } from '@azure/cognitiveservices-computervision';
import { ApiKeyCredentials } from '@azure/ms-rest-js';
import OpenAI from 'openai';
import { 
  ENHANCED_PROCESSING_PROMPT, 
  COOKING_PROMPT, 
  DIY_PROMPT, 
  TECHNICAL_PROMPT,
  CONFIDENCE_PROMPT,
  SAFETY_PROMPT
} from '@/lib/prompts';
import { corsHeaders } from '@/lib/cors';

interface ProcessInstructionsWithImagesRequest {
  rawText?: string;
  images?: string[]; // Array of base64 encoded images
  title?: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  preferences?: {
    readingLevel?: 'simple' | 'standard' | 'detailed';
    stepGranularity?: 'basic' | 'detailed' | 'very-detailed';
    includeWarnings?: boolean;
  };
}

interface ProcessedImage {
  index: number;
  description?: string;
  extractedText?: string;
  tags?: string[];
  confidence?: number;
  error?: string;
}

interface ProcessedInstructions {
  title: string;
  category: string;
  difficulty: string;
  totalTime: string;
  ingredients: string[];
  tools: string[];
  warnings: string[];
  steps: {
    stepNumber: number;
    instruction: string;
    estimatedTime: string;
    tips?: string;
    relatedImages?: number[]; // Index of related images
  }[];
  imageInsights?: {
    totalImages: number;
    successfulImages: number;
    imageDescriptions: string[];
    extractedTextFromImages: string[];
  };
}

interface ApiResponse {
  success: boolean;
  processedInstructions?: ProcessedInstructions;
  error?: string;
  code?: string;
  details?: string;
}

// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// Initialize Azure Computer Vision client
function createVisionClient(): ComputerVisionClient | null {
  const endpoint = process.env.AZURE_VISION_ENDPOINT;
  const apiKey = process.env.AZURE_VISION_API_KEY;

  if (!endpoint || !apiKey) {
    console.warn('Azure Vision credentials not found');
    return null;
  }

  const credentials = new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': apiKey } });
  return new ComputerVisionClient(credentials, endpoint);
}

// Convert base64 to buffer
function base64ToBuffer(base64String: string): Buffer {
  const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// Process images with Azure Vision
async function processImages(images: string[]): Promise<ProcessedImage[]> {
  const client = createVisionClient();
  if (!client) {
    return images.map((_, index) => ({
      index,
      error: 'Azure Vision service not configured'
    }));
  }

  const processedImages: ProcessedImage[] = [];

  for (let i = 0; i < images.length; i++) {
    try {
      const imageBuffer = base64ToBuffer(images[i]);
      const result: ProcessedImage = { index: i };

      // Describe image content
      const description = await client.describeImage(imageBuffer);
      if (description.captions && description.captions.length > 0) {
        result.description = description.captions[0].text;
        result.confidence = description.captions[0].confidence;
      }
      result.tags = description.tags || [];

      // Extract text (OCR)
      const ocrResult = await client.recognizePrintedTextInStream(false, imageBuffer);
      const extractedText: string[] = [];

      if (ocrResult.regions) {
        for (const region of ocrResult.regions) {
          if (region.lines) {
            for (const line of region.lines) {
              if (line.words) {
                const lineText = line.words.map(word => word.text).join(' ');
                extractedText.push(lineText);
              }
            }
          }
        }
      }

      if (extractedText.length > 0) {
        result.extractedText = extractedText.join('\n');
      }

      processedImages.push(result);
    } catch (error) {
      console.error(`Error processing image ${i}:`, error);
      processedImages.push({
        index: i,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return processedImages;
}

// Generate AI prompt with image context
function generatePromptWithImages(
  input: ProcessInstructionsWithImagesRequest,
  processedImages: ProcessedImage[]
): string {
  const { rawText = '', title, category, difficulty, preferences } = input;
  
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

  // Prepare image context
  let imageContext = '';
  if (processedImages.length > 0) {
    const successfulImages = processedImages.filter(img => !img.error);
    if (successfulImages.length > 0) {
      imageContext = '\n\nIMAGE CONTEXT:\n';
      successfulImages.forEach((img, index) => {
        imageContext += `Image ${index + 1}:\n`;
        if (img.description) {
          imageContext += `Description: ${img.description}\n`;
        }
        if (img.extractedText) {
          imageContext += `Extracted Text: ${img.extractedText}\n`;
        }
        if (img.tags && img.tags.length > 0) {
          imageContext += `Tags: ${img.tags.join(', ')}\n`;
        }
        imageContext += '\n';
      });
    }
  }
  
  // Replace placeholders in the prompt
  return basePrompt
    .replace('{{INSTRUCTIONS}}', rawText + imageContext)
    .replace('{{ENHANCED_PROCESSING_PROMPT}}', ENHANCED_PROCESSING_PROMPT);
}

// Fallback processing for when AI is unavailable
function fallbackProcessing(
  input: ProcessInstructionsWithImagesRequest,
  processedImages: ProcessedImage[]
): ProcessedInstructions {
  const sentences = (input.rawText || '')
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  const steps = sentences.map((sentence, index) => ({
    stepNumber: index + 1,
    instruction: sentence.length > 50 ? sentence.substring(0, 50) + '...' : sentence,
    estimatedTime: '2-3 minutes',
    relatedImages: processedImages.length > 0 ? [index % processedImages.length] : undefined,
  }));

  const successfulImages = processedImages.filter(img => !img.error);
  const imageInsights = {
    totalImages: processedImages.length,
    successfulImages: successfulImages.length,
    imageDescriptions: successfulImages.map(img => img.description || '').filter(desc => desc),
    extractedTextFromImages: successfulImages.map(img => img.extractedText || '').filter(text => text),
  };

  return {
    title: input.title || 'Untitled Instructions',
    category: input.category || 'general',
    difficulty: input.difficulty || 'beginner',
    totalTime: `${steps.length * 3} minutes`,
    ingredients: [],
    tools: [],
    warnings: ['Please review instructions carefully before starting'],
    steps,
    imageInsights: processedImages.length > 0 ? imageInsights : undefined,
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate input
    if (!body.rawText && (!body.images || body.images.length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either rawText or images (or both) are required',
          code: 'INVALID_INPUT',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate images
    if (body.images && body.images.length > 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maximum 10 images allowed per request',
          code: 'TOO_MANY_IMAGES',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Process images first
    let processedImages: ProcessedImage[] = [];
    if (body.images && body.images.length > 0) {
      console.log(`Processing ${body.images.length} images with Azure Vision`);
      processedImages = await processImages(body.images);
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not found, using fallback processing');
      const fallbackResult = fallbackProcessing(body, processedImages);
      return NextResponse.json(
        {
          success: true,
          processedInstructions: fallbackResult,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Generate AI prompt with image context
    const prompt = generatePromptWithImages(body, processedImages);

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
      processedInstructions = fallbackProcessing(body, processedImages);
    }

    // Validate processed instructions structure
    if (!processedInstructions.steps || !Array.isArray(processedInstructions.steps)) {
      processedInstructions = fallbackProcessing(body, processedImages);
    }

    // Add image insights if images were processed
    if (processedImages.length > 0) {
      const successfulImages = processedImages.filter(img => !img.error);
      processedInstructions.imageInsights = {
        totalImages: processedImages.length,
        successfulImages: successfulImages.length,
        imageDescriptions: successfulImages.map(img => img.description || '').filter(desc => desc),
        extractedTextFromImages: successfulImages.map(img => img.extractedText || '').filter(text => text),
      };
    }

    return NextResponse.json(
      {
        success: true,
        processedInstructions,
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error processing instructions with images:', error);
    
    // Return fallback processing if AI fails
    try {
      const body = await request.json();
      const processedImages = body.images ? await processImages(body.images) : [];
      const fallbackResult = fallbackProcessing(body, processedImages);
      return NextResponse.json(
        {
          success: true,
          processedInstructions: fallbackResult,
        },
        { status: 200, headers: corsHeaders }
      );
    } catch (fallbackError) {
      console.error('Fallback processing also failed:', fallbackError);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process instructions with images',
        code: 'PROCESSING_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503, headers: corsHeaders }
    );
  }
} 