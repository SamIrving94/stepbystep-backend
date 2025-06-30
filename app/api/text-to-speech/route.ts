import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

interface TTSRequest {
  text: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number; // 0.25 to 4.0
  cache?: boolean; // Whether to cache the audio
  method?: 'openai' | 'browser' | 'auto'; // TTS method preference
  quality?: 'standard' | 'high'; // Quality preference
}

interface TTSResponse {
  success: boolean;
  audioUrl?: string | null;
  method?: 'openai' | 'browser' | 'fallback';
  error?: string;
  cached?: boolean;
  estimatedCost?: number; // Cost estimate for OpenAI
  text?: string; // For browser TTS
  voice?: string; // For browser TTS
  speed?: number; // For browser TTS
}

// Cache directory for audio files
const CACHE_DIR = path.join(process.cwd(), 'public', 'audio-cache');

// Ensure cache directory exists
async function ensureCacheDir() {
  try {
    await fs.access(CACHE_DIR);
  } catch {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  }
}

// Generate cache key for text and settings
function generateCacheKey(text: string, voice: string, speed: number): string {
  const content = `${text}-${voice}-${speed}`;
  return crypto.createHash('md5').update(content).digest('hex');
}

// Check if audio is cached
async function getCachedAudio(cacheKey: string): Promise<string | null> {
  try {
    const audioPath = path.join(CACHE_DIR, `${cacheKey}.mp3`);
    await fs.access(audioPath);
    return `/audio-cache/${cacheKey}.mp3`;
  } catch {
    return null;
  }
}

// Save audio to cache
async function saveToCache(cacheKey: string, audioBuffer: Buffer): Promise<string> {
  const audioPath = path.join(CACHE_DIR, `${cacheKey}.mp3`);
  await fs.writeFile(audioPath, audioBuffer);
  return `/audio-cache/${cacheKey}.mp3`;
}

// Calculate estimated cost for OpenAI TTS
function calculateCost(text: string): number {
  const characterCount = text.length;
  const costPerThousand = 0.015; // OpenAI TTS pricing
  return (characterCount / 1000) * costPerThousand;
}

// Generate OpenAI TTS
async function generateOpenAITTS(text: string, voice: string, speed: number): Promise<{ audioBuffer: Buffer; cost: number }> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: voice as any,
    input: text,
    speed: Math.max(0.25, Math.min(4.0, speed)),
  });

  const audioBuffer = Buffer.from(await mp3.arrayBuffer());
  const cost = calculateCost(text);

  return { audioBuffer, cost };
}

export async function POST(request: NextRequest): Promise<NextResponse<TTSResponse>> {
  try {
    // Ensure cache directory exists
    await ensureCacheDir();

    // Parse request
    const body: TTSRequest = await request.json();
    const { 
      text, 
      voice = 'alloy', 
      speed = 1.0, 
      cache = true, 
      method = 'auto',
      quality = 'standard'
    } = body;

    // Validate input
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      );
    }

    if (text.length > 4000) {
      return NextResponse.json(
        { success: false, error: 'Text too long (max 4000 characters)' },
        { status: 400 }
      );
    }

    // Check cache first (only for OpenAI method)
    if (cache && method !== 'browser') {
      const cacheKey = generateCacheKey(text, voice, speed);
      const cachedAudio = await getCachedAudio(cacheKey);
      
      if (cachedAudio) {
        return NextResponse.json({
          success: true,
          audioUrl: cachedAudio,
          method: 'openai',
          cached: true,
          estimatedCost: 0, // Cached, so no cost
        });
      }
    }

    // Determine TTS method
    let ttsMethod: 'openai' | 'browser' | 'fallback' = 'fallback';
    
    if (method === 'openai' || (method === 'auto' && quality === 'high')) {
      // Use OpenAI if explicitly requested or high quality is preferred
      if (process.env.OPENAI_API_KEY) {
        ttsMethod = 'openai';
      }
    } else if (method === 'browser' || (method === 'auto' && quality === 'standard')) {
      // Use browser TTS for standard quality or when explicitly requested
      ttsMethod = 'browser';
    }

    // Generate TTS based on method
    if (ttsMethod === 'openai') {
      try {
        const { audioBuffer, cost } = await generateOpenAITTS(text, voice, speed);
        
        // Save to cache if requested
        let audioUrl: string;
        if (cache) {
          const cacheKey = generateCacheKey(text, voice, speed);
          audioUrl = await saveToCache(cacheKey, audioBuffer);
        } else {
          // Return audio data directly
          return new NextResponse(audioBuffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': audioBuffer.length.toString(),
            },
          });
        }

        return NextResponse.json({
          success: true,
          audioUrl,
          method: 'openai',
          cached: false,
          estimatedCost: cost,
        });
      } catch (error) {
        console.error('OpenAI TTS failed, falling back to browser method:', error);
        ttsMethod = 'browser';
      }
    }

    // Browser TTS method (returns instructions for frontend)
    if (ttsMethod === 'browser') {
      return NextResponse.json({
        success: true,
        method: 'browser',
        audioUrl: null, // No audio URL for browser TTS
        estimatedCost: 0,
        // Include text for browser TTS
        text: text,
        voice: voice,
        speed: speed,
      });
    }

    // Fallback: return error
    return NextResponse.json(
      { success: false, error: 'No TTS method available' },
      { status: 503 }
    );

  } catch (error) {
    console.error('TTS Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate speech',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to serve cached audio files
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const cacheKey = searchParams.get('key');
  
  if (!cacheKey) {
    return NextResponse.json({ error: 'Cache key required' }, { status: 400 });
  }

  try {
    const audioPath = path.join(CACHE_DIR, `${cacheKey}.mp3`);
    const audioBuffer = await fs.readFile(audioPath);
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Audio not found' }, { status: 404 });
  }
} 