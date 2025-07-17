import { motion } from 'framer-motion';
import {
  Shield,
  Lock,
  CreditCard,
  Award,
  Headphones,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';

const trustBadges = [
  {
    icon: Shield,
    title: '100% Secure',
    description: 'SSL encrypted transactions',
    color: 'from-green-500 to-green-600',
  },
  {
    icon: Lock,
    title: 'Data Protection',
    description: 'Your data is safe with us',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: CreditCard,
    title: 'Secure Payments',
    description: 'Multiple payment options',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: Award,
    title: 'Verified Business',
    description: 'Trusted by thousands',
    color: 'from-yellow-500 to-yellow-600',
  },
];

const guarantees = [
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Round-the-clock customer service via chat, email, and phone',
  },
  {
    icon: RefreshCw,
    title: 'Money-Back Guarantee',
    description: "Full refund if your order doesn't arrive or isn't as described",
  },
  {
    icon: TrendingUp,
    title: 'Best Price Promise',
    description: 'We ensure competitive pricing on all international purchases',
  },
  {
    icon: Users,
    title: '50,000+ Happy Customers',
    description: 'Join our growing community of global shoppers',
  },
];

const paymentMethods = [
  {
    name: 'Visa',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg',
  },
  {
    name: 'Mastercard',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg',
  },
  {
    name: 'PayPal',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg',
  },
  {
    name: 'Google Pay',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg',
  },
  {
    name: 'Apple Pay',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg',
  },
];

const shippingPartners = [
  {
    name: 'DHL',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/a/ac/DHL_Logo.svg',
  },
  {
    name: 'FedEx',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/FedEx_Corporation_-_2016_Logo.svg',
  },
  {
    name: 'UPS',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/United_Parcel_Service_logo_2014.svg',
  },
  {
    name: 'USPS',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/USPS_Logo.svg',
  },
];

export const TrustIndicators = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
            Why Trust Us
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            Shop with{' '}
            <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Complete Confidence
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your security and satisfaction are our top priorities
          </p>
        </motion.div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 max-w-5xl mx-auto">
          {trustBadges.map((badge, index) => (
            <motion.div
              key={index}
              className="text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <motion.div
                className={`w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r ${badge.color} flex items-center justify-center shadow-lg`}
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <badge.icon className="w-10 h-10 text-white" />
              </motion.div>
              <h3 className="font-semibold text-gray-900 mb-1">{badge.title}</h3>
              <p className="text-sm text-gray-600">{badge.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Guarantees Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-5xl mx-auto">
          {guarantees.map((guarantee, index) => (
            <motion.div
              key={index}
              className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300"
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                    <guarantee.icon className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{guarantee.title}</h3>
                  <p className="text-gray-600">{guarantee.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Payment Methods & Shipping Partners */}
        <motion.div
          className="bg-white rounded-3xl shadow-xl p-8 md:p-12 max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="grid md:grid-cols-2 gap-12">
            {/* Payment Methods */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                Accepted Payment Methods
              </h3>
              <div className="flex flex-wrap justify-center gap-6">
                {paymentMethods.map((method, index) => (
                  <motion.div
                    key={index}
                    className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <img
                      src={method.logo}
                      alt={method.name}
                      className="h-8 w-auto object-contain"
                    />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Shipping Partners */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                Trusted Shipping Partners
              </h3>
              <div className="flex flex-wrap justify-center gap-6">
                {shippingPartners.map((partner, index) => (
                  <motion.div
                    key={index}
                    className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <img
                      src={partner.logo}
                      alt={partner.name}
                      className="h-8 w-auto object-contain"
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Final CTA */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <p className="text-lg text-gray-600 mb-6">
            Ready to start shopping globally with confidence?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => (window.location.href = '/quote')}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Start Shopping Now
            </button>
            <button
              onClick={() => (window.location.href = '/contact')}
              className="px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-full hover:border-gray-400 transition-all duration-300"
            >
              Contact Support
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
