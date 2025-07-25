import { motion } from 'framer-motion';
import { useState } from 'react';
import { SectionHeading, SectionDescription, H4, BodySmall } from '@/components/ui/typography';
import {
  Search,
  Calculator,
  ShoppingBag,
  Truck,
  CheckCircle,
  Shield,
  Clock,
  Globe,
  Star,
  ArrowRight,
  PlayCircle,
} from 'lucide-react';

const steps = [
  {
    id: 1,
    title: 'Find Your Product',
    description:
      'Share the product link from Amazon, Flipkart, eBay, Alibaba or any international store',
    subPoints: ['500+ stores supported', 'Instant link verification', 'Real-time price tracking'],
    icon: Search,
    trustBadge: { icon: Globe, text: 'Global Stores' },
    timeframe: '< 1 minute',
    color: 'from-teal-500 to-cyan-500',
    bgGradient: 'from-teal-50 to-cyan-50',
    example: 'amazon.com/dp/B08N5WRWNW',
  },
  {
    id: 2,
    title: 'Get Instant Quote',
    description:
      'Transparent pricing with shipping, customs, taxes, and all fees calculated upfront',
    subPoints: ['No hidden charges', 'Live exchange rates', 'Customs duty included'],
    icon: Calculator,
    trustBadge: { icon: Shield, text: 'Transparent Pricing' },
    timeframe: 'Within seconds',
    color: 'from-cyan-500 to-teal-500',
    bgGradient: 'from-cyan-50 to-teal-50',
    example: '$89 + $15 shipping + $12 customs = $116 total',
  },
  {
    id: 3,
    title: 'Secure Purchase',
    description: 'Our verified team purchases the product using secure payment methods',
    subPoints: ['Buyer protection included', 'Quality verification', 'Purchase confirmation'],
    icon: ShoppingBag,
    trustBadge: { icon: Shield, text: 'Secure Payment' },
    timeframe: '1-2 business days',
    color: 'from-teal-500 to-cyan-500',
    bgGradient: 'from-blue-50 to-indigo-50',
    example: 'Order #IW12345 confirmed ✓',
  },
  {
    id: 4,
    title: 'International Shipping',
    description: 'We handle global shipping, customs clearance, and all import procedures',
    subPoints: ['Express shipping options', 'Customs handled', 'Full package insurance'],
    icon: Truck,
    trustBadge: { icon: Shield, text: 'Insured Shipping' },
    timeframe: '5-15 business days',
    color: 'from-cyan-500 to-orange-500',
    bgGradient: 'from-indigo-50 to-purple-50',
    example: 'DHL tracking: EN123456789US',
  },
  {
    id: 5,
    title: 'Doorstep Delivery',
    description: 'Receive your package safely at your doorstep with tracking and support',
    subPoints: ['Real-time tracking', '24/7 customer support', 'Delivery guarantee'],
    icon: CheckCircle,
    trustBadge: { icon: Clock, text: 'On-Time Delivery' },
    timeframe: 'Guaranteed delivery',
    color: 'from-orange-500 to-pink-500',
    bgGradient: 'from-orange-50 to-red-50',
    example: 'Delivered to your door 📦',
  },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    location: 'Mumbai, India',
    text: 'Saved 40% compared to local stores. Amazing service!',
    rating: 5,
    avatar: '👩‍💼',
  },
  {
    name: 'Raj Patel',
    location: 'Kathmandu, Nepal',
    text: 'Finally got my favorite US brands delivered hassle-free.',
    rating: 5,
    avatar: '👨‍💻',
  },
  {
    name: 'Priya Sharma',
    location: 'Delhi, India',
    text: 'Transparent pricing and excellent tracking. Highly recommended!',
    rating: 5,
    avatar: '👩‍🎓',
  },
];

export const EnhancedHowItWorksSection = () => {
  const [activeStep, setActiveStep] = useState(1);

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        {/* Compact Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            How iwishBag Works
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Simple, transparent international shopping in 4 easy steps
          </p>
        </div>

        {/* Compact Steps Grid - Only 4 steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {steps.slice(0, 4).map((step, index) => (
            <div
              key={step.id}
              className="text-center p-6 rounded-xl bg-gray-50 hover:bg-teal-50 transition-all duration-300 group cursor-pointer"
              onMouseEnter={() => setActiveStep(step.id)}
            >
              {/* Step Number */}
              <div className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-lg mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                {step.id}
              </div>

              {/* Icon */}
              <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center mb-4 mx-auto shadow-sm group-hover:shadow-md transition-shadow duration-300">
                <step.icon className="w-8 h-8 text-teal-600" />
              </div>

              {/* Content */}
              <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                {step.description}
              </p>
              
              {/* Timeframe */}
              <div className="text-xs text-teal-600 font-medium bg-teal-100 rounded-full px-3 py-1 inline-block">
                {step.timeframe}
              </div>
            </div>
          ))}
        </div>

        {/* Simple CTA */}
        <div className="text-center">
          <button
            onClick={() => (window.location.href = '/quote')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors duration-300 shadow-lg hover:shadow-xl"
          >
            Get Your Quote Now
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-sm text-gray-500 mt-4">
            ✓ No signup required • ✓ Instant pricing • ✓ 100% transparent
          </p>
        </div>
      </div>
    </section>
  );
};
