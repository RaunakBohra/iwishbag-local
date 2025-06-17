import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { GuestEmailField } from "@/components/forms/quote-form-fields/GuestEmailField";
import QuoteItem from "./quote-form-fields/QuoteItem";
import { Plus } from "lucide-react";
import { CountryField } from "./quote-form-fields/CountryField";
import { useQuoteForm } from "@/hooks/useQuoteForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const QuoteForm = () => {
  const {
    form,
    fields,
    append,
    remove,
    onSubmit,
    loading,
    countryCode,
    user,
  } = useQuoteForm();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <CountryField control={form.control} isLoading={loading} filter="purchase" />
        {countryCode && (
          <p className="text-sm text-muted-foreground -mt-4">
            Please ensure all product links are for stores in the selected country.
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Quote Type</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={form.watch("quoteType") || "combined"}
              onValueChange={(value) => form.setValue("quoteType", value as "combined" | "separate")}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="combined" id="combined" />
                <Label htmlFor="combined">Combined Quote - Single quote for all items</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="separate" id="separate" />
                <Label htmlFor="separate">Separate Quotes - Individual quote for each item</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <div className="space-y-4">
            {fields.map((field, index) => (
                <QuoteItem 
                    key={field.id}
                    index={index}
                    remove={remove}
                    control={form.control}
                />
            ))}
        </div>
        
        <Button
          type="button"
          variant="destructive"
          onClick={() => append()}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Item
        </Button>

        {!user && <GuestEmailField control={form.control} setValue={form.setValue} />}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Submitting..." : "Submit Request"}
        </Button>
      </form>
    </Form>
  );
};

export default QuoteForm;
