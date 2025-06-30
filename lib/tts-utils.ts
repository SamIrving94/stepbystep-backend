// TTS Utility Functions for StepByStep - Hybrid Approach

export interface TTSOptions {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number;
  cache?: boolean;
  method?: 'openai' | 'browser' | 'auto';
  quality?: 'standard' | 'high';
}

export interface TTSResponse {
  success: boolean;
  audioUrl?: string | null;
  method?: 'openai' | 'browser' | 'fallback';
  error?: string;
  cached?: boolean;
  estimatedCost?: number;
  text?: string; // For browser TTS
  voice?: string; // For browser TTS
  speed?: number; // For browser TTS
}

// Generate TTS using hybrid approach
export async function generateStepAudio(
  text: string, 
  options: TTSOptions = {}
): Promise<TTSResponse> {
  try {
    const response = await fetch('/api/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice: options.voice || 'alloy',
        speed: options.speed || 1.0,
        cache: options.cache !== false,
        method: options.method || 'auto',
        quality: options.quality || 'standard',
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS request failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('TTS Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Play audio based on TTS method
export async function playTTSAudio(ttsResponse: TTSResponse): Promise<void> {
  if (!ttsResponse.success) {
    console.error('TTS failed:', ttsResponse.error);
    return;
  }

  if (ttsResponse.method === 'openai' && ttsResponse.audioUrl) {
    // Play OpenAI-generated audio
    const audio = new Audio(ttsResponse.audioUrl);
    await audio.play();
  } else if (ttsResponse.method === 'browser' && ttsResponse.text) {
    // Use browser TTS
    await playBrowserTTS(ttsResponse.text, ttsResponse.voice, ttsResponse.speed);
  }
}

// Browser TTS implementation
export async function playBrowserTTS(
  text: string, 
  voice?: string, 
  speed: number = 1.0
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice if specified
    if (voice) {
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.name.toLowerCase().includes(voice.toLowerCase()));
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    // Set speed (0.1 to 10)
    utterance.rate = Math.max(0.1, Math.min(10, speed));

    utterance.onend = () => resolve();
    utterance.onerror = (error) => reject(error);

    window.speechSynthesis.speak(utterance);
  });
}

// Generate TTS for multiple steps with hybrid approach
export async function generateInstructionsAudio(
  steps: Array<{ stepNumber: number; instruction: string }>,
  options: TTSOptions = {}
): Promise<Array<{ stepNumber: number; audioUrl?: string; method?: string; error?: string }>> {
  const results = [];

  for (const step of steps) {
    const ttsResult = await generateStepAudio(step.instruction, options);
    
    results.push({
      stepNumber: step.stepNumber,
      audioUrl: ttsResult.audioUrl || undefined,
      method: ttsResult.method,
      error: ttsResult.error,
    });
  }

  return results;
}

// Enhanced Audio Player with hybrid support
export class HybridAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private currentStep: number = 0;
  private audioQueue: Array<{ 
    stepNumber: number; 
    audioUrl?: string; 
    text?: string; 
    method?: string;
    voice?: string;
    speed?: number;
  }> = [];
  private isPlaying: boolean = false;

  constructor() {
    this.audio = new Audio();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.audio) return;

    this.audio.addEventListener('ended', () => {
      this.playNextInQueue();
    });

    this.audio.addEventListener('error', (error) => {
      console.error('Audio playback error:', error);
      this.playNextInQueue(); // Try next item
    });
  }

  // Queue multiple audio items (mix of OpenAI and browser TTS)
  queueAudio(items: Array<{ 
    stepNumber: number; 
    audioUrl?: string; 
    text?: string; 
    method?: string;
    voice?: string;
    speed?: number;
  }>): void {
    this.audioQueue = [...items];
    this.currentStep = 0;
  }

  // Play next item in queue
  private async playNextInQueue(): Promise<void> {
    if (this.currentStep < this.audioQueue.length) {
      const item = this.audioQueue[this.currentStep];
      this.currentStep++;
      
      if (item.method === 'openai' && item.audioUrl) {
        await this.playAudioFile(item.audioUrl);
      } else if (item.method === 'browser' && item.text) {
        await this.playBrowserTTS(item.text, item.voice, item.speed);
      }
    } else {
      this.isPlaying = false;
    }
  }

  // Play audio file (OpenAI TTS)
  private async playAudioFile(audioUrl: string): Promise<void> {
    if (!this.audio) return;

    try {
      this.audio.src = audioUrl;
      await this.audio.play();
    } catch (error) {
      console.error('Failed to play audio file:', error);
      this.playNextInQueue(); // Try next item
    }
  }

  // Play browser TTS
  private async playBrowserTTS(text: string, voice?: string, speed: number = 1.0): Promise<void> {
    try {
      await playBrowserTTS(text, voice, speed);
      // Browser TTS doesn't have an 'ended' event, so we manually trigger next
      setTimeout(() => this.playNextInQueue(), 100);
    } catch (error) {
      console.error('Failed to play browser TTS:', error);
      this.playNextInQueue(); // Try next item
    }
  }

  // Start playing the queue
  async playQueue(): Promise<void> {
    if (this.audioQueue.length > 0) {
      this.isPlaying = true;
      this.currentStep = 0;
      await this.playNextInQueue();
    }
  }

  // Stop current playback
  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    
    // Stop browser TTS
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    this.audioQueue = [];
    this.currentStep = 0;
    this.isPlaying = false;
  }

  // Pause/resume
  pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    if (this.audio) {
      this.audio.play();
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
  }

  // Get current playback status
  getStatus(): {
    isPlaying: boolean;
    currentStep: number;
    totalSteps: number;
    progress: number;
    method?: string;
  } {
    return {
      isPlaying: this.isPlaying,
      currentStep: this.currentStep,
      totalSteps: this.audioQueue.length,
      progress: this.audioQueue.length > 0 ? (this.currentStep / this.audioQueue.length) * 100 : 0,
      method: this.audioQueue[this.currentStep]?.method,
    };
  }
}

