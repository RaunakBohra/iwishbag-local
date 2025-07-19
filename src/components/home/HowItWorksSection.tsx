import { motion } from 'framer-motion';
import { SectionHeading, SectionDescription, H4, BodySmall } from '@/components/ui/typography';
import { Search, Calculator, ShoppingBag, Truck, CheckCircle, Shield, Clock, Globe } from 'lucide-react';

const steps = [
  {
    id: 1,
    title: 'Find Your Product',
    description: 'Share the product link from Amazon, Flipkart, eBay, Alibaba or any international store',
    subPoints: ['Support for 500+ stores', 'Instant link verification', 'Real-time price tracking'],
    icon: Search,
    trustBadge: { icon: Globe, text: 'Global Stores' },
    timeframe: '< 1 minute',
  },
  {
    id: 2,
    title: 'Get Instant Quote',
    description: 'Transparent pricing with shipping, customs, taxes, and all fees calculated upfront',
    subPoints: ['No hidden charges', 'Live exchange rates', 'Customs duty included'],
    icon: Calculator,
    trustBadge: { icon: Shield, text: 'Transparent Pricing' },
    timeframe: 'Within seconds',
  },
  {
    id: 3,
    title: 'Secure Purchase',
    description: 'Our verified team purchases the product using secure payment methods',
    subPoints: ['Buyer protection included', 'Quality verification', 'Purchase confirmation'],
    icon: ShoppingBag,
    trustBadge: { icon: Shield, text: 'Secure Payment' },
    timeframe: '1-2 business days',
  },
  {
    id: 4,
    title: 'International Shipping',
    description: 'We handle global shipping, customs clearance, and all import procedures',
    subPoints: ['Express shipping options', 'Customs handled', 'Full package insurance'],
    icon: Truck,
    trustBadge: { icon: Shield, text: 'Insured Shipping' },
    timeframe: '5-15 business days',
  },
  {
    id: 5,
    title: 'Doorstep Delivery',
    description: 'Receive your package safely at your doorstep with tracking and support',
    subPoints: ['Real-time tracking', '24/7 customer support', 'Delivery guarantee'],
    icon: CheckCircle,
    trustBadge: { icon: Clock, text: 'On-Time Delivery' },
    timeframe: 'Guaranteed delivery',
  },
];

