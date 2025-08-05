import { describe, it, expect } from 'vitest';

// Common validation functions used across the platform
export const validators = {
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isValidPhone: (phone: string): boolean => {
    // International phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
  },

  isValidUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  isValidAmount: (amount: number, min = 0, max = 999999): boolean => {
    return amount > min && amount <= max;
  },

  sanitizeInput: (input: string): string => {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },
};

describe('Validation Utils', () => {
  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.com',
        'user+tag@example.co.uk',
        'user123@example-domain.com',
      ];

      validEmails.forEach(email => {
        expect(validators.isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        '',
      ];

      invalidEmails.forEach(email => {
        expect(validators.isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('Phone Number Validation', () => {
    it('should validate international phone numbers', () => {
      const validPhones = [
        '+1234567890',
        '+919876543210',
        '+977123456789',
        '1234567890',
        '+1-234-567-8900',
        '+1 (234) 567-8900',
      ];

      validPhones.forEach(phone => {
        expect(validators.isValidPhone(phone)).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '123',
        '+0123456789',
        'abcdefghij',
        '',
        '++1234567890',
      ];

      invalidPhones.forEach(phone => {
        expect(validators.isValidPhone(phone)).toBe(false);
      });
    });
  });

  describe('URL Validation', () => {
    it('should validate correct URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com/path',
        'https://example.com/path?query=value',
        'https://subdomain.example.com',
        'https://example.com:8080',
      ];

      validUrls.forEach(url => {
        expect(validators.isValidUrl(url)).toBe(true);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not a url',
        'example.com',
        'https://',
        'ftp://example.com',
        '',
      ];

      invalidUrls.forEach(url => {
        expect(validators.isValidUrl(url)).toBe(false);
      });
    });
  });

  describe('Amount Validation', () => {
    it('should validate amounts within range', () => {
      expect(validators.isValidAmount(100)).toBe(true);
      expect(validators.isValidAmount(1)).toBe(true);
      expect(validators.isValidAmount(999999)).toBe(true);
    });

    it('should reject amounts outside range', () => {
      expect(validators.isValidAmount(0)).toBe(false);
      expect(validators.isValidAmount(-100)).toBe(false);
      expect(validators.isValidAmount(1000000)).toBe(false);
    });

    it('should respect custom limits', () => {
      expect(validators.isValidAmount(50, 10, 100)).toBe(true);
      expect(validators.isValidAmount(5, 10, 100)).toBe(false);
      expect(validators.isValidAmount(150, 10, 100)).toBe(false);
    });
  });

  describe('Input Sanitization', () => {
    it('should escape HTML special characters', () => {
      const dangerous = '<script>alert("XSS")</script>';
      const sanitized = validators.sanitizeInput(dangerous);
      
      expect(sanitized).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      expect(sanitized).not.toContain('<script>');
    });

    it('should handle all special characters', () => {
      const input = `<>"'/`;
      const expected = '&lt;&gt;&quot;&#x27;&#x2F;';
      
      expect(validators.sanitizeInput(input)).toBe(expected);
    });

    it('should leave safe text unchanged', () => {
      const safeText = 'This is a safe text with numbers 123';
      expect(validators.sanitizeInput(safeText)).toBe(safeText);
    });
  });

  describe('Payment Validation', () => {
    it('should validate credit card numbers', () => {
      const isValidCardNumber = (number: string): boolean => {
        // Remove spaces and dashes
        const cleaned = number.replace(/[\s-]/g, '');
        
        // Check if it's numeric and correct length
        if (!/^\d{13,19}$/.test(cleaned)) return false;
        
        // Luhn algorithm
        let sum = 0;
        let isEven = false;
        
        for (let i = cleaned.length - 1; i >= 0; i--) {
          let digit = parseInt(cleaned[i]);
          
          if (isEven) {
            digit *= 2;
            if (digit > 9) digit -= 9;
          }
          
          sum += digit;
          isEven = !isEven;
        }
        
        return sum % 10 === 0;
      };

      // Valid test card numbers
      expect(isValidCardNumber('4111111111111111')).toBe(true); // Visa
      expect(isValidCardNumber('5500000000000004')).toBe(true); // Mastercard
      expect(isValidCardNumber('340000000000009')).toBe(true); // Amex
      
      // Invalid card numbers
      expect(isValidCardNumber('1234567890123456')).toBe(false);
      expect(isValidCardNumber('411111111111111')).toBe(false); // Too short
    });

    it('should validate CVV', () => {
      const isValidCVV = (cvv: string, cardType = 'default'): boolean => {
        if (cardType === 'amex') {
          return /^\d{4}$/.test(cvv);
        }
        return /^\d{3}$/.test(cvv);
      };

      expect(isValidCVV('123')).toBe(true);
      expect(isValidCVV('1234', 'amex')).toBe(true);
      expect(isValidCVV('12')).toBe(false);
      expect(isValidCVV('12345')).toBe(false);
    });
  });

  describe('Quote Validation', () => {
    it('should validate product links', () => {
      const isValidProductLink = (url: string): boolean => {
        if (!validators.isValidUrl(url)) return false;
        
        // Check for supported domains
        const supportedDomains = [
          'amazon.com',
          'amazon.in',
          'flipkart.com',
          'ebay.com',
          'alibaba.com',
          'apple.com',
          'bestbuy.com',
          'target.com',
          'walmart.com',
          'etsy.com',
          'zara.com',
          'myntra.com',
          'hm.com',
        ];
        
        try {
          const urlObj = new URL(url);
          return supportedDomains.some(domain => 
            urlObj.hostname.includes(domain)
          );
        } catch {
          return false;
        }
      };

      expect(isValidProductLink('https://www.amazon.com/product')).toBe(true);
      expect(isValidProductLink('https://flipkart.com/item')).toBe(true);
      expect(isValidProductLink('https://unsupported.com/item')).toBe(false);
    });

    it('should validate quantity limits', () => {
      const isValidQuantity = (qty: number, max = 99): boolean => {
        return Number.isInteger(qty) && qty > 0 && qty <= max;
      };

      expect(isValidQuantity(1)).toBe(true);
      expect(isValidQuantity(50)).toBe(true);
      expect(isValidQuantity(0)).toBe(false);
      expect(isValidQuantity(100)).toBe(false);
      expect(isValidQuantity(1.5)).toBe(false);
    });
  });
});