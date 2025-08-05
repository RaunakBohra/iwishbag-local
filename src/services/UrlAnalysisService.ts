/**
 * URL Analysis Service
 * Provides intelligent URL parsing, country detection, and category identification
 */

export interface UrlAnalysis {
  domain: string;
  suggestedCountry: string | null;
  category: ProductCategory | null;
  alternativeDomain?: string;
  categoryPrompts?: CategoryPrompts;
}

export interface CategoryPrompts {
  notesPlaceholder: string;
  tips: string[];
}

export type ProductCategory = 
  | 'fashion'
  | 'electronics'
  | 'footwear'
  | 'books'
  | 'home'
  | 'beauty'
  | 'sports'
  | 'general';

// Domain to country mapping
const DOMAIN_COUNTRY_MAP: Record<string, string> = {
  // Amazon domains
  'amazon.com': 'US',
  'amazon.in': 'IN',
  'amazon.co.uk': 'GB',
  'amazon.ca': 'CA',
  'amazon.de': 'DE',
  'amazon.fr': 'FR',
  'amazon.es': 'ES',
  'amazon.it': 'IT',
  'amazon.co.jp': 'JP',
  'amazon.com.au': 'AU',
  'amazon.ae': 'AE',
  'amazon.sa': 'SA',
  'amazon.com.br': 'BR',
  'amazon.com.mx': 'MX',
  'amazon.sg': 'SG',
  'amazon.nl': 'NL',
  
  // eBay domains
  'ebay.com': 'US',
  'ebay.co.uk': 'GB',
  'ebay.de': 'DE',
  'ebay.ca': 'CA',
  'ebay.com.au': 'AU',
  'ebay.fr': 'FR',
  'ebay.it': 'IT',
  'ebay.es': 'ES',
  'ebay.in': 'IN',
  
  // Regional marketplaces
  'flipkart.com': 'IN',
  'myntra.com': 'IN',
  'ajio.com': 'IN',
  'alibaba.com': 'CN',
  'aliexpress.com': 'CN',
  'taobao.com': 'CN',
  'jd.com': 'CN',
  'walmart.com': 'US',
  'walmart.ca': 'CA',
  'target.com': 'US',
  'bestbuy.com': 'US',
  'bestbuy.ca': 'CA',
  'costco.com': 'US',
  'etsy.com': 'US',
  'newegg.com': 'US',
  
  // Fashion brands
  'zara.com': 'ES',
  'hm.com': 'SE',
  'uniqlo.com': 'JP',
  'nike.com': 'US',
  'adidas.com': 'DE',
  'puma.com': 'DE',
  'reebok.com': 'US',
  'underarmour.com': 'US',
  'forever21.com': 'US',
  'gap.com': 'US',
  'oldnavy.com': 'US',
  'asos.com': 'GB',
  'boohoo.com': 'GB',
  'shein.com': 'CN',
  
  // Electronics
  'apple.com': 'US',
  'samsung.com': 'KR',
  'sony.com': 'JP',
  'lg.com': 'KR',
  'dell.com': 'US',
  'hp.com': 'US',
  'lenovo.com': 'CN',
  'asus.com': 'TW',
  
  // Southeast Asia
  'shopee.sg': 'SG',
  'shopee.co.id': 'ID',
  'shopee.co.th': 'TH',
  'shopee.ph': 'PH',
  'shopee.vn': 'VN',
  'shopee.my': 'MY',
  'lazada.sg': 'SG',
  'lazada.co.id': 'ID',
  'lazada.co.th': 'TH',
  'lazada.com.ph': 'PH',
  'lazada.vn': 'VN',
  'lazada.com.my': 'MY',
};

// Category detection patterns
const CATEGORY_PATTERNS: Record<ProductCategory, { domains: string[], keywords: string[] }> = {
  fashion: {
    domains: ['myntra.com', 'ajio.com', 'zara.com', 'hm.com', 'uniqlo.com', 'forever21.com', 'gap.com', 'asos.com', 'boohoo.com', 'shein.com'],
    keywords: ['clothing', 'apparel', 'fashion', 'dress', 'shirt', 'pants', 'jeans', 'jacket']
  },
  footwear: {
    domains: ['nike.com', 'adidas.com', 'puma.com', 'reebok.com', 'underarmour.com'],
    keywords: ['shoes', 'sneakers', 'boots', 'sandals', 'footwear', 'trainers', 'running']
  },
  electronics: {
    domains: ['bestbuy.com', 'newegg.com', 'apple.com', 'samsung.com', 'sony.com', 'lg.com', 'dell.com', 'hp.com'],
    keywords: ['laptop', 'phone', 'tablet', 'computer', 'monitor', 'keyboard', 'mouse', 'headphones', 'camera', 'tv', 'television']
  },
  books: {
    domains: ['bookdepository.com', 'barnesandnoble.com'],
    keywords: ['book', 'novel', 'textbook', 'kindle', 'paperback', 'hardcover']
  },
  home: {
    domains: ['ikea.com', 'wayfair.com', 'homedepot.com', 'lowes.com'],
    keywords: ['furniture', 'decor', 'kitchen', 'bathroom', 'bedding', 'lighting']
  },
  beauty: {
    domains: ['sephora.com', 'ulta.com', 'nykaa.com'],
    keywords: ['makeup', 'cosmetics', 'skincare', 'perfume', 'beauty']
  },
  sports: {
    domains: ['decathlon.com', 'sportsdirect.com'],
    keywords: ['sports', 'fitness', 'gym', 'exercise', 'workout', 'yoga']
  },
  general: {
    domains: [],
    keywords: []
  }
};

