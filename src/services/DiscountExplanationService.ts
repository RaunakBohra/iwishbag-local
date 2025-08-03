/**
 * Discount Explanation Service
 * Generates customer-friendly explanations for discount terms, conditions, and benefits
 */

export interface DiscountExplanation {
  summary: string;
  howItWorks: string;
  eligibility: string[];
  restrictions: string[];
  examples: DiscountExample[];
  terms: string[];
  tips: string[];
}

export interface DiscountExample {
  scenario: string;
  orderValue: number;
  discountAmount: number;
  finalValue: number;
  explanation: string;
}

export interface DiscountTerms {
  basicTerms: string[];
  eligibilityRequirements: string[];
  usageRestrictions: string[];
  timeRestrictions: string[];
  geographicRestrictions: string[];
  combinationRules: string[];
  fairUsePolicy: string[];
}

export class DiscountExplanationService {
  
  /**
   * Generate comprehensive explanation for a specific discount type
   */
  static generateDiscountExplanation(discountData: {
    type: 'percentage' | 'fixed_amount' | 'shipping' | 'free_shipping';
    value: number;
    appliesTo: string;
    minOrder?: number;
    maxDiscount?: number;
    usageLimit?: number;
    usagePerCustomer?: number;
    validFrom?: string;
    validUntil?: string;
    countries?: string[];
    conditions?: any;
  }): DiscountExplanation {
    
    const { type, value, appliesTo, minOrder, maxDiscount, countries } = discountData;
    
    // Generate summary
    const summary = this.generateSummary(type, value, appliesTo, maxDiscount);
    
    // Generate how it works explanation
    const howItWorks = this.generateHowItWorksExplanation(type, value, appliesTo, minOrder, maxDiscount);
    
    // Generate eligibility criteria
    const eligibility = this.generateEligibilityCriteria(discountData);
    
    // Generate restrictions
    const restrictions = this.generateRestrictions(discountData);
    
    // Generate examples
    const examples = this.generateExamples(type, value, appliesTo, minOrder, maxDiscount);
    
    // Generate terms
    const terms = this.generateTerms(discountData);
    
    // Generate tips
    const tips = this.generateTips(type, appliesTo, minOrder);
    
    return {
      summary,
      howItWorks,
      eligibility,
      restrictions,
      examples,
      terms,
      tips
    };
  }
  
  /**
   * Generate a clear, concise summary of the discount
   */
  private static generateSummary(
    type: string, 
    value: number, 
    appliesTo: string, 
    maxDiscount?: number
  ): string {
    switch (type) {
      case 'percentage':
        const percentageText = `${value}% off ${this.getAppliesTo(appliesTo)}`;
        return maxDiscount 
          ? `${percentageText} (up to $${maxDiscount} savings)`
          : percentageText;
          
      case 'fixed_amount':
        return `$${value} off ${this.getAppliesTo(appliesTo)}`;
        
      case 'free_shipping':
        return 'Free shipping on your order';
        
      case 'shipping':
        return `${value}% off shipping costs`;
        
      default:
        return `Discount on ${this.getAppliesTo(appliesTo)}`;
    }
  }
  
  /**
   * Generate detailed explanation of how the discount works
   */
  private static generateHowItWorksExplanation(
    type: string,
    value: number,
    appliesTo: string,
    minOrder?: number,
    maxDiscount?: number
  ): string {
    const orderRequirement = minOrder ? ` on orders of $${minOrder} or more` : '';
    const maxDiscountText = maxDiscount ? ` The maximum discount is capped at $${maxDiscount}.` : '';
    
    switch (type) {
      case 'percentage':
        return `This discount reduces your ${this.getAppliesTo(appliesTo)} by ${value}%${orderRequirement}.${maxDiscountText} The discount is calculated automatically when you apply the code at checkout.`;
        
      case 'fixed_amount':
        return `This discount reduces your ${this.getAppliesTo(appliesTo)} by exactly $${value}${orderRequirement}. The discount is applied once per order.`;
        
      case 'free_shipping':
        return `This discount removes all shipping charges from your order${orderRequirement}. You'll see the shipping cost crossed out in your order summary.`;
        
      case 'shipping':
        return `This discount reduces your shipping costs by ${value}%${orderRequirement}. The discount applies to the base shipping rate before any additional services.`;
        
      default:
        return `This discount applies to your ${this.getAppliesTo(appliesTo)}${orderRequirement}.`;
    }
  }
  
