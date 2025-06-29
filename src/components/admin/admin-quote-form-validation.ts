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
<<<<<<< HEAD
=======
    item_currency: z.string().min(1, "Currency is required"),
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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
<<<<<<< HEAD
    customs_percentage: emptyStringToNull,
    currency: z.string().default('USD'),
=======
    customs_category_name: z.string().nullable(),
    status: z.string(),
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
    final_currency: z.string(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    internal_notes: z.string().optional(),
    items: z.array(adminQuoteItemSchema),
});

export type AdminQuoteFormValues = z.infer<typeof adminQuoteFormSchema>;
