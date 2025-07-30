

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
  
  // description: 'Telephone sets, smartphones, cellular network apparatus',
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