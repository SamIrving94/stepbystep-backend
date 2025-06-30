import { NextRequest, NextResponse } from 'next/server';
import { ComputerVisionClient } from '@azure/cognitiveservices-computervision';
import { ApiKeyCredentials } from '@azure/ms-rest-js';
import { corsHeaders } from '@/lib/cors';

interface ProcessImagesRequest {
  images: string[]; // Array of base64 encoded images
  extractText?: boolean; // Whether to extract text from images
  describeImages?: boolean; // Whether to describe image content
}

interface ProcessedImage {
  index: number;
  description?: string;
  extractedText?: string;
  tags?: string[];
  confidence?: number;
  error?: string;
}

interface ProcessImagesResponse {
  success: boolean;
  processedImages?: ProcessedImage[];
  error?: string;
  details?: string;
  totalImages: number;
  successfulImages: number;
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
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// Process a single image
async function processImage(
  client: ComputerVisionClient,
  imageBuffer: Buffer,
  index: number,
  extractText: boolean,
  describeImages: boolean
): Promise<ProcessedImage> {
  const result: ProcessedImage = { index };

  try {
    // Describe image content
    if (describeImages) {
      const description = await client.describeImage(imageBuffer);
      if (description.captions && description.captions.length > 0) {
        result.description = description.captions[0].text;
        result.confidence = description.captions[0].confidence;
      }
      result.tags = description.tags || [];
    }

    // Extract text (OCR)
    if (extractText) {
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
    }

  } catch (error) {
    console.error(`Error processing image ${index}:`, error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return result;
}

export async function POST(request: NextRequest): Promise<NextResponse<ProcessImagesResponse>> {
  try {
    // Parse request body
    const body: ProcessImagesRequest = await request.json();
    const { images, extractText = true, describeImages = true } = body;

    // Validate input
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Images array is required and must not be empty',
          totalImages: 0,
          successfulImages: 0
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (images.length > 10) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Maximum 10 images allowed per request',
          totalImages: images.length,
          successfulImages: 0
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check Azure Vision credentials
    const client = createVisionClient();
    if (!client) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Azure Vision service not configured',
          details: 'Please set AZURE_VISION_ENDPOINT and AZURE_VISION_API_KEY environment variables',
          totalImages: images.length,
          successfulImages: 0
        },
        { status: 503, headers: corsHeaders }
      );
    }

    console.log(`Processing ${images.length} images with Azure Vision`);

    // Process all images
    const processedImages: ProcessedImage[] = [];
    let successfulCount = 0;

    for (let i = 0; i < images.length; i++) {
      try {
        const imageBuffer = base64ToBuffer(images[i]);
        const processedImage = await processImage(client, imageBuffer, i, extractText, describeImages);
        
        if (!processedImage.error) {
          successfulCount++;
        }
        
        processedImages.push(processedImage);
      } catch (error) {
        console.error(`Failed to process image ${i}:`, error);
        processedImages.push({
          index: i,
          error: error instanceof Error ? error.message : 'Failed to process image'
        });
      }
    }

    return NextResponse.json({
      success: true,
      processedImages,
      totalImages: images.length,
      successfulImages: successfulCount,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Image processing error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process images',
        details: error instanceof Error ? error.message : 'Unknown error',
        totalImages: 0,
        successfulImages: 0
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json(
    { 
      message: 'Use POST method with base64 images in request body',
      example: {
        method: 'POST',
        body: {
          images: ['data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...'],
          extractText: true,
          describeImages: true
        }
      },
      features: {
        extractText: 'OCR text extraction from images',
        describeImages: 'AI-powered image descriptions',
        maxImages: '10 images per request',
        format: 'Base64 encoded images'
      }
    },
    { status: 200, headers: corsHeaders }
  );
} 