/**
 * AI Product Classifier Service - Cloudflare Workers AI Integration
 * 
 * This service provides intelligent product classification using Cloudflare Workers AI,
 * specifically designed for iwishBag's international e-commerce platform.
 * 
 * Features:
 * - Automatic HSN code detection for Indian customs
 * - Product category and subcategory classification
 * - Weight estimation for shipping calculations
 * - Tax implication analysis
 * - Shipping restriction identification
 * - Confidence scoring and manual review flags
 */

export interface ProductClassificationInput {
  productName: string;
  productUrl?: string;
  productDescription?: string;
  category?: string;
  originCountry: string;
  destinationCountry: string;
  imageUrl?: string;
}

export interface ProductClassificationResult {
  success: boolean;
  confidence: number;
  neuronsUsed: number;
  responseTime: number;
  
  // Product identification
  product_name: string;
  category: string;
  subcategory: string;
  
  // Tax and customs data
  hsn_code: string;
  customs_rate_percent: number;
  tax_implications: string;
  
  // Shipping data
  estimated_weight_kg: number;
  shipping_method: 'standard' | 'express' | 'restricted';
  restrictions: string[];
  
  // Quality control
  manual_review_needed: boolean;
  warnings: string[];
  suggestions: string[];
  
  // Metadata
  classification_timestamp: string;
  ai_model_used: string;
  fallback_reason?: string;
}

interface HSNCodeData {
  code: string;
  description: string;
  customs_rate: number;
  gst_rate: number;
  category: string;
  common_products: string[];
}

export class AIProductClassifierService {
  private static instance: AIProductClassifierService;
  
  // Cloudflare configuration
  private readonly cloudflareConfig = {
    accountId: import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID || '610762493d34333f1a6d72a037b345cf',
    apiToken: import.meta.env.VITE_CLOUDFLARE_API_TOKEN || '4Y_WjuGIEtTpK85hmE6XrGwbi85d8zN5Me0T_45l',
    aiModel: '@cf/meta/llama-3.1-8b-instruct'
  };
  
  // HSN code database (subset for demo - in production would be more comprehensive)
  private readonly hsnDatabase: HSNCodeData[] = [
    {
      code: '8517',
      description: 'Telephone sets, smartphones, cellular network apparatus',
      customs_rate: 20,
      gst_rate: 18,
      category: 'Electronics',
      common_products: ['phone', 'smartphone', 'iphone', 'android', 'mobile', 'cellular']
    },
    {
      code: '8471',
      description: 'Automatic data processing machines, computers',
      customs_rate: 15,
      gst_rate: 18,
      category: 'Electronics',
      common_products: ['laptop', 'computer', 'macbook', 'desktop', 'pc', 'notebook']
    },
    {
      code: '8518',
      description: 'Microphones, loudspeakers, headphones, audio equipment',
      customs_rate: 15,
      gst_rate: 18,  
      category: 'Electronics',
      common_products: ['headphone', 'earphone', 'speaker', 'microphone', 'audio', 'sound']
    },
    {
      code: '6204',
      description: 'Women\'s suits, ensembles, jackets, dresses, skirts',
      customs_rate: 5,
      gst_rate: 12,
      category: 'Textiles',
      common_products: ['kurta', 'dress', 'women', 'skirt', 'blouse', 'top', 'suit']
    },
    {
      code: '6203',
      description: 'Men\'s suits, ensembles, jackets, trousers',
      customs_rate: 5,
      gst_rate: 12,
      category: 'Textiles', 
      common_products: ['jeans', 'pants', 'trouser', 'men', 'shirt', 'jacket']
    },
    {
      code: '6404',
      description: 'Footwear with outer soles of rubber, plastic, leather',
      customs_rate: 25,
      gst_rate: 18,
      category: 'Footwear',
      common_products: ['shoes', 'sneaker', 'boot', 'sandal', 'footwear', 'nike', 'adidas']
    },
    {
      code: '4901',
      description: 'Printed books, brochures, leaflets',
      customs_rate: 0,
      gst_rate: 0,
      category: 'Books',
      common_products: ['book', 'novel', 'textbook', 'manual', 'guide', 'literature']
    },
    {
      code: '7323',
      description: 'Table, kitchen or other household articles of iron or steel',
      customs_rate: 15,
      gst_rate: 18,
      category: 'Kitchenware',
      common_products: ['kitchen', 'knife', 'cookware', 'utensil', 'pot', 'pan']
    },
    {
      code: '8525',
      description: 'Transmission apparatus for radio-broadcasting, television, drones',
      customs_rate: 25,
      gst_rate: 18,
      category: 'Electronics',
      common_products: ['drone', 'uav', 'quadcopter', 'dji', 'camera drone', 'aerial']
    },
    {
      code: '9207',
      description: 'Musical instruments; parts thereof',
      customs_rate: 10,
      gst_rate: 18,
      category: 'Musical Instruments',
      common_products: ['keyboard', 'piano', 'guitar', 'violin', 'drum', 'musical', 'yamaha', 'casio', 'instrument']
    },
    {
      code: '9999',
      description: 'General/Unclassified items',
      customs_rate: 10,
      gst_rate: 18,
      category: 'General',
      common_products: ['general', 'misc', 'other', 'unclassified']
    }
  ];
  