export const HowItWorksSection = () => {
  return (
    <section className="py-16 lg:py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16 lg:mb-20 px-4 lg:px-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-full text-sm font-medium mb-6"
          >
            <Shield className="w-4 h-4" />
            Trusted by 10,000+ customers
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <SectionHeading className="mb-4 lg:mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent text-3xl lg:text-4xl">
              How iwishBag Works
            </SectionHeading>
            <SectionDescription className="mx-auto max-w-2xl text-base lg:text-lg px-4 lg:px-0">
              From product discovery to doorstep delivery, we've streamlined international shopping 
              into a simple, transparent, and secure 5-step process.
            </SectionDescription>
          </motion.div>
        </div>

        {/* Steps Container */}
        <div className="relative max-w-7xl mx-auto">
          {/* Desktop Connection Line */}
          <div className="absolute top-32 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-teal-200 to-transparent transform hidden lg:block" />

          {/* Mobile Connection Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-teal-200 to-transparent transform lg:hidden" />

          {/* Steps */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 relative">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="relative"
              >
                {/* Step Card */}
                <div className="group relative bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 hover:border-teal-200 transition-all duration-300 hover:shadow-lg hover:shadow-teal-50 h-full ml-8 lg:ml-0 lg:flex lg:flex-col">
                  {/* Mobile: Step Number on the left */}
                  <div className="absolute -left-10 top-6 lg:top-auto lg:-top-4 lg:left-8 w-8 h-8 bg-gradient-to-r from-teal-600 to-teal-700 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg z-10">
                    {step.id}
                  </div>

                  {/* Mobile: Timeframe Badge - repositioned */}
                  <div className="absolute -top-3 right-4 lg:right-8 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
                    {step.timeframe}
                  </div>

                  {/* Mobile Layout */}
                  <div className="lg:hidden">
                    {/* Mobile Header Row */}
                    <div className="flex items-start gap-4">
                      {/* Icon Container - smaller on mobile */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <step.icon className="w-6 h-6 text-teal-600" />
                      </div>

                      {/* Title and Description */}
                      <div className="flex-1 min-w-0">
                        <H4 className="mb-2 text-gray-900 text-left">
                          {step.title}
                        </H4>
                        <BodySmall className="text-gray-600 leading-relaxed text-left">
                          {step.description}
                        </BodySmall>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden lg:flex lg:flex-col lg:h-full">
                    {/* Icon Container */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                      <step.icon className="w-8 h-8 text-teal-600" />
                    </div>

                    {/* Content - flex-grow to push trust badge to bottom */}
                    <div className="text-center mb-6 flex-grow">
                      <H4 className="mb-3 text-gray-900">
                        {step.title}
                      </H4>
                      <BodySmall className="text-gray-600 leading-relaxed">
                        {step.description}
                      </BodySmall>
                    </div>

                    {/* Sub Points */}
                    <div className="space-y-2 mb-6">
                      {step.subPoints.map((point, pointIndex) => (
                        <div key={pointIndex} className="flex items-center gap-2 text-sm text-gray-500">
                          <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                          {point}
                        </div>
                      ))}
                    </div>

                    {/* Trust Badge - at bottom */}
                    <div className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs font-medium text-gray-600 mt-auto">
                      <step.trustBadge.icon className="w-3.5 h-3.5" />
                      {step.trustBadge.text}
                    </div>
                  </div>
                </div>

                {/* Desktop Connection Arrow (except for last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-32 -right-4 transform -translate-y-1/2 z-10">
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-teal-200 flex items-center justify-center shadow-sm">
                      <svg width="16" height="16" viewBox="0 0 24 24" className="text-teal-400">
                        <path
                          d="M5 12h14m0 0l-4-4m4 4l-4 4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Mobile Connection Dot (except for last item) */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden absolute -left-6 -bottom-3 w-4 h-4 rounded-full bg-teal-200 border-2 border-white shadow-sm z-10" />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mt-12 lg:mt-16 max-w-4xl mx-auto"
        >
          {[
            { label: 'Orders Processed', value: '10,000+', icon: ShoppingBag },
            { label: 'Countries Served', value: '15+', icon: Globe },
            { label: 'Customer Rating', value: '4.9/5', icon: CheckCircle },
            { label: 'Delivery Success', value: '99.8%', icon: Truck },
          ].map((stat, index) => (
            <div key={index} className="text-center p-3 lg:p-4 rounded-xl bg-white border border-gray-100 hover:border-teal-200 transition-colors duration-200">
              <stat.icon className="w-5 h-5 lg:w-6 lg:h-6 text-teal-600 mx-auto mb-2" />
              <div className="font-bold text-lg lg:text-xl text-gray-900">{stat.value}</div>
              <div className="text-xs lg:text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-12 lg:mt-16 px-4 lg:px-0"
        >
          <button
            onClick={() => (window.location.href = '/quote')}
            className="group inline-flex items-center gap-3 px-6 lg:px-8 py-3 lg:py-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-teal-200 transform hover:-translate-y-1 w-full sm:w-auto text-center justify-center"
          >
            Get Your Quote Now
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              className="group-hover:translate-x-1 transition-transform duration-300"
            >
              <path
                d="M5 12h14m0 0l-7-7m7 7l-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </button>
          <p className="text-sm text-gray-500 mt-3 px-4">
            <span className="block sm:inline">No signup required</span>
            <span className="hidden sm:inline"> • </span>
            <span className="block sm:inline">Get instant pricing</span>
            <span className="hidden sm:inline"> • </span>
            <span className="block sm:inline">100% transparent</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
};