import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParallaxSection } from "@/components/shared/ParallaxSection";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { LazyImage } from "@/components/ui/lazy-image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Award, Globe, Package, Shield, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const About = () => {
  const stats = [
    { value: 50000, label: "Happy Customers", prefix: "", suffix: "+" },
    { value: 100, label: "Countries Served", prefix: "", suffix: "+" },
    { value: 5, label: "Years of Experience", prefix: "", suffix: " Years" },
    { value: 98, label: "Customer Satisfaction", prefix: "", suffix: "%" }
  ];

  const values = [
    {
      icon: Shield,
      title: "Trust & Security",
      description: "Your security is our top priority. We use bank-level encryption and secure payment processing.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: Zap,
      title: "Speed & Efficiency",
      description: "Fast processing and reliable shipping. We optimize every step of the journey.",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: Globe,
      title: "Global Reach",
      description: "Access products from anywhere in the world, delivered to your doorstep.",
      color: "from-green-500 to-green-600"
    },
    {
      icon: Users,
      title: "Customer First",
      description: "24/7 support and transparent communication throughout your shopping journey.",
      color: "from-orange-500 to-orange-600"
    }
  ];

  const timeline = [
    { year: "2019", title: "Founded", description: "Started with a vision to make global shopping accessible" },
    { year: "2020", title: "First 1000 Customers", description: "Reached our first milestone during challenging times" },
    { year: "2021", title: "Expanded Services", description: "Added express shipping and customs clearance" },
    { year: "2022", title: "Global Network", description: "Established partnerships in 50+ countries" },
    { year: "2023", title: "Tech Innovation", description: "Launched AI-powered cost estimation" },
    { year: "2024", title: "Market Leader", description: "Became the trusted choice for international shopping" }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <ParallaxSection 
        className="min-h-[500px] flex items-center"
        backgroundImage="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&h=1080&fit=crop"
        overlayOpacity={0.7}
      >
        <div className="container py-20">
          <AnimatedSection animation="fadeInUp" className="text-center text-white max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Bridging the World of Shopping
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200">
              Your trusted partner for international shipping and customs clearance since 2019
            </p>
            <Button size="lg" className="group" asChild>
              <Link to="/quote">
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </AnimatedSection>
        </div>
      </ParallaxSection>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <AnimatedSection 
                key={index} 
                animation="zoomIn" 
                delay={index * 100}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                  <AnimatedCounter 
                    end={stat.value} 
                    prefix={stat.prefix} 
                    suffix={stat.suffix}
                  />
                </div>
                <p className="text-gray-600">{stat.label}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <AnimatedSection animation="fadeInUp">
              <Card className="overflow-hidden">
                <CardHeader className="text-center pb-12">
                  <CardTitle className="text-3xl md:text-4xl">Our Mission</CardTitle>
                </CardHeader>
                <CardContent className="pb-12">
                  <p className="text-lg text-muted-foreground text-center leading-relaxed">
                    We simplify international shipping by providing transparent pricing, 
                    reliable service, and expert customs handling. Our goal is to make 
                    global commerce accessible to everyone, from individual shoppers to 
                    growing businesses. We believe that geographical boundaries shouldn't 
                    limit your shopping choices.
                  </p>
                </CardContent>
              </Card>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="container">
          <AnimatedSection animation="fadeInUp" className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Core Values</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              These principles guide everything we do
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <AnimatedSection
                key={index}
                animation="fadeInUp"
                delay={index * 100}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${value.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <value.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                    <p className="text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20">
        <div className="container">
          <AnimatedSection animation="fadeInUp" className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Journey</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From humble beginnings to global reach
            </p>
          </AnimatedSection>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

              {/* Timeline Items */}
              {timeline.map((item, index) => (
                <AnimatedSection
                  key={index}
                  animation={index % 2 === 0 ? "fadeInLeft" : "fadeInRight"}
                  delay={index * 150}
                  className="relative flex items-center mb-8"
                >
                  <div className="absolute left-8 w-4 h-4 bg-primary rounded-full -translate-x-1/2 z-10"></div>
                  <div className={`ml-20 ${index % 2 === 0 ? 'pr-8' : 'pl-8'}`}>
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="text-sm text-primary font-semibold mb-1">{item.year}</div>
                        <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                        <p className="text-muted-foreground">{item.description}</p>
                      </CardContent>
                    </Card>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          <AnimatedSection animation="fadeInUp" className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Leadership Team</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Meet the people making global shopping accessible
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { name: "Sarah Chen", role: "CEO & Founder", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop" },
              { name: "Michael Kumar", role: "CTO", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop" },
              { name: "Emily Rodriguez", role: "Head of Operations", image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop" }
            ].map((member, index) => (
              <AnimatedSection
                key={index}
                animation="zoomIn"
                delay={index * 100}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <LazyImage
                    src={member.image}
                    alt={member.name}
                    className="w-full h-64 object-cover"
                  />
                  <CardContent className="p-6 text-center">
                    <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
                    <p className="text-muted-foreground">{member.role}</p>
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container">
          <AnimatedSection animation="fadeInUp" className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Shop the World?
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Join thousands of happy customers who trust us with their international shopping needs
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/quote">Get a Quote</Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white hover:text-blue-600" asChild>
                <Link to="/contact">Contact Us</Link>
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
};

export default About;