  private constructor() {}
  
  static getInstance(): AIProductClassifierService {
    if (!AIProductClassifierService.instance) {
      AIProductClassifierService.instance = new AIProductClassifierService();
    }
    return AIProductClassifierService.instance;
  }
  
  /**
   * Main classification method using Cloudflare Workers AI
   */
  async classifyProduct(input: ProductClassificationInput): Promise<ProductClassificationResult> {
    const startTime = performance.now();
    
    try {
      console.log('[AI Classifier] Starting classification:', {
        product: input.productName,
        route: `${input.originCountry} → ${input.destinationCountry}`
      });
      
      // First try AI classification
      let aiResult: ProductClassificationResult | null = null;
      
      try {
        aiResult = await this.callCloudflareAI(input);
      } catch (aiError) {
        console.warn('[AI Classifier] AI call failed, using fallback:', aiError);
      }
      
      // If AI fails or confidence is too low, use rule-based fallback
      if (!aiResult || aiResult.confidence < 0.5) {
        console.log('[AI Classifier] Using rule-based fallback classification');
        aiResult = this.fallbackClassification(input);
        aiResult.fallback_reason = 'AI confidence too low or service unavailable';
      }
      
      // Enhance with HSN database lookup
      const enhancedResult = this.enhanceWithHSNData(aiResult, input);
      
      // Calculate final response time
      enhancedResult.responseTime = performance.now() - startTime;
      
      console.log('[AI Classifier] Classification completed:', {
        success: enhancedResult.success,
        confidence: enhancedResult.confidence,
        hsn_code: enhancedResult.hsn_code,
        category: enhancedResult.category,
        responseTime: enhancedResult.responseTime
      });
      
      return enhancedResult;
      
    } catch (error) {
      console.error('[AI Classifier] Classification failed:', error);
      
      return {
        success: false,
        confidence: 0,
        neuronsUsed: 0,
        responseTime: performance.now() - startTime,
        product_name: input.productName,
        category: 'Error',
        subcategory: 'Classification Failed',
        hsn_code: '9999',
        customs_rate_percent: 10,
        tax_implications: 'Unable to determine - manual review required',
        estimated_weight_kg: 0.5,
        shipping_method: 'standard',
        restrictions: ['Classification failed - verify manually'],
        manual_review_needed: true,
        warnings: [`Classification error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        suggestions: ['Please verify product details manually', 'Consider using more specific product description'],
        classification_timestamp: new Date().toISOString(),
        ai_model_used: 'fallback',
        fallback_reason: 'Classification service error'
      };
    }
  }
  
  /**
   * Call Cloudflare Workers AI for classification
   */
  private async callCloudflareAI(input: ProductClassificationInput): Promise<ProductClassificationResult> {
    const prompt = this.buildClassificationPrompt(input);
    
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.cloudflareConfig.accountId}/ai/run/${this.cloudflareConfig.aiModel}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.cloudflareConfig.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are an expert product classifier for international e-commerce. Analyze products and provide accurate HSN codes, categories, and shipping information for customs and tax calculations.'
            },
            {
              role: 'user', 
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.1 // Low temperature for consistent, factual responses
        }),
      },
    );
    
    if (!response.ok) {
      throw new Error(`Cloudflare AI API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`AI classification failed: ${JSON.stringify(result.errors)}`);
    }
    
    // Parse AI response
    const aiText = result.result.response;
    const parsedResult = this.parseAIResponse(aiText, input);
    
    // Estimate neurons used (approximate based on prompt/response length)
    const neuronsUsed = Math.floor((prompt.length + aiText.length) / 10) + 50;
    
    return {
      ...parsedResult,
      neuronsUsed,
      ai_model_used: this.cloudflareConfig.aiModel,
      classification_timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Build classification prompt for AI
   */
  private buildClassificationPrompt(input: ProductClassificationInput): string {
    return `
Analyze this product for international shipping from ${input.originCountry} to ${input.destinationCountry}:

Product Name: ${input.productName}
${input.productUrl ? `Product URL: ${input.productUrl}` : ''}
${input.productDescription ? `Description: ${input.productDescription}` : ''}
${input.category ? `Suggested Category: ${input.category}` : ''}

Please provide a JSON response with the following structure:
{
  "hsn_code": "4-6 digit Indian HSN classification code",
  "category": "primary product category",
  "subcategory": "specific subcategory",
  "estimated_weight_kg": "estimated weight in kilograms (number)",
  "shipping_method": "standard/express/restricted",
  "customs_rate_percent": "estimated customs duty percentage (number)",
  "tax_implications": "description of GST/VAT and customs implications",
  "restrictions": ["array of shipping or import restrictions"],
  "confidence": "confidence score from 0.0 to 1.0 (number)",
  "manual_review_needed": "true/false if low confidence or complex regulations (boolean)"
}

Focus on accuracy for HSN codes commonly used in Indian customs. Consider product weight, shipping restrictions, and tax implications for the specified route.
`;
  }
  
  /**
   * Parse AI response text into structured result
   */
  private parseAIResponse(aiText: string, input: ProductClassificationInput): Omit<ProductClassificationResult, 'neuronsUsed' | 'responseTime' | 'ai_model_used' | 'classification_timestamp'> {
    try {
      // Try to extract JSON from AI response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        success: true,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.7)),
        product_name: input.productName,
        category: parsed.category || 'General',
        subcategory: parsed.subcategory || 'Miscellaneous',
        hsn_code: parsed.hsn_code || '9999',
        customs_rate_percent: parsed.customs_rate_percent || 10,
        tax_implications: parsed.tax_implications || 'Standard rates apply',
        estimated_weight_kg: parsed.estimated_weight_kg || 0.5,
        shipping_method: parsed.shipping_method || 'standard',
        restrictions: Array.isArray(parsed.restrictions) ? parsed.restrictions : [],
        manual_review_needed: parsed.manual_review_needed || false,
        warnings: [],
        suggestions: []
      };
      
    } catch (error) {
      console.warn('[AI Classifier] Failed to parse AI response, using fallback:', error);
      return this.fallbackClassification(input);
    }
  }
  
  /**
   * Rule-based fallback classification when AI is unavailable
   */
  private fallbackClassification(input: ProductClassificationInput): Omit<ProductClassificationResult, 'neuronsUsed' | 'responseTime' | 'ai_model_used' | 'classification_timestamp'> {
    const productLower = input.productName.toLowerCase();
    
    // Find matching HSN code using keyword matching
    let matchedHSN = this.hsnDatabase.find(hsn => 
      hsn.common_products.some(keyword => productLower.includes(keyword))
    );
    
    // Default to general classification if no match
    if (!matchedHSN) {
      matchedHSN = this.hsnDatabase.find(hsn => hsn.code === '9999')!;
    }
    
    // Determine shipping method based on category
    let shippingMethod: 'standard' | 'express' | 'restricted' = 'standard';
    let restrictions: string[] = [];
    
    if (matchedHSN.category === 'Electronics') {
      if (productLower.includes('drone')) {
        shippingMethod = 'restricted';
        restrictions = ['Requires import permit', 'Battery restrictions', 'Aviation regulations apply'];
      } else if (productLower.includes('battery') || productLower.includes('lithium')) {
        restrictions = ['Lithium battery shipping restrictions'];
      }
    }
    
    if (productLower.includes('knife') || productLower.includes('blade')) {
      restrictions.push('Sharp object shipping restrictions');
    }
    
    // Estimate weight based on category
    let estimatedWeight = 0.5; // Default
    if (matchedHSN.category === 'Electronics') {
      if (productLower.includes('phone')) estimatedWeight = 0.2;
      else if (productLower.includes('laptop')) estimatedWeight = 1.5;
      else if (productLower.includes('drone')) estimatedWeight = 1.0;
      else estimatedWeight = 0.3;
    } else if (matchedHSN.category === 'Textiles') {
      estimatedWeight = 0.4;
    } else if (matchedHSN.category === 'Footwear') {
      estimatedWeight = 0.8;
    } else if (matchedHSN.category === 'Books') {
      estimatedWeight = 0.3;
    } else if (matchedHSN.category === 'Kitchenware') {
      estimatedWeight = 1.2;
    }
    
    const confidence = matchedHSN.code === '9999' ? 0.6 : 0.8;
    
    return {
      success: true,
      confidence,
      product_name: input.productName,
      category: matchedHSN.category,
      subcategory: matchedHSN.description.split(',')[0],
      hsn_code: matchedHSN.code,
      customs_rate_percent: matchedHSN.customs_rate,
      tax_implications: `${matchedHSN.gst_rate}% GST + ${matchedHSN.customs_rate}% Customs Duty applicable`,
      estimated_weight_kg: estimatedWeight,
      shipping_method: shippingMethod,
      restrictions,
      manual_review_needed: confidence < 0.7 || restrictions.length > 1,
      warnings: matchedHSN.code === '9999' ? ['Used fallback classification - consider manual review'] : [],
      suggestions: confidence < 0.8 ? ['Consider providing more specific product details'] : []
    };
  }
  
  /**
   * Enhance classification result with HSN database data
   */
  private enhanceWithHSNData(result: Omit<ProductClassificationResult, 'neuronsUsed' | 'responseTime' | 'ai_model_used' | 'classification_timestamp'>, input: ProductClassificationInput): Omit<ProductClassificationResult, 'neuronsUsed' | 'responseTime' | 'ai_model_used' | 'classification_timestamp'> {
    const hsnData = this.hsnDatabase.find(hsn => hsn.code === result.hsn_code);
    
    if (hsnData) {
      // Validate and correct rates using database
      if (Math.abs(result.customs_rate_percent - hsnData.customs_rate) > 5) {
        result.warnings.push(`Customs rate adjusted from ${result.customs_rate_percent}% to ${hsnData.customs_rate}% based on HSN database`);
        result.customs_rate_percent = hsnData.customs_rate;
      }
      
      // Update tax implications with accurate rates
      result.tax_implications = `${hsnData.gst_rate}% GST + ${hsnData.customs_rate}% Customs Duty applicable`;
      
      // Add category validation
      if (result.category !== hsnData.category && hsnData.code !== '9999') {
        result.warnings.push(`Category corrected from ${result.category} to ${hsnData.category} based on HSN code`);
        result.category = hsnData.category;
      }
    } else {
      result.warnings.push(`HSN code ${result.hsn_code} not found in database - rates may be estimates`);
      result.manual_review_needed = true;
    }
    
    // Add route-specific considerations
    if (input.destinationCountry === 'NP') {
      result.suggestions.push('Nepal import: Consider local agent requirements');
    }
    
    if (input.originCountry === 'CN' && result.category === 'Electronics') {
      result.suggestions.push('China origin: Verify BIS certification requirements');
    }
    
    return result;
  }
  
  /**
   * Get available HSN codes for reference
   */
  getAvailableHSNCodes(): HSNCodeData[] {
    return [...this.hsnDatabase];
  }
  
  /**
   * Batch classify multiple products
   */
  async batchClassify(inputs: ProductClassificationInput[]): Promise<ProductClassificationResult[]> {
    const results: ProductClassificationResult[] = [];
    
    // Process in batches of 5 to avoid rate limits
    for (let i = 0; i < inputs.length; i += 5) {
      const batch = inputs.slice(i, i + 5);
      const batchPromises = batch.map(input => this.classifyProduct(input));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to respect rate limits
      if (i + 5 < inputs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
  
  /**
   * Get classification statistics
   */
  getClassificationStats(results: ProductClassificationResult[]) {
    const successful = results.filter(r => r.success);
    const avgConfidence = successful.reduce((sum, r) => sum + r.confidence, 0) / successful.length || 0;
    const avgResponseTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length || 0;
    const totalNeurons = successful.reduce((sum, r) => sum + r.neuronsUsed, 0);
    const manualReviewNeeded = successful.filter(r => r.manual_review_needed).length;
    
    return {
      total: results.length,
      successful: successful.length,
      failed: results.length - successful.length,
      avgConfidence: Number(avgConfidence.toFixed(3)),
      avgResponseTime: Number(avgResponseTime.toFixed(0)),
      totalNeurons,
      estimatedCost: (totalNeurons * 0.011 / 1000).toFixed(4),
      manualReviewNeeded,
      successRate: Number((successful.length / results.length * 100).toFixed(1))
    };
  }
}

// Export singleton instance
export const aiProductClassifierService = AIProductClassifierService.getInstance();