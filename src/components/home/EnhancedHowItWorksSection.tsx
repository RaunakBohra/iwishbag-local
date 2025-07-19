import { motion } from 'framer-motion';
import { useState } from 'react';
import { SectionHeading, SectionDescription, H4, BodySmall } from '@/components/ui/typography';
import { Search, Calculator, ShoppingBag, Truck, CheckCircle, Shield, Clock, Globe, Star, ArrowRight, PlayCircle } from 'lucide-react';

const steps = [
  {
    id: 1,
    title: 'Find Your Product',
    description: 'Share the product link from Amazon, Flipkart, eBay, Alibaba or any international store',
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
    description: 'Transparent pricing with shipping, customs, taxes, and all fees calculated upfront',
    subPoints: ['No hidden charges', 'Live exchange rates', 'Customs duty included'],
    icon: Calculator,
    trustBadge: { icon: Shield, text: 'Transparent Pricing' },
    timeframe: 'Within seconds',
    color: 'from-cyan-500 to-blue-500',
    bgGradient: 'from-cyan-50 to-blue-50',
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
    color: 'from-blue-500 to-indigo-500',
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
    color: 'from-indigo-500 to-purple-500',
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
    color: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-50 to-pink-50',
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
  const [showVideo, setShowVideo] = useState(false);

  return (
    <section className="py-20 lg:py-32 bg-gradient-to-b from-gray-50 via-white to-gray-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-teal-200/20 to-cyan-200/20 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-orange-200/20 to-pink-200/20 rounded-full blur-3xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Enhanced Section Header */}
        <div className="text-center mb-20 lg:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 rounded-full text-sm font-medium border border-teal-200">
              <Shield className="w-4 h-4" />
              Trusted by 10,000+ customers worldwide
            </div>
            {/* Video Play Button */}
            <motion.button
              onClick={() => setShowVideo(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-full text-sm font-medium border border-gray-200 hover:border-teal-200 hover:text-teal-700 transition-all duration-300 shadow-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <PlayCircle className="w-4 h-4" />
              Watch How It Works
            </motion.button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <SectionHeading className="mb-6 bg-gradient-to-r from-teal-600 via-cyan-600 to-orange-500 bg-clip-text text-transparent text-4xl lg:text-5xl font-bold">
              How iwishBag Works
            </SectionHeading>
            <SectionDescription className="mx-auto max-w-3xl text-lg lg:text-xl leading-relaxed">
              From product discovery to doorstep delivery, we've streamlined international shopping 
              into a simple, transparent, and secure process. Join thousands of happy customers!
            </SectionDescription>
          </motion.div>
        </div>

        {/* Interactive Steps with Timeline */}
        <div className="relative max-w-7xl mx-auto mb-20">
          {/* Progress Line */}
          <div className="absolute top-16 left-0 right-0 h-1 bg-gray-200 rounded-full hidden lg:block">
            <motion.div 
              className="h-full bg-gradient-to-r from-teal-500 to-orange-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(activeStep / steps.length) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </div>

          {/* Interactive Step Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 relative">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="relative"
                onMouseEnter={() => setActiveStep(step.id)}
              >
                {/* Enhanced Step Card */}
                <div className={`
                  group relative rounded-3xl p-6 lg:p-8 border-2 transition-all duration-500 cursor-pointer h-full
                  ${activeStep === step.id 
                    ? 'border-teal-300 bg-gradient-to-br from-white to-teal-50 shadow-xl shadow-teal-100/50 scale-105' 
                    : 'border-gray-100 bg-white hover:border-teal-200 hover:shadow-lg'
                  }
                `}>
                  
                  {/* Enhanced Step Number */}
                  <div className={`
                    absolute -top-4 left-6 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg z-10
                    ${activeStep === step.id 
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 animate-pulse' 
                      : 'bg-gradient-to-r from-gray-400 to-gray-500'
                    }
                  `}>
                    {step.id}
                  </div>

                  {/* Timeframe Badge */}
                  <div className={`
                    absolute -top-3 right-4 px-3 py-1 rounded-full text-xs font-semibold border
                    ${activeStep === step.id
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                    }
                  `}>
                    {step.timeframe}
                  </div>

                  {/* Enhanced Icon */}
                  <div className={`
                    w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto transition-all duration-300
                    ${activeStep === step.id 
                      ? `bg-gradient-to-br ${step.bgGradient} scale-110` 
                      : 'bg-gray-50 group-hover:bg-gray-100'
                    }
                  `}>
                    <step.icon className={`w-8 h-8 ${activeStep === step.id ? 'text-teal-600' : 'text-gray-500'}`} />
                  </div>

                  {/* Content */}
                  <div className="text-center mb-6">
                    <H4 className="mb-3 text-gray-900 font-bold">
                      {step.title}
                    </H4>
                    <BodySmall className="text-gray-600 leading-relaxed mb-4">
                      {step.description}
                    </BodySmall>
                    
                    {/* Example Preview */}
                    {activeStep === step.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 p-3 bg-teal-50 rounded-lg border border-teal-200"
                      >
                        <div className="text-xs text-teal-600 font-medium mb-1">Example:</div>
                        <div className="text-sm text-teal-800 font-mono">{step.example}</div>
                      </motion.div>
                    )}
                  </div>

                  {/* Enhanced Sub Points */}
                  <div className="space-y-3 mb-6">
                    {step.subPoints.map((point, pointIndex) => (
                      <motion.div 
                        key={pointIndex} 
                        className="flex items-center gap-3 text-sm text-gray-600"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: pointIndex * 0.1 }}
                      >
                        <div className={`
                          w-2 h-2 rounded-full
                          ${activeStep === step.id ? 'bg-teal-400' : 'bg-gray-300'}
                        `} />
                        {point}
                      </motion.div>
                    ))}
                  </div>

                  {/* Trust Badge */}
                  <div className={`
                    flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium mt-auto
                    ${activeStep === step.id 
                      ? 'bg-teal-100 text-teal-700' 
                      : 'bg-gray-50 text-gray-600'
                    }
                  `}>
                    <step.trustBadge.icon className="w-4 h-4" />
                    {step.trustBadge.text}
                  </div>
                </div>

                {/* Connection Arrow */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-8 -right-6 items-center justify-center z-20">
                    <motion.div 
                      className="w-12 h-12 rounded-full bg-white border-2 border-teal-200 flex items-center justify-center shadow-md"
                      animate={{ 
                        scale: activeStep >= step.id ? [1, 1.2, 1] : 1,
                        borderColor: activeStep >= step.id ? '#14b8a6' : '#cbd5e1'
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <ArrowRight className={`w-6 h-6 ${activeStep >= step.id ? 'text-teal-500' : 'text-gray-400'}`} />
                    </motion.div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Customer Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
              What Our Customers Say
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Join thousands of satisfied customers who trust iwishBag for their international shopping needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-teal-200 transition-all duration-300 hover:shadow-lg"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-teal-100 to-cyan-100 flex items-center justify-center text-lg">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.location}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Enhanced Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16 max-w-5xl mx-auto"
        >
          {[
            { label: 'Orders Processed', value: '10,000+', icon: ShoppingBag, color: 'text-teal-600' },
            { label: 'Countries Served', value: '15+', icon: Globe, color: 'text-cyan-600' },
            { label: 'Customer Rating', value: '4.9/5', icon: Star, color: 'text-yellow-500' },
            { label: 'Delivery Success', value: '99.8%', icon: CheckCircle, color: 'text-green-600' },
          ].map((stat, index) => (
            <motion.div 
              key={index} 
              className="text-center p-6 rounded-2xl bg-white border border-gray-100 hover:border-teal-200 transition-all duration-300 hover:shadow-lg group"
              whileHover={{ y: -5 }}
            >
              <stat.icon className={`w-8 h-8 ${stat.color} mx-auto mb-3 group-hover:scale-110 transition-transform duration-300`} />
              <div className="font-bold text-2xl text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Enhanced CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-teal-50 to-orange-50 rounded-3xl p-8 lg:p-12 border border-teal-100">
            <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
              Ready to Start Shopping Globally?
            </h3>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Get your instant quote now and experience hassle-free international shopping with complete transparency.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.button
                onClick={() => (window.location.href = '/quote')}
                className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-teal-600 to-orange-500 text-white font-semibold rounded-xl hover:from-teal-700 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Your Quote Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </motion.button>
              
              <div className="text-sm text-gray-500">
                <span className="block sm:inline">✓ No signup required</span>
                <span className="hidden sm:inline mx-2">•</span>
                <span className="block sm:inline">✓ Instant pricing</span>
                <span className="hidden sm:inline mx-2">•</span>
                <span className="block sm:inline">✓ 100% transparent</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Video Modal */}
      {showVideo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowVideo(false)}
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
              <PlayCircle className="w-16 h-16 text-gray-400" />
              <span className="ml-4 text-gray-600">Video coming soon!</span>
            </div>
            <button
              onClick={() => setShowVideo(false)}
              className="w-full py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </section>
  );
};