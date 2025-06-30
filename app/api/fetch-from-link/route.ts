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
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Fetch the webpage
    console.log(`Fetching content from: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.data) {
      return NextResponse.json(
        { success: false, error: 'No content received from URL' },
        { status: 500 }
      );
    }

    // Parse the HTML content
    const dom = new JSDOM(response.data, {
      url: url,
      pretendToBeVisual: true,
    });

    // Extract readable content using Readability
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Could not extract readable content from this page',
          details: 'The page may not contain readable text or may be blocked from content extraction'
        },
        { status: 500 }
      );
    }

    // Clean up the extracted content
    const content = article.textContent
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
      .substring(0, 10000); // Limit content length

    if (content.length < 50) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Extracted content is too short',
          details: 'The page may not contain enough readable text'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      content: content,
      title: article.title || 'Untitled',
    });

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
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error';
        details = 'The website server is experiencing issues';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Request timeout';
        details = 'The website took too long to respond';
      } else {
        errorMessage = `HTTP Error: ${error.response?.status || 'Unknown'}`;
        details = error.message;
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
      { status: 500 }
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
    { status: 200 }
  );
} 