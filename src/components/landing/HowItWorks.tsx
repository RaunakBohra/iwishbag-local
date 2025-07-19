import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PackageSearch, FileText, Plane, Home } from 'lucide-react';

const steps = [
  {
    icon: <PackageSearch className="h-12 w-12 text-primary" />,
    title: '1. Find Your Item',
    description: 'Browse any international online store and find the product you want to buy.',
  },
  {
    icon: <FileText className="h-12 w-12 text-primary" />,
    title: '2. Request a Quote',
    description:
      'Submit the product link and details through our simple form to get a transparent price quote.',
  },
  {
    icon: <Plane className="h-12 w-12 text-primary" />,
    title: '3. We Buy & Ship',
    description:
      'Once you approve the quote, we purchase the item for you and ship it to our secure facility.',
  },
  {
    icon: <Home className="h-12 w-12 text-primary" />,
    title: '4. Receive at Home',
    description: 'We handle customs and deliver your package right to your doorstep, hassle-free.',
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-16 md:py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-blue-50" />
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="container relative z-10 px-4">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-4">
            Get Anything in 4 Simple Steps
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Our process is designed to be simple, transparent, and fast.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {steps.map((step, index) => (
            <Card
              key={index}
              className="group backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 md:p-8 transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:bg-white/30 hover:border-primary/30 text-center"
              style={{
                animationDelay: `${index * 150}ms`,
              }}
            >
              <CardContent className="p-0">
                <div className="flex justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <div className="backdrop-blur-xl bg-primary/10 border border-primary/20 rounded-2xl p-4 group-hover:bg-primary/20 group-hover:border-primary/40 transition-all duration-300">
                    {step.icon}
                  </div>
                </div>
                <CardHeader className="p-0">
                  <CardTitle className="text-xl md:text-2xl font-bold mb-3 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent group-hover:from-primary group-hover:to-primary/70 transition-all duration-300">
                    {step.title}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                    {step.description}
                  </CardDescription>
                </CardHeader>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
