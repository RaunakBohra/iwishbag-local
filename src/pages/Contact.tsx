import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Display, H1, H2, H3, BodyLarge, Body } from '@/components/ui/typography';
import { Section, Container } from '@/components/ui/spacing';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  MessageCircle,
  Send,
  CheckCircle,
  ArrowRight,
  Globe,
  Zap,
  Shield,
  Ticket,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/design-system';
import { Link } from 'react-router-dom';
// import { TurnstileProtectedForm } from '@/components/security/TurnstileProtectedForm'; // Component removed
import { ContactTicketForm } from '@/components/support/ContactTicketForm';
import { businessHoursService } from '@/config/businessHours';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [isVisible, setIsVisible] = useState({ hero: false, form: false, faq: false });
  const { toast } = useToast();

  useEffect(() => {
    const handleScroll = () => {
      const heroElement = document.getElementById('hero-section');
      const formElement = document.getElementById('form-section');
      const faqElement = document.getElementById('faq-section');

      const checkVisibility = (element: Element | null) => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return rect.top < window.innerHeight * 0.8 && rect.bottom > 0;
      };

      setIsVisible({
        hero: checkVisibility(heroElement),
        form: checkVisibility(formElement),
        faq: checkVisibility(faqElement),
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { data: footerSettings } = useQuery({
    queryKey: ['footer-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('footer_settings').select('*').single();
      if (error) {
        console.error('Error fetching footer settings:', error);
        return null;
      }
      return data;
    },
  });

  const handleSubmit = async (turnstileToken?: string) => {
    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          turnstileToken,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Message sent!',
        description: "We'll get back to you within 24 hours.",
      });
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error('Contact form error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send message. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Business hours status
  const isCurrentlyBusinessHours = businessHoursService.isCurrentlyBusinessHours();
  const businessHoursMessage = businessHoursService.getAutoResponseMessage();

  const contactMethods = [
    {
      icon: Mail,
      title: 'Quick Contact',
      description: 'General questions & inquiries',
      contact: footerSettings?.email || 'contact@iwishbag.com',
      availability: isCurrentlyBusinessHours
        ? 'We respond within 4 hours during business hours'
        : 'We respond by next business day',
      bgColor: 'bg-teal-50',
      iconColor: 'text-teal-600',
      type: 'email',
    },
    {
      icon: Ticket,
      title: 'Order Support',
      description: 'Help with orders & tracking',
      contact: 'Track your issue with tickets',
      availability: isCurrentlyBusinessHours
        ? 'Support team is online now'
        : 'Next response during business hours',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      type: 'ticket',
    },
    {
      icon: MessageCircle,
      title: 'Live Chat',
      description: 'Real-time assistance',
      contact: isCurrentlyBusinessHours ? 'Support team available now' : 'Currently offline',
      availability: 'Mon-Fri: 10 AM - 5 PM IST',
      bgColor: isCurrentlyBusinessHours ? 'bg-green-50' : 'bg-gray-50',
      iconColor: isCurrentlyBusinessHours ? 'text-green-600' : 'text-gray-600',
      type: 'chat',
    },
  ];

  const features = [
    {
      icon: Zap,
      title: 'Fast Response',
      description: 'Get answers within 24 hours',
    },
    {
      icon: Shield,
      title: 'Expert Support',
      description: 'Our team knows international shipping',
    },
    {
      icon: Globe,
      title: 'Global Coverage',
      description: 'We support customers worldwide',
    },
  ];

  const faqs = [
    {
      question: 'How long does shipping take?',
      answer:
        'Typically 7-21 business days depending on the destination country and customs processing.',
    },
    {
      question: 'How are customs duties calculated?',
      answer:
        'Based on product category, declared value, and destination country regulations. Our calculator provides accurate estimates.',
    },
    {
      question: 'Can I track my shipment?',
      answer:
        "Yes! You'll receive tracking information as soon as your order ships, with real-time updates.",
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, PayPal, and bank transfers for your convenience.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Contact Methods Section */}
      <Section className="py-8 bg-white">
        <Container>
          <div className="text-center mb-8">
            <H2 className="mb-4 text-gray-900 text-2xl">Help Center</H2>
            <Body className="text-gray-600 max-w-2xl mx-auto text-sm">
              Choose the best way to get help with your international shopping needs.
            </Body>
          </div>

          {/* Business Hours Status */}
          <div
            className={`mx-auto max-w-md mb-6 p-4 rounded-lg border text-center ${
              isCurrentlyBusinessHours
                ? 'bg-green-50 border-green-200'
                : 'bg-orange-50 border-orange-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock
                className={`w-4 h-4 ${isCurrentlyBusinessHours ? 'text-green-600' : 'text-orange-600'}`}
              />
              <span
                className={`font-medium text-sm ${isCurrentlyBusinessHours ? 'text-green-900' : 'text-orange-900'}`}
              >
                {isCurrentlyBusinessHours
                  ? '🟢 Support team is online'
                  : '🔴 Support team is offline'}
              </span>
            </div>
            <p
              className={`text-xs ${isCurrentlyBusinessHours ? 'text-green-700' : 'text-orange-700'}`}
            >
              Business hours: Monday - Friday, 10:00 AM - 5:00 PM IST
            </p>
            <p
              className={`text-xs mt-1 ${isCurrentlyBusinessHours ? 'text-green-600' : 'text-orange-600'}`}
            >
              {businessHoursMessage}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {contactMethods.map((method, index) => (
              <div key={index}>
                {method.type === 'email' ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="group p-4 md:p-6 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
                        <div className="flex flex-col md:flex-col items-center md:items-center text-center md:text-center">
                          <div
                            className={`w-12 h-12 md:w-16 md:h-16 ${method.bgColor} rounded-full flex items-center justify-center mb-4 md:mb-4 group-hover:scale-110 transition-transform flex-shrink-0`}
                          >
                            <method.icon className={`w-6 h-6 md:w-8 md:h-8 ${method.iconColor}`} />
                          </div>
                          <div className="flex-1 md:flex-none">
                            <H3 className="mb-1 md:mb-2 text-gray-900 text-base md:text-lg">
                              {method.title}
                            </H3>
                            <Body className="text-gray-600 mb-2 md:mb-3 text-xs md:text-sm">
                              {method.description}
                            </Body>
                            <Body className="font-medium text-gray-900 mb-1 text-xs md:text-sm">
                              {method.contact}
                            </Body>
                            <Body className="text-xs text-gray-500">{method.availability}</Body>
                          </div>
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Send us a message</DialogTitle>
                      </DialogHeader>
                      <div className="mt-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <Label
                                htmlFor="modal-name"
                                className="text-sm font-medium text-gray-700 mb-2 block"
                              >
                                Name *
                              </Label>
                              <Input
                                id="modal-name"
                                name="name"
                                type="text"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Your full name"
                                className="h-10 border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                              />
                            </div>
                            <div>
                              <Label
                                htmlFor="modal-email"
                                className="text-sm font-medium text-gray-700 mb-2 block"
                              >
                                Email *
                              </Label>
                              <Input
                                id="modal-email"
                                name="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="your@email.com"
                                className="h-10 border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                              />
                            </div>
                          </div>

                          <div>
                            <Label
                              htmlFor="modal-subject"
                              className="text-sm font-medium text-gray-700 mb-2 block"
                            >
                              Subject *
                            </Label>
                            <Input
                              id="modal-subject"
                              name="subject"
                              type="text"
                              required
                              value={formData.subject}
                              onChange={handleChange}
                              placeholder="What can we help you with?"
                              className="h-10 border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                            />
                          </div>

                          <div>
                            <Label
                              htmlFor="modal-message"
                              className="text-sm font-medium text-gray-700 mb-2 block"
                            >
                              Message *
                            </Label>
                            <Textarea
                              id="modal-message"
                              name="message"
                              required
                              rows={4}
                              value={formData.message}
                              onChange={handleChange}
                              placeholder="Tell us more about your shipping needs..."
                              className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 resize-none"
                            />
                          </div>
                          <Button
                            type="submit"
                            disabled={
                              isSubmitting ||
                              !formData.name ||
                              !formData.email ||
                              !formData.subject ||
                              !formData.message
                            }
                            className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white font-medium group"
                          >
                            {isSubmitting ? 'Sending...' : 'Send Message'}
                          </Button>
                        </form>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : method.type === 'ticket' ? (
                  <div
                    className="group p-4 md:p-6 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => setShowTicketForm(true)}
                  >
                    <div className="flex flex-col md:flex-col items-center md:items-center text-center md:text-center">
                      <div
                        className={`w-12 h-12 md:w-16 md:h-16 ${method.bgColor} rounded-full flex items-center justify-center mb-4 md:mb-4 group-hover:scale-110 transition-transform flex-shrink-0`}
                      >
                        <method.icon className={`w-6 h-6 md:w-8 md:h-8 ${method.iconColor}`} />
                      </div>
                      <div className="flex-1 md:flex-none">
                        <H3 className="mb-1 md:mb-2 text-gray-900 text-base md:text-lg">
                          {method.title}
                        </H3>
                        <Body className="text-gray-600 mb-2 md:mb-3 text-xs md:text-sm">
                          {method.description}
                        </Body>
                        <Body className="font-medium text-gray-900 mb-1 text-xs md:text-sm">
                          {method.contact}
                        </Body>
                        <Body className="text-xs text-gray-500">{method.availability}</Body>
                      </div>
                    </div>
                  </div>
                ) : method.type === 'chat' ? (
                  <Link to="/messages" className="block">
                    <div className="group p-4 md:p-6 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
                      <div className="flex flex-col md:flex-col items-center md:items-center text-center md:text-center">
                        <div
                          className={`w-12 h-12 md:w-16 md:h-16 ${method.bgColor} rounded-full flex items-center justify-center mb-4 md:mb-4 group-hover:scale-110 transition-transform flex-shrink-0`}
                        >
                          <method.icon className={`w-6 h-6 md:w-8 md:h-8 ${method.iconColor}`} />
                        </div>
                        <div className="flex-1 md:flex-none">
                          <H3 className="mb-1 md:mb-2 text-gray-900 text-base md:text-lg">
                            {method.title}
                          </H3>
                          <Body className="text-gray-600 mb-2 md:mb-3 text-xs md:text-sm">
                            {method.description}
                          </Body>
                          <Body className="font-medium text-gray-900 mb-1 text-xs md:text-sm">
                            {method.contact}
                          </Body>
                          <Body className="text-xs text-gray-500">{method.availability}</Body>
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="group p-4 md:p-6 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
                    <div className="flex flex-col md:flex-col items-center md:items-center text-center md:text-center">
                      <div
                        className={`w-12 h-12 md:w-16 md:h-16 ${method.bgColor} rounded-full flex items-center justify-center mb-4 md:mb-4 group-hover:scale-110 transition-transform flex-shrink-0`}
                      >
                        <method.icon className={`w-6 h-6 md:w-8 md:h-8 ${method.iconColor}`} />
                      </div>
                      <div className="flex-1 md:flex-none">
                        <H3 className="mb-1 md:mb-2 text-gray-900 text-base md:text-lg">
                          {method.title}
                        </H3>
                        <Body className="text-gray-600 mb-2 md:mb-3 text-xs md:text-sm">
                          {method.description}
                        </Body>
                        <Body className="font-medium text-gray-900 mb-1 text-xs md:text-sm">
                          {method.contact}
                        </Body>
                        <Body className="text-xs text-gray-500">{method.availability}</Body>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Ticket Form Dialog */}
      <Dialog open={showTicketForm} onOpenChange={setShowTicketForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
          </DialogHeader>
          <ContactTicketForm onSuccess={() => setShowTicketForm(false)} className="mt-4" />
        </DialogContent>
      </Dialog>

      {/* FAQ Section */}
      <Section id="faq-section" className="py-8 bg-white">
        <Container>
          <div
            className={cn(
              'transition-all duration-1000',
              isVisible.faq ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10',
            )}
          >
            <div className="text-center mb-8">
              <H2 className="mb-4 text-gray-900 text-2xl">Frequently Asked Questions</H2>
              <Body className="text-gray-600 max-w-2xl mx-auto text-sm">
                Find quick answers to common questions about our international shipping services.
              </Body>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <H3 className="text-gray-900 mb-3 text-base">{faq.question}</H3>
                  <Body className="text-gray-600 text-sm">{faq.answer}</Body>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Body className="text-gray-600 mb-6 text-sm">
                Can't find what you're looking for?
              </Body>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3"
                onClick={() => {
                  document.getElementById('form-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Send us a message
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
};

export default Contact;
