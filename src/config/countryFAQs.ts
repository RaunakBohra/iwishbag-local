/**
 * Country-specific FAQ configurations
 * Contains FAQ variations for India, Nepal, and Global users
 */

import { Package, CreditCard, Truck, Globe, AlertCircle } from 'lucide-react';

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQCategory {
  id: string;
  title: string;
  icon: any;
  description: string;
  color: string;
  faqs: FAQItem[];
}

export interface CountryFAQs {
  [countryCode: string]: {
    displayName: string;
    flag: string;
    currency: string;
    currencySymbol: string;
    categories: FAQCategory[];
  };
}

/**
 * Country-specific FAQ content
 * Only includes categories that vary by country
 */
export const countrySpecificFAQs: CountryFAQs = {
  IN: {
    displayName: 'India',
    flag: '🇮🇳',
    currency: 'INR',
    currencySymbol: '₹',
    categories: [
      {
        id: 'pricing',
        title: 'Pricing & Payments',
        icon: CreditCard,
        description: 'India-specific payment info',
        color: 'green',
        faqs: [
          {
            question: 'What payment methods are accepted in India?',
            answer: 'We accept UPI (GPay, PhonePe, Paytm), Indian debit/credit cards, net banking, international cards (Visa/Mastercard), and PayPal. For large orders, bank transfers are also available.'
          },
          {
            question: 'Can I pay in INR?',
            answer: 'Yes! All prices are shown in INR and include GST. The price you see during quote is the final price in rupees - no currency conversion surprises.'
          },
          {
            question: 'Is GST included in the price?',
            answer: 'Yes, all prices include GST. We provide proper GST invoices for all orders which you can use for business expense claims.'
          },
          {
            question: 'Can I use EMI for payment?',
            answer: 'Yes! You can convert your credit card payment to EMI through your bank. Most banks offer 3-12 month EMI options on international purchases above ₹5,000.'
          },
          {
            question: 'Are there any payment gateway charges?',
            answer: 'No additional charges for UPI or debit cards. Credit cards may have 2% processing fee. International cards have 3% processing fee which is included in your quote.'
          }
        ]
      },
      {
        id: 'shipping',
        title: 'Shipping & Delivery',
        icon: Truck,
        description: 'Delivery across India',
        color: 'blue',
        faqs: [
          {
            question: 'How long does delivery take to India?',
            answer: 'Standard shipping: 7-15 business days to metros, 10-18 days to other cities. Express shipping: 3-7 days to metros, 5-10 days to other cities. Remote areas may take 2-3 extra days.'
          },
          {
            question: 'Which carriers deliver in India?',
            answer: 'International leg: DHL, FedEx, Aramex. Domestic delivery: Blue Dart, DTDC, Delhivery, and local partners. We choose the best carrier based on your location.'
          },
          {
            question: 'Do you deliver to all PIN codes?',
            answer: 'We deliver to 99% of Indian PIN codes. For remote areas, we use India Post for final delivery. You can check serviceability during checkout.'
          },
          {
            question: 'Is there free shipping to India?',
            answer: 'Free standard shipping on orders above ₹10,000. Express shipping has reduced rates on higher value orders. Exact shipping cost is shown in your quote.'
          },
          {
            question: 'Can I track my package through Indian customs?',
            answer: 'Yes! We provide detailed tracking including customs clearance status. You\'ll get SMS updates at each stage - arrival in India, customs clearance, out for delivery.'
          }
        ]
      },
      {
        id: 'customs',
        title: 'Customs & Import',
        icon: Globe,
        description: 'Indian import regulations',
        color: 'purple',
        faqs: [
          {
            question: 'What documents are needed for Indian customs?',
            answer: 'For personal use: Aadhaar or PAN card for KYC. For gifts: Sender details required. For commercial: GST registration mandatory. We handle all documentation for you.'
          },
          {
            question: 'What are Indian customs duty rates?',
            answer: 'Electronics: 28-43%, Clothing: 20-40%, Cosmetics: 30-50%, Toys: 70%, Books: 0%. Exact duty depends on HSN classification. All duties are included in your quote.'
          },
          {
            question: 'Is there a duty-free limit for India?',
            answer: 'No general duty-free allowance for courier imports. Gifts up to ₹5,000 are duty-free (once per year). All commercial imports attract duty regardless of value.'
          },
          {
            question: 'What items are prohibited in India?',
            answer: 'E-cigarettes, drones (without DGCA permission), satellite phones, certain medicines, weapons, and items violating Indian laws. We screen all orders for compliance.'
          },
          {
            question: 'How long does Indian customs clearance take?',
            answer: 'Usually 1-3 business days. Items requiring additional documentation may take 3-5 days. We handle all customs communication to ensure smooth clearance.'
          },
          {
            question: 'Do I need Import Export Code (IEC)?',
            answer: 'Not for personal imports. IEC is only required for commercial imports above ₹50,000 or if you import regularly for business purposes.'
          }
        ]
      }
    ]
  },

  NP: {
    displayName: 'Nepal',
    flag: '🇳🇵',
    currency: 'NPR',
    currencySymbol: 'रू',
    categories: [
      {
        id: 'pricing',
        title: 'Pricing & Payments',
        icon: CreditCard,
        description: 'Nepal-specific payment info',
        color: 'green',
        faqs: [
          {
            question: 'What payment methods are accepted in Nepal?',
            answer: 'We accept Visa/Mastercard debit and credit cards, bank transfers to our Nepal account. We\'re working on integrating eSewa, Khalti, and IME Pay - coming soon!'
          },
          {
            question: 'Can I pay in NPR?',
            answer: 'Yes! All prices are shown in Nepali Rupees. The quote price in NPR is final - no hidden currency conversion charges. Exchange rate is locked when you approve the quote.'
          },
          {
            question: 'Are there any additional payment charges?',
            answer: 'No hidden charges! Bank transfer has no fees. Card payments may have 3% processing fee which is included in your quote. All costs are transparent.'
          },
          {
            question: 'Can I pay at delivery?',
            answer: 'Currently, we require advance payment due to international shipping. We\'re working on EMI and partial payment options for regular customers.'
          }
        ]
      },
      {
        id: 'shipping',
        title: 'Shipping & Delivery',
        icon: Truck,
        description: 'Delivery across Nepal',
        color: 'blue',
        faqs: [
          {
            question: 'How long does delivery take to Nepal?',
            answer: 'Kathmandu Valley: 10-15 days standard, 5-10 days express. Other cities: 15-20 days standard, 7-12 days express. Remote areas may take additional 3-5 days.'
          },
          {
            question: 'Which areas do you deliver to in Nepal?',
            answer: 'We deliver to all major cities and most district headquarters. Remote mountain areas are served through local partners. Delivery availability confirmed during checkout.'
          },
          {
            question: 'What about delivery during festivals/bandhs?',
            answer: 'We monitor local conditions and plan accordingly. During major festivals or bandhs, we hold packages safely and deliver immediately after. You\'re always updated about delays.'
          },
          {
            question: 'Which carriers operate in Nepal?',
            answer: 'International: DHL, FedEx to Kathmandu. Domestic: Local courier partners, Nepal Post for remote areas. We ensure reliable delivery partners for your location.'
          }
        ]
      },
      {
        id: 'customs',
        title: 'Customs & Import',
        icon: Globe,
        description: 'Nepal import regulations',
        color: 'purple',
        faqs: [
          {
            question: 'What documents are needed for Nepal customs?',
            answer: 'Citizenship card or passport copy required. For commercial imports: Company registration, PAN/VAT certificate needed. We prepare all customs documentation for you.'
          },
          {
            question: 'What are Nepal customs duty rates?',
            answer: 'Varies by product: Electronics 15-30%, Clothing 20-40%, Cosmetics 30-40%. Additional 13% VAT applies. All duties and taxes are included in your quote.'
          },
          {
            question: 'How long does Nepal customs clearance take?',
            answer: 'Typically 3-7 business days in Kathmandu. May take longer during peak seasons or for items requiring special permits. We handle all customs procedures.'
          },
          {
            question: 'What items are restricted in Nepal?',
            answer: 'Drones, wireless equipment (need NTA approval), certain medicines, gold/silver above limits. Religious items may need culture department clearance. We advise on restrictions.'
          },
          {
            question: 'Is there duty-free allowance for Nepal?',
            answer: 'Personal effects up to NPR 5,000 may have reduced duty. Gifts have specific allowances. Commercial imports always attract full duty regardless of value.'
          }
        ]
      }
    ]
  },

  GLOBAL: {
    displayName: 'International',
    flag: '🌍',
    currency: 'USD',
    currencySymbol: '$',
    categories: [
      {
        id: 'pricing',
        title: 'Pricing & Payments',
        icon: CreditCard,
        description: 'International payment options',
        color: 'green',
        faqs: [
          {
            question: 'What payment methods do you accept?',
            answer: 'We accept all major credit/debit cards (Visa, Mastercard, Amex), PayPal, and international wire transfers. All payments are secure and encrypted.'
          },
          {
            question: 'What currency will I be charged in?',
            answer: 'Prices are shown in USD. Your bank will convert to your local currency. Some cards may charge foreign transaction fees - check with your bank.'
          },
          {
            question: 'Are prices all-inclusive?',
            answer: 'Yes! The quoted price includes product cost, international shipping, handling, and our service fee. Your country may have additional import duties upon delivery.'
          },
          {
            question: 'When do I pay?',
            answer: 'Payment is required after quote approval and before we purchase items. We only charge once you\'re happy with the quote. No hidden fees or surprises.'
          }
        ]
      },
      {
        id: 'shipping',
        title: 'Shipping & Delivery',
        icon: Truck,
        description: 'International delivery info',
        color: 'blue',
        faqs: [
          {
            question: 'Do you ship to my country?',
            answer: 'We currently focus on India and Nepal but accept orders from other countries on request. Contact us with your location and we\'ll check shipping options.'
          },
          {
            question: 'How long does international shipping take?',
            answer: 'Express shipping only for international orders: 5-10 business days via DHL/FedEx. Actual time depends on your country and customs processing.'
          },
          {
            question: 'Can I track my international shipment?',
            answer: 'Yes! You\'ll receive tracking info that works worldwide. Track your package from origin through international transit to your local delivery.'
          }
        ]
      },
      {
        id: 'customs',
        title: 'Customs & Import',
        icon: Globe,
        description: 'International customs info',
        color: 'purple',
        faqs: [
          {
            question: 'What about customs duties?',
            answer: 'Import duties vary by country and product. We provide commercial invoices for customs but cannot predict exact duties for countries outside India/Nepal.'
          },
          {
            question: 'Will I need to clear customs myself?',
            answer: 'For most countries, you\'ll need to handle customs clearance and pay any duties directly. We provide all necessary documentation to facilitate clearance.'
          },
          {
            question: 'What items can be shipped internationally?',
            answer: 'Most items can be shipped, but some products like batteries, liquids, or electronics may have restrictions. We\'ll advise during quote review.'
          }
        ]
      }
    ]
  }
};

/**
 * Get country-specific FAQ categories
 */
export function getCountryFAQs(countryCode: string): FAQCategory[] {
  const country = countrySpecificFAQs[countryCode] || countrySpecificFAQs.GLOBAL;
  return country.categories;
}

/**
 * Get country display info
 */
export function getCountryInfo(countryCode: string) {
  const country = countrySpecificFAQs[countryCode] || countrySpecificFAQs.GLOBAL;
  return {
    displayName: country.displayName,
    flag: country.flag,
    currency: country.currency,
    currencySymbol: country.currencySymbol
  };
}

/**
 * Get all available countries for selector
 */
export function getAvailableCountries() {
  return Object.entries(countrySpecificFAQs).map(([code, info]) => ({
    code,
    displayName: info.displayName,
    flag: info.flag
  }));
}