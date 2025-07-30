
export function useQuoteItemWithHSN(itemName: string) {
  const { mutateAsync: classifyProduct } = useProductClassification();
  
  return useMutation({
    mutationFn: async (item: { name: string; origin: string; destination: string }) => {
      // First classify the product
      const classification = await classifyProduct({
        product: item.name,
        origin: item.origin,
        destination: item.destination,
      });
      
      // Then lookup hsnDetails,
        };
      }
      
      return classification;
    },
  });
}