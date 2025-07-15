import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Clock, MessageSquare, Send, CheckCircle, HelpCircle, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ParallaxSection } from "@/components/shared/ParallaxSection";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { data: footerSettings } = useQuery({
    queryKey: ['footer-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('footer_settings')
        .select('*')
        .single();
      
      if (error) {
        console.error('Error fetching footer settings:', error);
        return null;
      }
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Message sent!",
        description: "We'll get back to you within 24 hours.",
      });
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      console.error('Contact form error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send message. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const contactMethods = [
    {
      icon: Mail,
      title: "Email Us",
      primary: footerSettings?.primary_email || "support@wishbag.com",
      secondary: footerSettings?.support_email,
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: Phone,
      title: "Call Us",
      primary: footerSettings?.primary_phone || "+1 (555) 123-4567",
      secondary: footerSettings?.secondary_phone,
      color: "from-green-500 to-green-600"
    },
    {
      icon: Clock,
      title: "Business Hours",
      primary: footerSettings?.business_hours || "24/7 Customer Support",
      secondary: "Quick response guaranteed",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: MessageSquare,
      title: "Live Chat",
      primary: "Chat with our team",
      secondary: "Average response: 2 minutes",
      color: "from-orange-500 to-orange-600"
    }
  ];

  const faqs = [
    {
      question: "How long does international shipping take?",
      answer: "Typically 7-21 business days depending on the destination country and customs processing. Express shipping options are available for faster delivery."
    },
    {
      question: "How are customs duties calculated?",
      answer: "Customs duties are calculated based on the product category, declared value, and destination country regulations. Our calculator provides accurate estimates upfront."
    },
    {
      question: "Can I track my shipment?",
      answer: "Yes! You'll receive tracking information as soon as your order ships. Track your package in real-time through our dashboard or the carrier's website."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards, PayPal, Google Pay, Apple Pay, and bank transfers. All payments are secured with SSL encryption."
    },
    {
      question: "What if my package is damaged or lost?",
      answer: "All shipments are insured. If your package is damaged or lost, we'll work with the carrier to file a claim and ensure you receive a replacement or refund."
    },
    {
      question: "Do you handle returns?",
      answer: "Yes, we facilitate returns according to the seller's return policy. We'll handle the international return shipping and ensure you receive your refund."
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <ParallaxSection 
        className="min-h-[400px] flex items-center"
        backgroundImage="https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=1920&h=1080&fit=crop"
        overlayOpacity={0.7}
      >
        <div className="container py-16">
          <AnimatedSection animation="fadeInUp" className="text-center text-white max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Get in Touch
            </h1>
            <p className="text-xl md:text-2xl text-gray-200">
              We're here to help with all your international shipping needs
            </p>
          </AnimatedSection>
        </div>
      </ParallaxSection>

      {/* Contact Methods */}
      <section className="py-16 -mt-20 relative z-10">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactMethods.map((method, index) => (
              <AnimatedSection key={index} animation="fadeInUp" delay={index * 100}>
                <Card className="h-full hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${method.color} flex items-center justify-center mb-4`}>
                      <method.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{method.title}</h3>
                    <p className="text-sm font-medium text-gray-900">{method.primary}</p>
                    {method.secondary && (
                      <p className="text-sm text-muted-foreground mt-1">{method.secondary}</p>
                    )}
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <AnimatedSection animation="fadeInLeft">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Send className="w-6 h-6 text-primary" />
                    Send us a message
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="flex items-center gap-1">
                          Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="transition-all focus:scale-[1.02]"
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-1">
                          Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="transition-all focus:scale-[1.02]"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="flex items-center gap-1">
                        Subject <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className="transition-all focus:scale-[1.02]"
                        placeholder="How can we help?"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="message" className="flex items-center gap-1">
                        Message <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="message"
                        name="message"
                        rows={5}
                        value={formData.message}
                        onChange={handleChange}
                        required
                        className="transition-all focus:scale-[1.02] resize-none"
                        placeholder="Tell us more about your inquiry..."
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className="w-full group"
                      size="lg"
                    >
                      {isSubmitting ? (
                        "Sending..."
                      ) : (
                        <>
                          Send Message
                          <Send className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>We typically respond within 24 hours</span>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </AnimatedSection>

            {/* Location & FAQ */}
            <div className="space-y-6">
              {/* Office Location */}
              <AnimatedSection animation="fadeInRight">
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <MapPin className="w-6 h-6 text-primary" />
                      Our Offices
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-2">Headquarters</h4>
                      <p className="text-muted-foreground whitespace-pre-line">
                        {footerSettings?.primary_address || "123 Business Ave\nSuite 100\nSan Francisco, CA 94105\nUnited States"}
                      </p>
                    </div>
                    {footerSettings?.secondary_address && (
                      <div>
                        <h4 className="font-semibold mb-2">Regional Office</h4>
                        <p className="text-muted-foreground whitespace-pre-line">
                          {footerSettings.secondary_address}
                        </p>
                      </div>
                    )}
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.0977705315845!2d-122.39445708468219!3d37.78779307975775!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8085807c4f1a0b45%3A0x4e3c6e9c7c8e3b8f!2sSan%20Francisco%2C%20CA!5e0!3m2!1sen!2sus!4v1623456789012!5m2!1sen!2sus"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  </CardContent>
                </Card>
              </AnimatedSection>

              {/* FAQ Section */}
              <AnimatedSection animation="fadeInRight" delay={200}>
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <HelpCircle className="w-6 h-6 text-primary" />
                      Frequently Asked Questions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {faqs.map((faq, index) => (
                        <AccordionItem key={index} value={`item-${index}`}>
                          <AccordionTrigger className="text-left hover:text-primary transition-colors">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </section>

      {/* Response Time Stats */}
      <section className="py-16 bg-gray-50">
        <div className="container">
          <AnimatedSection animation="fadeInUp" className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Commitment to You</h2>
            <p className="text-xl text-muted-foreground">Fast, reliable support when you need it</p>
          </AnimatedSection>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { value: 2, label: "Average Response Time", suffix: " min" },
              { value: 98, label: "Customer Satisfaction", suffix: "%" },
              { value: 24, label: "Support Availability", suffix: "/7" },
              { value: 15, label: "Languages Supported", suffix: "+" }
            ].map((stat, index) => (
              <AnimatedSection key={index} animation="zoomIn" delay={index * 100} className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-muted-foreground">{stat.label}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;