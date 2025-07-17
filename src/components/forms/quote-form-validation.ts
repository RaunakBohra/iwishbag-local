import * as z from 'zod';
import { sanitizeHtml, sanitizeUrl } from '@/lib/validation';

// Enhanced quote item validation with security and data integrity
const quoteItemSchema = z
  .object({
    productUrl: z
      .string()
      .optional()
      .transform((val) => (val ? sanitizeUrl(val) : val)),
    productName: z
      .string()
      .optional()
      .transform((val) => (val ? sanitizeHtml(val).slice(0, 200) : val)),
    quantity: z.coerce
      .number()
      .int('Quantity must be a whole number')
      .min(1, 'Quantity must be at least 1')
      .max(999, 'Quantity cannot exceed 999'),
    options: z
      .string()
      .optional()
      .transform((val) => (val ? sanitizeHtml(val).slice(0, 500) : val)),
    imageUrl: z
      .string()
      .optional()
      .transform((val) => (val ? sanitizeUrl(val) : val)),
    price: z
      .string()
      .optional()
      .refine((val) => !val || /^\d+(\.\d{1,2})?$/.test(val), 'Invalid price format'),
    weight: z
      .string()
      .optional()
      .refine((val) => !val || /^\d+(\.\d{1,3})?$/.test(val), 'Invalid weight format'),
  })
  .superRefine((data, ctx) => {
    const { productUrl, imageUrl, productName } = data;

    // Validate URL format if provided
    if (productUrl && productUrl.trim()) {
      try {
        const url = new URL(productUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Only HTTP and HTTPS URLs are allowed',
            path: ['productUrl'],
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter a valid URL',
          path: ['productUrl'],
        });
      }
    }

    // Validate image URL if provided
    if (imageUrl && imageUrl.trim()) {
      try {
        const url = new URL(imageUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Only HTTP and HTTPS image URLs are allowed',
            path: ['imageUrl'],
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter a valid image URL',
          path: ['imageUrl'],
        });
      }
    }

    // At least one identifier is required
    if (!productUrl?.trim() && !imageUrl?.trim() && !productName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please provide a Product URL, Name, or upload an image',
        path: ['productUrl'],
      });
    }

    // Validate weight is reasonable
    if (data.weight) {
      const weightNum = parseFloat(data.weight);
      if (weightNum > 1000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Weight cannot exceed 1000kg',
          path: ['weight'],
        });
      }
    }

    // Validate price is reasonable
    if (data.price) {
      const priceNum = parseFloat(data.price);
      if (priceNum > 1000000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Price cannot exceed $1,000,000',
          path: ['price'],
        });
      }
    }
  });

// Enhanced quote form validation
export const quoteFormSchema = z
  .object({
    items: z
      .array(quoteItemSchema)
      .min(1, 'Please add at least one item')
      .max(50, 'Cannot add more than 50 items per quote'),
    countryCode: z
      .string()
      .min(1, 'Please select a country')
      .regex(/^[A-Z]{2}$/, 'Invalid country code format'),
    email: z
      .string()
      .email('Please enter a valid email address')
      .max(254, 'Email address too long')
      .optional()
      .transform((val) => val?.toLowerCase().trim()),
    quoteType: z
      .enum(['combined', 'separate'], {
        errorMap: () => ({ message: 'Please select a valid quote type' }),
      })
      .default('combined'),
    notes: z
      .string()
      .optional()
      .transform((val) => (val ? sanitizeHtml(val).slice(0, 1000) : val)),
  })
  .superRefine((data, ctx) => {
    // Additional business logic validation
    const _totalItems = data.items.length;
    const totalQuantity = data.items.reduce((sum, item) => sum + (item.quantity || 0), 0);

    if (totalQuantity > 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Total quantity across all items cannot exceed 1000',
        path: ['items'],
      });
    }

    // Check for duplicate product URLs
    const urls = data.items.map((item) => item.productUrl).filter((url) => url && url.trim());
    const uniqueUrls = new Set(urls);

    if (urls.length !== uniqueUrls.size) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate product URLs are not allowed',
        path: ['items'],
      });
    }
  });

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;