// Category-specific prompts
const CATEGORY_PROMPTS: Record<ProductCategory, CategoryPrompts> = {
  fashion: {
    notesPlaceholder: 'Size, color, fit preference (e.g., M, Black, Slim fit)',
    tips: ['Specify exact size (S/M/L/XL)', 'Mention preferred color', 'Include fit type if applicable']
  },
  footwear: {
    notesPlaceholder: 'Size (US/UK/EU), color, width (e.g., US 10, Black, Regular)',
    tips: ['Include size system (US/UK/EU)', 'Specify width if needed', 'Mention color preference']
  },
  electronics: {
    notesPlaceholder: 'Model, storage, color (e.g., 256GB, Space Gray, WiFi only)',
    tips: ['Specify exact model number', 'Include storage capacity', 'Mention color if multiple options']
  },
  books: {
    notesPlaceholder: 'Edition, format preference (e.g., Latest edition, Hardcover)',
    tips: ['Specify edition if important', 'Choose format (hardcover/paperback)', 'Include ISBN if known']
  },
  home: {
    notesPlaceholder: 'Color, size, material preference (e.g., White, Queen size, Cotton)',
    tips: ['Specify dimensions/size', 'Mention color preference', 'Include material if options exist']
  },
  beauty: {
    notesPlaceholder: 'Shade, size, type (e.g., Shade 02, 50ml, Dry skin)',
    tips: ['Include shade/color number', 'Specify size/volume', 'Mention skin type if relevant']
  },
  sports: {
    notesPlaceholder: 'Size, color, specific model (e.g., L, Blue, Pro version)',
    tips: ['Include size for apparel', 'Specify model variations', 'Mention color preference']
  },
  general: {
    notesPlaceholder: 'Size, color, variant, or any specific requirements',
    tips: ['Add any specific details', 'Include variant information', 'Mention special requirements']
  }
};

// Alternative domain suggestions
const DOMAIN_ALTERNATIVES: Record<string, Record<string, string>> = {
  'amazon.com': {
    'IN': 'amazon.in',
    'GB': 'amazon.co.uk',
    'CA': 'amazon.ca',
    'DE': 'amazon.de',
    'JP': 'amazon.co.jp'
  },
  'ebay.com': {
    'GB': 'ebay.co.uk',
    'DE': 'ebay.de',
    'CA': 'ebay.ca',
    'AU': 'ebay.com.au',
    'IN': 'ebay.in'
  }
};

class UrlAnalysisService {
  /**
   * Analyze a URL to extract domain, suggested country, and category
   */
  analyzeUrl(url: string): UrlAnalysis {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '').toLowerCase();
      
      // Enhanced country detection with URL pattern analysis
      let suggestedCountry = this.detectCountryFromUrl(url, domain);
      
      // Fallback to domain mapping if URL pattern detection fails
      if (!suggestedCountry) {
        suggestedCountry = DOMAIN_COUNTRY_MAP[domain] || null;
      }
      
      // Detect category
      const category = this.detectCategory(url, domain);
      
      // Get category-specific prompts
      const categoryPrompts = category ? CATEGORY_PROMPTS[category] : undefined;
      
