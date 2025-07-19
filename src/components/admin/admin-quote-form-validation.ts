import * as z from 'zod';

const emptyStringToNull = z.preprocess(
  (val) => (val === '' || val === undefined ? null : val),
  z.coerce.number().nullable(),
);

export const adminQuoteItemSchema = z.object({
  id: z.string(),
  item_price: z.coerce.number().min(0).default(0),
  item_weight: z.coerce.number().min(0).default(0),
  quantity: z.coerce.number().min(1),
  product_name: z.string().optional().nullable(),
  options: z.string().optional().nullable(),
  product_url: z.string().url().optional().or(z.literal('')).nullable(),
  image_url: z.string().url().optional().or(z.literal('')).nullable(),
});

export const adminQuoteFormSchema = z.object({
  id: z.string(),
  sales_tax_price: emptyStringToNull,
  merchant_shipping_price: emptyStringToNull,
  domestic_shipping: emptyStringToNull,
  handling_charge: emptyStringToNull,
  discount: emptyStringToNull,
  insurance_amount: emptyStringToNull,
  origin_country: z.string().nullable(),
  destination_country: z.string().nullable(),
  customs_percentage: emptyStringToNull,
  currency: z.string().default('USD'),
  destination_currency: z.string(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  internal_notes: z.string().optional(),
  status: z.string().optional(),
  items: z.array(adminQuoteItemSchema),
  priority_auto: z.boolean().optional(),
});

export type AdminQuoteFormValues = z.infer<typeof adminQuoteFormSchema>;
