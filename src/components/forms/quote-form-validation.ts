import * as z from "zod";

const quoteItemSchema = z.object({
  productUrl: z.string().optional(),
  productName: z.string().optional(),
  quantity: z.coerce.number().min(1, { message: "Quantity must be at least 1." }),
  options: z.string().optional(),
  imageUrl: z.string().optional(),
}).superRefine((data, ctx) => {
  const { productUrl, imageUrl, productName } = data;
  
  if (productUrl && !z.string().url().safeParse(productUrl).success) {
    ctx.addIssue({
      code: z.ZodIssueCode.invalid_string,
      validation: 'url',
      message: "Please enter a valid URL.",
      path: ["productUrl"],
    });
  }

  if (!productUrl && !imageUrl && !productName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please provide a Product URL, Name, or upload an image.",
      path: ["productUrl"],
    });
  }
});

export const quoteFormSchema = z.object({
  items: z.array(quoteItemSchema).min(1, "Please add at least one item."),
  countryCode: z.string().min(1, { message: "Please select a country." }),
  email: z.string().email({ message: "Please enter a valid email." }).optional(),
  quoteType: z.enum(["combined", "separate"]).default("combined"),
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;