  /**
   * Generate eligibility criteria in user-friendly language
   */
  private static generateEligibilityCriteria(discountData: any): string[] {
    const criteria: string[] = [];
    
    if (discountData.minOrder) {
      criteria.push(`Order total must be at least $${discountData.minOrder}`);
    }
    
    if (discountData.countries && discountData.countries.length > 0) {
      const countryNames = discountData.countries.map(c => this.getCountryName(c)).join(', ');
      criteria.push(`Available for delivery to: ${countryNames}`);
    }
    
    if (discountData.usagePerCustomer) {
      const times = discountData.usagePerCustomer === 1 ? 'once' : `${discountData.usagePerCustomer} times`;
      criteria.push(`Can be used ${times} per customer`);
    }
    
    if (discountData.conditions?.membership_required) {
      criteria.push('Requires active iwishBag membership');
    }
    
    if (discountData.conditions?.first_time_only) {
      criteria.push('Available only for first-time customers');
    }
    
    if (discountData.validFrom) {
      const fromDate = new Date(discountData.validFrom).toLocaleDateString();
      criteria.push(`Valid from ${fromDate}`);
    }
    
    if (discountData.validUntil) {
      const untilDate = new Date(discountData.validUntil).toLocaleDateString();
      criteria.push(`Valid until ${untilDate}`);
    }
    
    if (criteria.length === 0) {
      criteria.push('No special eligibility requirements');
    }
    
    return criteria;
  }
  
  /**
   * Generate restrictions in clear language
   */
  private static generateRestrictions(discountData: any): string[] {
    const restrictions: string[] = [];
    
    restrictions.push('Cannot be combined with other promotional codes');
    restrictions.push('Cannot be applied to previous orders');
    restrictions.push('No cash value or refund available');
    
    if (discountData.usageLimit) {
      restrictions.push(`Limited to ${discountData.usageLimit} total uses across all customers`);
    }
    
    if (discountData.maxDiscount) {
      restrictions.push(`Maximum discount amount is $${discountData.maxDiscount}`);
    }
    
    if (discountData.appliesTo !== 'total') {
      restrictions.push(`Applies only to ${this.getAppliesTo(discountData.appliesTo)}, not the full order`);
    }
    
    if (discountData.conditions?.exclude_components) {
      const excluded = discountData.conditions.exclude_components.join(', ');
      restrictions.push(`Does not apply to: ${excluded}`);
    }
    
    return restrictions;
  }
  
  /**
   * Generate practical examples showing the discount in action
   */
  private static generateExamples(
    type: string,
    value: number,
    appliesTo: string,
    minOrder?: number,
    maxDiscount?: number
  ): DiscountExample[] {
    const examples: DiscountExample[] = [];
    
    // Example 1: Basic qualifying order
    const baseOrder = minOrder ? Math.max(minOrder, 100) : 100;
    const example1 = this.calculateDiscountExample(type, value, appliesTo, baseOrder, maxDiscount);
    examples.push({
      scenario: minOrder ? 'Minimum qualifying order' : 'Standard order',
      ...example1
    });
    
    // Example 2: Larger order (if percentage discount)
    if (type === 'percentage' && !maxDiscount) {
      const largerOrder = baseOrder * 2;
      const example2 = this.calculateDiscountExample(type, value, appliesTo, largerOrder, maxDiscount);
      examples.push({
        scenario: 'Larger order',
        ...example2
      });
    }
    
    // Example 3: Maximum discount (if capped)
    if (maxDiscount && type === 'percentage') {
      const orderForMaxDiscount = Math.ceil((maxDiscount * 100) / value) + 50;
      const example3 = this.calculateDiscountExample(type, value, appliesTo, orderForMaxDiscount, maxDiscount);
      examples.push({
        scenario: 'Order reaching maximum discount',
        ...example3
      });
    }
    
    return examples;
  }
  
  /**
   * Calculate a specific discount example
   */
  private static calculateDiscountExample(
    type: string,
    value: number,
    appliesTo: string,
    orderValue: number,
    maxDiscount?: number
  ): Omit<DiscountExample, 'scenario'> {
    let discountAmount = 0;
    let componentValue = orderValue;
    
    // For component-specific discounts, estimate component value
    if (appliesTo === 'shipping') {
      componentValue = Math.max(orderValue * 0.1, 25); // Estimate shipping as 10% or min $25
    } else if (appliesTo === 'handling') {
      componentValue = orderValue * 0.02; // Estimate handling as 2%
    }
    
    switch (type) {
      case 'percentage':
        discountAmount = (componentValue * value) / 100;
        if (maxDiscount) {
          discountAmount = Math.min(discountAmount, maxDiscount);
        }
        break;
        
      case 'fixed_amount':
        discountAmount = Math.min(value, componentValue);
        break;
        
      case 'free_shipping':
        discountAmount = componentValue;
        break;
    }
    
    const finalValue = appliesTo === 'total' ? orderValue - discountAmount : orderValue - discountAmount;
    
    return {
      orderValue,
      discountAmount,
      finalValue,
      explanation: `On a $${orderValue} order, you save $${discountAmount.toFixed(2)}, paying $${finalValue.toFixed(2)} total.`
    };
  }
  
