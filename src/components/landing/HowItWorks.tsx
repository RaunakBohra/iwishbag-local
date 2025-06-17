
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PackageSearch, FileText, Plane, Home } from "lucide-react";

const steps = [
  {
    icon: <PackageSearch className="h-10 w-10 text-primary" />,
    title: "1. Find Your Item",
    description: "Browse any international online store and find the product you want to buy.",
  },
  {
    icon: <FileText className="h-10 w-10 text-primary" />,
    title: "2. Request a Quote",
    description: "Submit the product link and details through our simple form to get a transparent price quote.",
  },
  {
    icon: <Plane className="h-10 w-10 text-primary" />,
    title: "3. We Buy & Ship",
    description: "Once you approve the quote, we purchase the item for you and ship it to our secure facility.",
  },
  {
    icon: <Home className="h-10 w-10 text-primary" />,
    title: "4. Receive at Home",
    description: "We handle customs and deliver your package right to your doorstep, hassle-free.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-white">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold">
            Get Anything in 4 Simple Steps
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Our process is designed to be simple, transparent, and fast.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
          {steps.map((step, index) => (
            <Card key={index} className="text-center p-6">
              <div className="flex justify-center mb-4">
                {step.icon}
              </div>
              <CardHeader className="p-0">
                <CardTitle>{step.title}</CardTitle>
                <CardDescription className="mt-2">{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
