import { NextRequest, NextResponse } from 'next/server';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import axios from 'axios';

interface FetchFromLinkRequest {
  url: string;
}

interface FetchFromLinkResponse {
  success: boolean;
  content?: string;
  title?: string;
  error?: string;
  details?: string;
  fallbackUsed?: boolean;
}

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

// Fallback content extraction methods
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

export async function POST(request: NextRequest): Promise<NextResponse<FetchFromLinkResponse>> {
  try {
    // Parse request body
    const body: FetchFromLinkRequest = await request.json();
    const { url } = body;

    // Validate URL
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch the webpage
    console.log(`Fetching content from: ${url}`);
    
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
        { success: false, error: 'No content received from URL' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Parse the HTML content
    const dom = new JSDOM(response.data, {
      url: url,
      pretendToBeVisual: true,
      runScripts: 'outside-only', // Don't run scripts but allow external resources
    });

    // Extract readable content using Readability
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    let content: string | null = null;
    let fallbackUsed = false;

    if (article && article.textContent && article.textContent.trim().length > 50) {
      content = article.textContent.trim();
    } else {
      // Try fallback extraction
      console.log('Readability failed, trying fallback extraction');
      content = extractContentFallback(dom);
      fallbackUsed = true;
    }

    if (!content || content.length < 50) {
      // Provide more detailed error information
      const document = dom.window.document;
      const title = document.title || 'No title found';
      const hasBody = !!document.body;
      const bodyLength = document.body?.textContent?.length || 0;
      const hasScripts = document.querySelectorAll('script').length;
      const hasIframes = document.querySelectorAll('iframe').length;
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Could not extract readable content from this page',
          details: `Page analysis: Title="${title}", Has body=${hasBody}, Body length=${bodyLength}, Scripts=${hasScripts}, Iframes=${hasIframes}. The page may be JavaScript-heavy, blocked from extraction, or contain no readable text.`,
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

    // Clean up the extracted content
    const cleanedContent = content
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
      .substring(0, 10000); // Limit content length

    if (cleanedContent.length < 50) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Extracted content is too short',
          details: 'The page may not contain enough readable text'
        },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      content: cleanedContent,
      title: article?.title || dom.window.document.title || 'Untitled',
      fallbackUsed,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Content extraction error:', error);
    
    let errorMessage = 'Failed to extract content';
    let details = 'Unknown error occurred';
    
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
      details = 'An unexpected error occurred during content extraction';
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: details,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json(
    { 
      message: 'Use POST method with URL in request body',
      example: {
        method: 'POST',
        body: { url: 'https://example.com/article' }
      }
    },
    { status: 200, headers: corsHeaders }
  );
} 