  /**
   * Generate legal terms and conditions
   */
  private static generateTerms(discountData: any): string[] {
    return [
      'This discount is valid only for online orders through iwishBag.com',
      'Discount codes are case-sensitive and must be entered exactly as provided',
      'iwishBag reserves the right to modify or cancel this promotion at any time',
      'This offer cannot be combined with other promotional codes or discounts',
      'Discount applies to eligible items only and excludes taxes, shipping insurance, and customs duties unless specifically stated',
      'No substitutions, exchanges, or cash equivalents are permitted',
      'If you return items from a discounted order, the refund will reflect the discounted price paid',
      'This promotion is subject to availability and may be discontinued without notice'
    ];
  }
  
  /**
   * Generate helpful tips for maximizing the discount
   */
  private static generateTips(type: string, appliesTo: string, minOrder?: number): string[] {
    const tips: string[] = [];
    
    if (minOrder) {
      tips.push(`💡 Add items worth $${minOrder} or more to qualify for this discount`);
    }
    
    if (type === 'percentage') {
      tips.push('💡 Higher order values mean bigger savings with percentage discounts');
    }
    
    if (appliesTo === 'shipping') {
      tips.push('💡 This discount reduces shipping costs, making international delivery more affordable');
    }
    
    if (appliesTo === 'total') {
      tips.push('💡 This discount applies to your entire order, maximizing your savings');
    }
    
    tips.push('💡 Subscribe to our newsletter to receive exclusive discount codes');
    tips.push('💡 Follow us on social media for flash sales and limited-time offers');
    
    return tips;
  }
  
  /**
   * Get user-friendly name for what the discount applies to
   */
  private static getAppliesTo(appliesTo: string): string {
    const mapping: { [key: string]: string } = {
      'total': 'your entire order',
      'shipping': 'shipping costs',
      'handling': 'handling fees',
      'customs': 'customs duties',
      'taxes': 'local taxes',
      'insurance': 'shipping insurance',
      'delivery': 'delivery charges'
    };
    
    return mapping[appliesTo] || appliesTo;
  }
  
  /**
   * Get user-friendly country name from country code
   */
  private static getCountryName(countryCode: string): string {
    const countries: { [key: string]: string } = {
      'US': 'United States',
      'IN': 'India',
      'NP': 'Nepal',
      'CA': 'Canada',
      'UK': 'United Kingdom',
      'AU': 'Australia',
      // Add more as needed
    };
    
    return countries[countryCode] || countryCode;
  }
  
  /**
   * Generate standard discount terms and conditions
   */
  static generateStandardTerms(): DiscountTerms {
    return {
      basicTerms: [
        'Discount codes are valid for online orders only',
        'Codes must be entered at checkout before payment',
        'Discounts cannot be applied to previous orders',
        'No cash value or refunds available for unused discounts'
      ],
      
      eligibilityRequirements: [
        'Valid email address required for order confirmation',
        'Must meet minimum order requirements if specified',
        'Account registration may be required for certain offers',
        'Age restrictions may apply in some regions'
      ],
      
      usageRestrictions: [
        'One promotional code per order unless otherwise stated',
        'Cannot be combined with other offers or promotions',
        'Limited to specified number of uses per customer',
        'Not valid on gift cards or digital products'
      ],
      
      timeRestrictions: [
        'Offers are valid for limited time periods',
        'Expiration dates are strictly enforced',
        'Time zones are based on Pacific Standard Time',
        'No extensions granted for expired codes'
      ],
      
      geographicRestrictions: [
        'Some offers are limited to specific countries or regions',
        'Shipping address determines eligibility',
        'Local laws and regulations may apply',
        'Currency conversions are approximate'
      ],
      
      combinationRules: [
        'Promotional codes cannot be stacked or combined',
        'Automatic discounts may apply in addition to codes',
        'Membership discounts take precedence when beneficial',
        'System will apply the best available discount'
      ],
      
      fairUsePolicy: [
        'Abuse of promotional codes may result in account suspension',
        'Fraudulent activity will be reported to authorities',
        'We reserve the right to limit quantities',
        'Unusual usage patterns may trigger additional verification'
      ]
    };
  }
}