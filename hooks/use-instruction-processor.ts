import { useState, useCallback } from 'react';
import {
  processInstructions,
  ProcessInstructionsRequest,
  ApiResponse,
  ProcessedInstructions,
  createLoadingState,
  LoadingState,
} from '../lib/api-client';

export interface UseInstructionProcessorReturn {
  // State
  loadingState: LoadingState;
  processedInstructions: ProcessedInstructions | null;
  
  // Actions
  processInstructions: (request: ProcessInstructionsRequest) => Promise<void>;
  reset: () => void;
  clearError: () => void;
}

export function useInstructionProcessor(): UseInstructionProcessorReturn {
  const [loadingState, setLoadingState] = useState<LoadingState>(createLoadingState());
  const [processedInstructions, setProcessedInstructions] = useState<ProcessedInstructions | null>(null);

  const processInstructionsHandler = useCallback(async (request: ProcessInstructionsRequest) => {
    setLoadingState({ isLoading: true, error: null });
    
    try {
      const response: ApiResponse = await processInstructions(request);
      
      if (response.success && response.processedInstructions) {
        setProcessedInstructions(response.processedInstructions);
        setLoadingState({ isLoading: false, error: null });
      } else {
        throw new Error(response.error || 'Failed to process instructions');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setLoadingState({ isLoading: false, error: errorMessage });
      setProcessedInstructions(null);
    }
  }, []);

  const reset = useCallback(() => {
    setLoadingState(createLoadingState());
    setProcessedInstructions(null);
  }, []);

  const clearError = useCallback(() => {
    setLoadingState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    loadingState,
    processedInstructions,
    processInstructions: processInstructionsHandler,
    reset,
    clearError,
  };
} 