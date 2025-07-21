import * as z from 'zod';

const emptyStringToNull = z.preprocess(
  (val) => (val === '' || val === undefined ? null : val),
  z.coerce.number().nullable(),
);

const emptyStringToZero = z.preprocess(
  (val) => (val === '' || val === undefined ? 0 : val),
  z.coerce.number().min(0).default(0),
);

export const adminQuoteItemSchema = z.object({
  id: z.string(),
  item_price: emptyStringToZero,
  item_weight: emptyStringToZero,
  quantity: z.preprocess(
    (val) => (val === '' || val === undefined || val === 0 ? 1 : val),
    z.coerce.number().min(1).default(1),
  ),
  product_name: z.string().optional().nullable(),
  options: z.string().optional().nullable(),
  product_url: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
});

export const adminQuoteFormSchema = z.object({
  id: z.string(),
  sales_tax_price: emptyStringToNull,
  merchant_shipping_price: emptyStringToNull,
  domestic_shipping: emptyStringToNull,
  handling_charge: emptyStringToNull,
  discount: emptyStringToNull,
  insurance_amount: emptyStringToNull,
  international_shipping: emptyStringToNull,
  selected_shipping_option: z.string().optional().nullable(),
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
