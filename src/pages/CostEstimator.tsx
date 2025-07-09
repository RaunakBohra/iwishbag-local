import { OptimizedCostEstimator } from "@/components/shared/OptimizedCostEstimator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParallaxSection } from "@/components/shared/ParallaxSection";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { Button } from "@/components/ui/button";
import { Calculator, Globe, Shield, Zap, TrendingUp, Package, DollarSign, Info } from "lucide-react";
import { Link } from "react-router-dom";

const CostEstimatorPage = () => {
  const features = [
    {
      icon: Calculator,
      title: "Accurate Calculations",
      description: "Real-time cost estimation with all fees included",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: Globe,
      title: "Global Coverage",
      description: "Support for 100+ countries and currencies",
      color: "from-green-500 to-green-600"
    },
    {
      icon: Shield,
      title: "Transparent Pricing",
      description: "No hidden fees or surprise charges",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: Zap,
      title: "Instant Results",
      description: "Get your quote in seconds, not hours",
      color: "from-orange-500 to-orange-600"
    }
  ];

  const stats = [
    { value: 500000, label: "Calculations Made", suffix: "+" },
    { value: 98, label: "Accuracy Rate", suffix: "%" },
    { value: 3, label: "Average Time", suffix: " sec" }
  ];

  const steps = [
    {
      number: "1",
      title: "Enter Product Details",
      description: "Product URL, price, weight, and category"
    },
    {
      number: "2",
      title: "Select Destination",
      description: "Choose your country and shipping method"
    },
    {
      number: "3",
      title: "Get Instant Quote",
      description: "See total cost with all fees included"
    },
    {
      number: "4",
      title: "Place Your Order",
      description: "Proceed with confidence knowing the exact cost"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <ParallaxSection 
        className="min-h-[500px] flex items-center"
        backgroundImage="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1920&h=1080&fit=crop"
        overlayOpacity={0.7}
      >
        <div className="container py-20">
          <AnimatedSection animation="fadeInUp" className="text-center text-white max-w-4xl mx-auto">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-6">
              <Calculator className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Cost Estimator
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200">
              Calculate your total international shopping cost instantly with complete transparency
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <a href="#calculator">
                  Start Calculating
                </a>
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white hover:text-blue-600" asChild>
                <Link to="/quote">
                  Get Full Quote
                </Link>
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </ParallaxSection>

      {/* Stats Section */}
      <section className="py-12 -mt-16 relative z-10">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-6">
            {stats.map((stat, index) => (
              <AnimatedSection key={index} animation="zoomIn" delay={index * 100}>
                <Card className="text-center hover:shadow-lg transition-all duration-300 bg-white/95 backdrop-blur-sm transform hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="text-4xl font-bold text-primary mb-2">
                      <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                    </div>
                    <p className="text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <AnimatedSection animation="fadeInUp" className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Use Our Calculator?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get accurate cost estimates before you buy
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <AnimatedSection
                key={index}
                animation="fadeInUp"
                delay={index * 100}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 group">
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section id="calculator" className="py-20 bg-gray-50">
        <div className="container">
          <AnimatedSection animation="fadeInUp">
            <div className="w-full max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Calculate Your Cost
                </h2>
                <p className="text-xl text-muted-foreground">
                  Enter your details below for an instant estimate
                </p>
              </div>
              
              <Card className="shadow-2xl border-0 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-1">
                  <div className="bg-background rounded-t-lg">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-2xl flex items-center justify-center gap-2">
                        <Calculator className="w-6 h-6 text-primary" />
                        Cost Calculator
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <OptimizedCostEstimator variant="tools" />
                    </CardContent>
                  </div>
                </div>
              </Card>
              
              <AnimatedSection animation="fadeIn" delay={300} className="mt-6 text-center">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Info className="w-4 h-4" />
                  All prices include shipping, customs, and handling fees
                </p>
              </AnimatedSection>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container">
          <AnimatedSection animation="fadeInUp" className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Simple steps to get your cost estimate
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <AnimatedSection
                key={index}
                animation="fadeInUp"
                delay={index * 150}
                className="relative"
              >
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary to-transparent" />
                )}
                
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold mb-4 mx-auto transform hover:scale-110 transition-transform">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Cost Breakdown Section */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          <AnimatedSection animation="fadeInUp" className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Understanding Your Costs
              </h2>
              <p className="text-xl text-muted-foreground">
                Complete breakdown of international shopping expenses
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: Package,
                  title: "Product Cost",
                  items: ["Original product price", "Local taxes if applicable", "Seller fees"],
                  color: "text-blue-600"
                },
                {
                  icon: Globe,
                  title: "Shipping Fees",
                  items: ["International shipping", "Handling charges", "Insurance (optional)"],
                  color: "text-green-600"
                },
                {
                  icon: DollarSign,
                  title: "Customs & Duties",
                  items: ["Import duties", "Customs clearance", "Local taxes"],
                  color: "text-purple-600"
                },
                {
                  icon: TrendingUp,
                  title: "Service Fees",
                  items: ["Processing fee", "Currency conversion", "Payment gateway"],
                  color: "text-orange-600"
                }
              ].map((category, index) => (
                <AnimatedSection key={index} animation="fadeInLeft" delay={index * 100}>
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <category.icon className={`w-6 h-6 ${category.color}`} />
                        {category.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {category.items.map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-muted-foreground">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container">
          <AnimatedSection animation="fadeInUp" className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Shop Globally?
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Start with our calculator and get transparent pricing for your international purchases
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/quote">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white hover:text-blue-600" asChild>
                <Link to="/contact">Need Help?</Link>
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
};

export default CostEstimatorPage;