import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from "jsdom"
import { Readability } from "@mozilla/readability"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { SIMPLIFY_PROMPT } from "@/lib/prompts"
import axios from 'axios';
import { corsHeaders } from '@/lib/cors';

export const maxDuration = 60 // Increase timeout for fetching external URLs

interface FetchAndSimplifyRequest {
  url: string;
}

interface FetchAndSimplifyResponse {
  success: boolean;
  steps?: string[];
  extractedText?: string;
  error?: string;
  details?: string;
  fallbackUsed?: boolean;
  contentType?: string;
}

// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// Fallback content extraction methods for HTML
function extractContentFallback(dom: JSDOM): string | null {
  const document = dom.window.document;
  
  // Try multiple selectors for main content
  const selectors = [
    'main',
    'article',
    '[role="main"]',
    '.content',
    '.post-content',
    '.entry-content',
    '.article-content',
    '#content',
    '#main',
    '.main',
    'body'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent && element.textContent.trim().length > 100) {
      return element.textContent.trim();
    }
  }

  // Try to extract from paragraphs
  const paragraphs = document.querySelectorAll('p');
  if (paragraphs.length > 0) {
    const text = Array.from(paragraphs)
      .map(p => p.textContent?.trim())
      .filter(text => text && text.length > 20)
      .join('\n\n');
    
    if (text.length > 100) {
      return text;
    }
  }

  // Last resort: get all text content
  const allText = document.body.textContent?.trim();
  if (allText && allText.length > 100) {
    return allText;
  }

  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse<FetchAndSimplifyResponse>> {
  try {
    const body: FetchAndSimplifyRequest = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL is required." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid URL format" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if it's a PDF file and provide helpful error
    const isPDF = url.toLowerCase().endsWith('.pdf') || url.toLowerCase().includes('.pdf');
    
    if (isPDF) {
      return NextResponse.json(
        { 
          success: false, 
          error: "PDF files are not currently supported",
          details: "This URL points to a PDF file. PDF extraction is not yet available. Please try a web page with HTML content instead.",
          contentType: 'pdf'
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Handle HTML content
    console.log(`Fetching and simplifying HTML content from: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 15000, // Increased timeout to 15 seconds
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      maxRedirects: 5,
    });

    if (!response.data) {
      return NextResponse.json(
        { success: false, error: "No content received from URL" },
        { status: 500, headers: corsHeaders }
      );
    }

    // 2. Parse the HTML and extract the main content
    const doc = new JSDOM(response.data, { 
      url,
      pretendToBeVisual: true,
      runScripts: 'outside-only',
    });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();

    let extractedText: string | null = null;
    let fallbackUsed = false;

    if (article && article.textContent && article.textContent.trim().length > 50) {
      extractedText = article.textContent.trim();
    } else {
      // Try fallback extraction
      console.log('Readability failed, trying fallback extraction');
      extractedText = extractContentFallback(doc);
      fallbackUsed = true;
    }

    if (!extractedText || extractedText.length < 50) {
      // Provide more detailed error information
      const document = doc.window.document;
      const title = document.title || 'No title found';
      const hasBody = !!document.body;
      const bodyLength = document.body?.textContent?.length || 0;
      const hasScripts = document.querySelectorAll('script').length;
      const hasIframes = document.querySelectorAll('iframe').length;
      
      return NextResponse.json(
        { 
          success: false, 
          error: "Could not extract readable content from this page",
          details: `Page analysis: Title="${title}", Has body=${hasBody}, Body length=${bodyLength}, Scripts=${hasScripts}, Iframes=${hasIframes}. The page may be JavaScript-heavy, blocked from extraction, or contain no readable text.`,
          contentType: 'html',
          debug: {
            title,
            hasBody,
            bodyLength,
            hasScripts,
            hasIframes,
            contentType: response.headers['content-type']
          }
        },
        { status: 500, headers: corsHeaders }
      );
    }

    const cleanedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .substring(0, 8000); // Limit for AI processing

    if (cleanedText.length < 50) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Extracted content is too short",
          details: "The page may not contain enough readable text"
        },
        { status: 500, headers: corsHeaders }
      );
    }

    // 3. Send the extracted text to the AI for simplification
    const prompt = SIMPLIFY_PROMPT.replace("{{INSTRUCTIONS}}", cleanedText);

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
    });

    const steps = JSON.parse(text);

    if (!Array.isArray(steps)) {
      throw new Error("AI did not return a valid array of steps.");
    }

    // 4. Return both the simplified steps and the original extracted text for context
    return NextResponse.json({
      success: true,
      steps: steps,
      extractedText: cleanedText,
      fallbackUsed,
      contentType: 'html',
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Fetch and simplify error:', error);
    
    let errorMessage = "An unexpected error occurred.";
    let details = "Unknown error occurred";
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused';
        details = 'The website may be down or blocking requests';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Website not found';
        details = 'The URL may be incorrect or the website may not exist';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access forbidden';
        details = 'The website is blocking content extraction';
      } else if (error.response?.status === 404) {
        errorMessage = 'Page not found';
        details = 'The requested page does not exist';
      } else if (error.response && error.response.status >= 500) {
        errorMessage = 'Server error';
        details = 'The website server is experiencing issues';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Request timeout';
        details = 'The website took too long to respond';
      } else {
        errorMessage = `HTTP Error: ${error.response?.status ?? 'Unknown'}`;
        details = error.message || 'Unknown error';
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
      details = 'An unexpected error occurred during content extraction or processing';
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage, details: details },
      { status: 500, headers: corsHeaders }
    );
  }
}
