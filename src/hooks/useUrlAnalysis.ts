import { useMemo } from 'react';
import { urlAnalysisService, UrlAnalysis } from '@/services/UrlAnalysisService';

export const useUrlAnalysis = (url: string | undefined): UrlAnalysis & { isValid: boolean } => {
  return useMemo(() => {
    if (!url || url.trim() === '') {
      return {
        domain: '',
        suggestedCountry: null,
        category: null,
        categoryPrompts: undefined,
        isValid: false
      };
    }

    try {
      // Basic URL validation
      new URL(url);
      const analysis = urlAnalysisService.analyzeUrl(url);
      
      return {
        ...analysis,
        isValid: true
      };
    } catch (error) {
      // Invalid URL
      return {
        domain: '',
        suggestedCountry: null,
        category: null,
        categoryPrompts: undefined,
        isValid: false
      };
    }
  }, [url]);
};

export const useUrlAutoDetection = (url: string | undefined) => {
  const analysis = useUrlAnalysis(url);
  
  return {
    ...analysis,
    shouldAutoSetCountry: analysis.isValid && analysis.suggestedCountry !== null,
    shouldAutoSetPlaceholder: analysis.isValid && analysis.categoryPrompts !== undefined,
    notesPlaceholder: analysis.categoryPrompts?.notesPlaceholder || 'Color, size, model, or any special requirements...',
    tips: analysis.categoryPrompts?.tips || []
  };
};