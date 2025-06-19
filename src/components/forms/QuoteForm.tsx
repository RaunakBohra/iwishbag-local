import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { GuestEmailField } from "@/components/forms/quote-form-fields/GuestEmailField";
import QuoteItem from "./quote-form-fields/QuoteItem";
import { Plus, Sparkles, ArrowRight, CheckCircle } from "lucide-react";
import { CountryField } from "./quote-form-fields/CountryField";
import { useQuoteForm } from "@/hooks/useQuoteForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Quick Start Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Quick & Easy</span>
          </div>
          <h3 className="text-2xl font-semibold">Let's Get Started</h3>
          <p className="text-muted-foreground">
            Just a few simple steps to get your international shopping quote
          </p>
        </div>

        {/* Step 1: Country Selection */}
        <Card className="border-2 border-primary/10 bg-primary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <CardTitle className="text-lg">Where should we deliver?</CardTitle>
                <p className="text-sm text-muted-foreground">
                  This helps us calculate shipping costs to your location
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CountryField control={form.control} isLoading={loading} filter="purchase" />
            {countryCode && (
              <div className="mt-3 flex items-center space-x-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Perfect! We'll deliver to {countryCode}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Quote Type */}
        <Card className="border-2 border-primary/10 bg-primary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <CardTitle className="text-lg">Shopping Request Type</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choose how you'd like to receive your shopping quotes
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={form.watch("quoteType") || "combined"}
              onValueChange={(value) => form.setValue("quoteType", value as "combined" | "separate")}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="flex items-start space-x-3 p-4 rounded-lg border-2 hover:border-primary/30 transition-colors cursor-pointer">
                <RadioGroupItem value="combined" id="combined" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="combined" className="text-base font-medium cursor-pointer">
                    Combined Order
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get one quote for all items together - usually better shipping rates
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    Recommended
                  </Badge>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-4 rounded-lg border-2 hover:border-primary/30 transition-colors cursor-pointer">
                <RadioGroupItem value="separate" id="separate" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="separate" className="text-base font-medium cursor-pointer">
                    Separate Orders
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get individual quotes for each item - more detailed breakdown
                  </p>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Step 3: Products */}
        <Card className="border-2 border-primary/10 bg-primary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <CardTitle className="text-lg">What do you want to buy?</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Add the products you want from international stores
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id}>
                <QuoteItem 
                  index={index}
                  remove={remove}
                  control={form.control}
                  setValue={form.setValue}
                />
                {index < fields.length - 1 && (
                  <Separator className="my-6" />
                )}
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              onClick={() => append()}
              className="w-full h-12 border-dashed border-2 hover:border-primary/50 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Product
            </Button>
          </CardContent>
        </Card>

        {/* Step 4: Contact Info */}
        {!user && (
          <Card className="border-2 border-primary/10 bg-primary/5">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div>
                  <CardTitle className="text-lg">How can we reach you?</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    We'll send your shopping quotes to this email address
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <GuestEmailField control={form.control} setValue={form.setValue} />
            </CardContent>
          </Card>
        )}

        {/* Submit Section */}
        <div className="text-center space-y-4">
          <Button 
            type="submit" 
            size="lg" 
            className="w-full md:w-auto h-12 px-8 text-lg" 
            disabled={loading}
          >
            {loading ? (
              "Getting Your Shopping Quote..."
            ) : (
              <>
                Get My Shopping Quote
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground">
            You'll receive your shopping quote within 24 hours
          </p>
        </div>
      </form>
    </Form>
  );
};

export default QuoteForm;
