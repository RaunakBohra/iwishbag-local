
import * as z from "zod";

const emptyStringToNull = z.preprocess((val) => (val === "" || val === undefined ? null : val), z.coerce.number().nullable());

export const adminQuoteItemSchema = z.object({
    id: z.string(),
    item_price: z.coerce.number().min(0).default(0),
    item_weight: z.coerce.number().min(0).default(0),
    quantity: z.coerce.number().min(1),
    product_name: z.string().optional().nullable(),
    options: z.string().optional().nullable(),
    product_url: z.string().url().optional().or(z.literal('')).nullable(),
    image_url: z.string().url().optional().or(z.literal('')).nullable(),
    item_currency: z.string().min(1, "Currency is required"),
});

export const adminQuoteFormSchema = z.object({
    id: z.string(),
    sales_tax_price: emptyStringToNull,
    merchant_shipping_price: emptyStringToNull,
    domestic_shipping: emptyStringToNull,
    handling_charge: emptyStringToNull,
    discount: emptyStringToNull,
    insurance_amount: emptyStringToNull,
    country_code: z.string().nullable(),
    customs_category_name: z.string().nullable(),
    status: z.string(),
    final_currency: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).nullable(),
    internal_notes: z.string().nullable(),
    items: z.array(adminQuoteItemSchema),
});

export type AdminQuoteFormValues = z.infer<typeof adminQuoteFormSchema>;
