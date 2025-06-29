// API Client for frontend-backend communication

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export interface ProcessInstructionsRequest {
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

export interface ProcessedStep {
  stepNumber: number;
  instruction: string;
  estimatedTime: string;
  tips?: string;
}

export interface ProcessedInstructions {
  title: string;
  category: string;
  difficulty: string;
  totalTime: string;
  ingredients: string[];
  tools: string[];
  warnings: string[];
  steps: ProcessedStep[];
}

export interface ApiResponse {
  success: boolean;
  processedInstructions?: ProcessedInstructions;
  error?: string;
  code?: string;
  details?: string;
}

// Generic API call function
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}/api${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Instruction Processing API
export async function processInstructions(
  request: ProcessInstructionsRequest
): Promise<ApiResponse> {
  return apiCall<ApiResponse>('/process-instructions', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// Fetch from Link API
export interface FetchFromLinkRequest {
  url: string;
}

export interface FetchFromLinkResponse {
  content?: string;
  error?: string;
}

export async function fetchFromLink(
  request: FetchFromLinkRequest
): Promise<FetchFromLinkResponse> {
  return apiCall<FetchFromLinkResponse>('/fetch-from-link', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// Chat API (for future implementation)
export interface ChatRequest {
  message: string;
  context?: string;
  instructionId?: string;
}

export interface ChatResponse {
  response: string;
  error?: string;
}

export async function sendChatMessage(
  request: ChatRequest
): Promise<ChatResponse> {
  return apiCall<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// Error handling utility
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Loading state management
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export const createLoadingState = (): LoadingState => ({
  isLoading: false,
  error: null,
}); 