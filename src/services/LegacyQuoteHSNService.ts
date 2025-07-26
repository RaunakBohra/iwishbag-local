// ============================================================================
// LEGACY QUOTE HSN SERVICE - Auto-classify existing quotes without HSN data
// Provides AI-powered HSN classification for quotes created before HSN system
// ============================================================================

import { supabase } from '@/integrations/supabase/client';

interface HSNCategory {
  value: string;
  label: string;
  hsnCode: string;
  keywords: string[];
}

const HSN_CATEGORIES: HSNCategory[] = [
  {
    value: 'electronics',
    label: 'Electronics & Technology',
    hsnCode: '8517',
    keywords: [
      'phone',
      'mobile',
      'laptop',
      'computer',
      'headphone',
      'speaker',
      'camera',
      'tablet',
      'electronic',
      'iphone',
      'samsung',
      'sony',
    ],
  },
  {
    value: 'clothing',
    label: 'Clothing & Textiles',
    hsnCode: '6204',
    keywords: [
      'shirt',
      't-shirt',
      'dress',
      'kurta',
      'jeans',
      'jacket',
      'clothing',
      'apparel',
      'fashion',
      'cloth',
      'wear',
      'garment',
    ],
  },
  {
    value: 'books',
    label: 'Books & Educational Materials',
    hsnCode: '4901',
    keywords: [
      'book',
      'textbook',
      'manual',
      'guide',
      'educational',
      'learning',
      'study',
      'novel',
      'magazine',
    ],
  },
  {
    value: 'toys',
    label: 'Toys & Games',
    hsnCode: '9503',
    keywords: [
      'toy',
      'game',
      'puzzle',
      'doll',
      'action',
      'figure',
      'lego',
      'board game',
      'playing',
    ],
  },
  {
    value: 'cosmetics',
    label: 'Cosmetics & Personal Care',
    hsnCode: '3304',
    keywords: ['makeup', 'cream', 'lotion', 'shampoo', 'soap', 'skincare', 'beauty', 'cosmetic'],
  },
  {
    value: 'jewelry',
    label: 'Jewelry & Accessories',
    hsnCode: '7113',
    keywords: ['ring', 'necklace', 'bracelet', 'earring', 'watch', 'jewelry', 'accessory', 'jewel'],
  },
  {
    value: 'sports',
    label: 'Sports & Fitness',
    hsnCode: '9506',
    keywords: ['fitness', 'gym', 'sport', 'exercise', 'yoga', 'running', 'workout', 'athletic'],
  },
  {
    value: 'home',
    label: 'Home & Kitchen',
    hsnCode: '7323',
    keywords: ['kitchen', 'home', 'furniture', 'decor', 'utensil', 'cookware', 'household'],
  },
  {
    value: 'automotive',
    label: 'Automotive & Parts',
    hsnCode: '8708',
    keywords: ['car', 'auto', 'vehicle', 'bike', 'motorcycle', 'spare', 'part', 'automotive'],
  },
  {
    value: 'health',
    label: 'Health & Medical',
    hsnCode: '3004',
    keywords: ['medicine', 'supplement', 'medical', 'health', 'vitamin', 'drug', 'pharmacy'],
  },
];

interface ClassificationResult {
  itemId: string;
  itemName: string;
  suggestedCategory: string | null;
  suggestedHSNCode: string | null;
  suggestedLabel: string;
  confidence: 'high' | 'medium' | 'low';
  matchedKeywords: string[];
}

export class LegacyQuoteHSNService {
  /**
   * Analyze a quote item and suggest HSN classification
   */
  static classifyItem(item: any): ClassificationResult {
    const itemName = (item.name || '').toLowerCase().trim();

    if (!itemName || itemName.length < 2) {
      return {
        itemId: item.id,
        itemName: item.name,
        suggestedCategory: null,
        suggestedHSNCode: null,
        suggestedLabel: 'Unable to classify',
        confidence: 'low',
        matchedKeywords: [],
      };
    }

    let bestMatch: HSNCategory | null = null;
    let bestScore = 0;
    let matchedKeywords: string[] = [];

    // Find best matching category based on keyword matches
    for (const category of HSN_CATEGORIES) {
      const matches = category.keywords.filter((keyword) =>
        itemName.includes(keyword.toLowerCase()),
      );

      if (matches.length > bestScore) {
        bestScore = matches.length;
        bestMatch = category;
        matchedKeywords = matches;
      }
    }

    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (bestScore >= 2) confidence = 'high';
    else if (bestScore === 1) confidence = 'medium';

    return {
      itemId: item.id,
      itemName: item.name,
      suggestedCategory: bestMatch?.value || null,
      suggestedHSNCode: bestMatch?.hsnCode || null,
      suggestedLabel: bestMatch?.label || 'Unknown category',
      confidence,
      matchedKeywords,
    };
  }

  /**
   * Analyze all items in a quote and provide classification suggestions
   */
  static analyzeQuote(quote: any): ClassificationResult[] {
    if (!quote.items || !Array.isArray(quote.items)) {
      return [];
    }

    return quote.items.map((item) => this.classifyItem(item));
  }

  /**
   * Apply HSN classification to a quote (updates the database)
   */
  static async applyClassificationToQuote(
    quoteId: string,
    classifications: ClassificationResult[],
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current quote data
      const { data: quote, error: fetchError } = await supabase
        .from('quotes')
        .select('items')
        .eq('id', quoteId)
        .single();

      if (fetchError || !quote) {
        return { success: false, error: 'Quote not found' };
      }

      // Update items with HSN data
      const updatedItems = quote.items.map((item: any) => {
        const classification = classifications.find((c) => c.itemId === item.id);

        if (classification && classification.suggestedCategory) {
          return {
            ...item,
            category: classification.suggestedCategory,
            hsn_code: classification.suggestedHSNCode,
            // Add metadata about the auto-classification
            hsn_auto_classified: true,
            hsn_classification_confidence: classification.confidence,
            hsn_matched_keywords: classification.matchedKeywords,
          };
        }

        return item;
      });

      // Update the quote in database
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          items: updatedItems,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quoteId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get stats about legacy quotes that need HSN classification
   */
  static async getLegacyQuoteStats(): Promise<{
    totalQuotes: number;
    quotesNeedingClassification: number;
    itemsNeedingClassification: number;
  }> {
    try {
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('id, items')
        .not('items', 'is', null);

      if (error || !quotes) {
        return { totalQuotes: 0, quotesNeedingClassification: 0, itemsNeedingClassification: 0 };
      }

      let quotesNeedingClassification = 0;
      let itemsNeedingClassification = 0;

      for (const quote of quotes) {
        if (quote.items && Array.isArray(quote.items)) {
          const unclassifiedItems = quote.items.filter((item) => !item.hsn_code || !item.category);

          if (unclassifiedItems.length > 0) {
            quotesNeedingClassification++;
            itemsNeedingClassification += unclassifiedItems.length;
          }
        }
      }

      return {
        totalQuotes: quotes.length,
        quotesNeedingClassification,
        itemsNeedingClassification,
      };
    } catch (error) {
      console.error('Error getting legacy quote stats:', error);
      return { totalQuotes: 0, quotesNeedingClassification: 0, itemsNeedingClassification: 0 };
    }
  }
}

export default LegacyQuoteHSNService;