      return {
        domain,
        suggestedCountry,
        category,
        categoryPrompts
      };
    } catch (error) {
      // Invalid URL
      return {
        domain: '',
        suggestedCountry: null,
        category: null
      };
    }
  }

  /**
   * Enhanced country detection from URL patterns
   */
  private detectCountryFromUrl(url: string, domain: string): string | null {
    const urlLower = url.toLowerCase();

    // H&M country detection (pattern: en_{country_code})
    if (domain.includes('hm.com')) {
      // Primary pattern: /en_{country_code}/ (e.g., /en_in/, /en_us/, /en_gb/)
      const hmCountryMatch = urlLower.match(/\/en_([a-z]{2})/);
      if (hmCountryMatch) {
        return hmCountryMatch[1].toUpperCase();
      }
      
      // Alternative pattern for non-English locales (e.g., /de_de/, /fr_fr/)
      const hmLocaleMatch = urlLower.match(/\/([a-z]{2})_([a-z]{2})/);
      if (hmLocaleMatch) {
        return hmLocaleMatch[2].toUpperCase(); // Return country code (second part)
      }
      
      // Default to Sweden if no pattern matches (H&M headquarters)
      return 'SE';
    }

    // ASOS country detection (pattern: /country-code/)
    if (domain.includes('asos.com')) {
      // ASOS URLs like: https://www.asos.com/us/, https://www.asos.com/fr/, etc.
      const asosCountryMatch = urlLower.match(/asos\.com\/([a-z]{2})\//);
      if (asosCountryMatch) {
        return asosCountryMatch[1].toUpperCase();
      }
      
      // Fallback patterns for ASOS regional URLs
      if (urlLower.includes('/us/')) return 'US';
      if (urlLower.includes('/gb/')) return 'GB';
      if (urlLower.includes('/fr/')) return 'FR';
      if (urlLower.includes('/de/')) return 'DE';
      if (urlLower.includes('/es/')) return 'ES';
      if (urlLower.includes('/it/')) return 'IT';
      if (urlLower.includes('/au/')) return 'AU';
      if (urlLower.includes('/ca/')) return 'CA';
      if (urlLower.includes('/nl/')) return 'NL';
      if (urlLower.includes('/se/')) return 'SE';
      if (urlLower.includes('/dk/')) return 'DK';
      return 'GB'; // ASOS default (UK-based company)
    }

    // Amazon country detection (existing logic from BrightDataProductService)
    if (domain.includes('amazon.')) {
      // Amazon regional patterns like /dp/, /gp/product/, etc.
      const domainParts = domain.split('.');
      const tld = domainParts[domainParts.length - 1];
      
      // Map common Amazon TLDs to countries
      const amazonTldMap: Record<string, string> = {
        'com': 'US',
        'co.uk': 'GB', 
        'ca': 'CA',
        'de': 'DE',
        'fr': 'FR',
        'es': 'ES',
        'it': 'IT',
        'co.jp': 'JP',
        'in': 'IN',
        'com.au': 'AU',
        'ae': 'AE',
        'sa': 'SA',
        'com.br': 'BR',
        'com.mx': 'MX',
        'sg': 'SG',
        'nl': 'NL'
      };

      // Handle multi-part TLDs
      const fullTld = domainParts.slice(1).join('.');
      if (amazonTldMap[fullTld]) {
        return amazonTldMap[fullTld];
      }
      if (amazonTldMap[tld]) {
        return amazonTldMap[tld];
      }
    }

    // Future: Add other platform-specific URL pattern detection here
    // e.g., Zara, Nike, Adidas regional URL patterns
    
    return null;
  }
  
  /**
   * Get alternative domain suggestion for a different country
   */
  getAlternativeDomain(currentDomain: string, targetCountry: string): string | null {
    const baseDomain = currentDomain.replace('www.', '').toLowerCase();
    const alternatives = DOMAIN_ALTERNATIVES[baseDomain];
    
    if (alternatives && alternatives[targetCountry]) {
      return alternatives[targetCountry];
    }
    
    // Check if it's an Amazon or eBay domain and suggest the right one
    if (baseDomain.includes('amazon.') && targetCountry === 'IN') {
      return 'amazon.in';
    }
    if (baseDomain.includes('amazon.') && targetCountry === 'US') {
      return 'amazon.com';
    }
    
    return null;
  }
  
  /**
   * Detect product category from URL and domain
   */
  private detectCategory(url: string, domain: string): ProductCategory | null {
    const lowerUrl = url.toLowerCase();
    
    // Check domain-based categories first
    for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
      if (patterns.domains.includes(domain)) {
        return category as ProductCategory;
      }
    }
    
    // Check URL keywords
    for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
      for (const keyword of patterns.keywords) {
        if (lowerUrl.includes(keyword)) {
          return category as ProductCategory;
        }
      }
    }
    
    // Special case: Amazon category detection
    if (domain.includes('amazon')) {
      if (lowerUrl.includes('/dp/b0') || lowerUrl.includes('electronics')) {
        return 'electronics';
      }
      if (lowerUrl.includes('clothing') || lowerUrl.includes('apparel')) {
        return 'fashion';
      }
      if (lowerUrl.includes('shoes') || lowerUrl.includes('footwear')) {
        return 'footwear';
      }
      if (lowerUrl.includes('books')) {
        return 'books';
      }
    }
    
    return 'general';
  }
  
  /**
   * Check if selected country matches the URL domain
   */
  checkCountryMatch(url: string, selectedCountry: string): {
    matches: boolean;
    suggestedCountry?: string;
    alternativeDomain?: string;
  } {
    const analysis = this.analyzeUrl(url);
    
    if (!analysis.suggestedCountry) {
      // Can't determine country from URL
      return { matches: true };
    }
    
    const matches = analysis.suggestedCountry === selectedCountry;
    
    if (!matches) {
      const alternativeDomain = this.getAlternativeDomain(analysis.domain, selectedCountry);
      
      return {
        matches: false,
        suggestedCountry: analysis.suggestedCountry,
        alternativeDomain
      };
    }
    
    return { matches: true };
  }
}

// Export singleton instance
export const urlAnalysisService = new UrlAnalysisService();