<<<<<<< HEAD
=======

>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quoteFormSchema, QuoteFormValues } from "@/components/forms/quote-form-validation";

export const useQuoteFormConfig = () => {
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      items: [{
        productUrl: "",
        productName: "",
        quantity: 1,
        options: "",
        imageUrl: "",
      }],
      email: "",
      countryCode: "",
      quoteType: "combined",
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  return {
    form,
    fields,
    append: () => append({ 
      productUrl: "", 
      productName: "", 
      quantity: 1, 
      options: "", 
      imageUrl: "" 
    }),
    remove,
  };
};