// Voice options with descriptions
export const VOICE_OPTIONS = [
  { value: 'alloy', label: 'Alloy', description: 'Clear and professional' },
  { value: 'echo', label: 'Echo', description: 'Warm and friendly' },
  { value: 'fable', label: 'Fable', description: 'Calm and soothing' },
  { value: 'onyx', label: 'Onyx', description: 'Deep and authoritative' },
  { value: 'nova', label: 'Nova', description: 'Bright and energetic' },
  { value: 'shimmer', label: 'Shimmer', description: 'Gentle and encouraging' },
];

// Speed options
export const SPEED_OPTIONS = [
  { value: 0.5, label: 'Slow (0.5x)' },
  { value: 0.75, label: 'Slow (0.75x)' },
  { value: 1.0, label: 'Normal (1x)' },
  { value: 1.25, label: 'Fast (1.25x)' },
  { value: 1.5, label: 'Fast (1.5x)' },
  { value: 2.0, label: 'Very Fast (2x)' },
];

// TTS Method options
export const TTS_METHOD_OPTIONS = [
  { value: 'auto', label: 'Auto (Smart Choice)', description: 'Automatically choose best method' },
  { value: 'openai', label: 'High Quality (OpenAI)', description: 'Premium quality, costs money' },
  { value: 'browser', label: 'Free (Browser)', description: 'Free, quality varies by device' },
];

// Quality options
export const QUALITY_OPTIONS = [
  { value: 'standard', label: 'Standard', description: 'Good quality, lower cost' },
  { value: 'high', label: 'High Quality', description: 'Premium quality, higher cost' },
];

// Default TTS preferences
export const DEFAULT_TTS_PREFERENCES = {
  voice: 'alloy' as const,
  speed: 1.0,
  method: 'auto' as const,
  quality: 'standard' as const,
  autoPlay: false,
  playOnStepChange: false,
  includeStepNumbers: true,
  includeEncouragement: true,
  cacheAudio: true,
}; 