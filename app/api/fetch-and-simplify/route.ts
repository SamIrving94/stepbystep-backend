import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from "jsdom"
import { Readability } from "@mozilla/readability"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { SIMPLIFY_PROMPT } from "@/lib/prompts"
import axios from 'axios';

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
}

export async function POST(request: NextRequest): Promise<NextResponse<FetchAndSimplifyResponse>> {
  try {
    const body: FetchAndSimplifyRequest = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL is required." },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // 1. Fetch HTML content from the URL
    console.log(`Fetching and simplifying content from: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.data) {
      return NextResponse.json(
        { success: false, error: "No content received from URL" },
        { status: 500 }
      );
    }

    // 2. Parse the HTML and extract the main content
    const doc = new JSDOM(response.data, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Could not extract readable content from this page",
          details: "The page may not contain readable text or may be blocked from content extraction"
        },
        { status: 500 }
      );
    }

    const extractedText = article.textContent
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .substring(0, 8000); // Limit for AI processing

    if (extractedText.length < 50) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Extracted content is too short",
          details: "The page may not contain enough readable text"
        },
        { status: 500 }
      );
    }

    // 3. Send the extracted text to the AI for simplification
    const prompt = SIMPLIFY_PROMPT.replace("{{INSTRUCTIONS}}", extractedText);

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
      extractedText: extractedText,
    });

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
      { status: 500 }
    );
  }
}
