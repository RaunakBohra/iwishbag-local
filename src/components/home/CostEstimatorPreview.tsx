import { motion } from "framer-motion";
import { useState } from "react";
import { Calculator, ArrowRight, DollarSign, Truck, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const CostEstimatorPreview = () => {
  const [productPrice, setProductPrice] = useState(100);
  const [selectedCountry, setSelectedCountry] = useState("US");
  
  // Simple calculation for demo
  const shipping = productPrice * 0.15;
  const customs = productPrice * 0.10;
  const serviceFee = productPrice * 0.05;
  const total = productPrice + shipping + customs + serviceFee;

  const countries = [
    { code: "US", name: "USA", flag: "🇺🇸" },
    { code: "CN", name: "China", flag: "🇨🇳" },
    { code: "JP", name: "Japan", flag: "🇯🇵" },
    { code: "UK", name: "UK", flag: "🇬🇧" }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-white via-blue-50/30 to-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <motion.div 
          className="absolute top-20 right-20 w-96 h-96 bg-blue-200 rounded-full filter blur-3xl opacity-20"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-20 left-20 w-96 h-96 bg-purple-200 rounded-full filter blur-3xl opacity-20"
          animate={{ scale: [1, 1.2, 1], rotate: [0, -90, 0] }}
          transition={{ duration: 15, repeat: Infinity }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                No Hidden Fees
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Know Your Total Cost
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Instantly</span>
              </h2>
              
              <p className="text-xl text-gray-600 mb-8">
                Our transparent pricing calculator shows you exactly what you'll pay - product price, shipping, customs, and our service fee. No surprises!
              </p>

              {/* Features List */}
              <div className="space-y-4 mb-8">
                {[
                  "Real-time currency conversion",
                  "Accurate customs calculation",
                  "Compare shipping options",
                  "Save estimates for later"
                ].map((feature, index) => (
                  <motion.div 
                    key={index}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </motion.div>
                ))}
              </div>

              {/* Testimonial */}
              <div className="bg-gray-100 rounded-xl p-6 relative">
                <div className="flex items-start gap-4">
                  <img 
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100" 
                    alt="Customer"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-gray-700 italic">
                      "The cost estimator saved me from surprises! I knew exactly what I'd pay before ordering."
                    </p>
                    <p className="text-sm text-gray-500 mt-2">- Amit K., Delhi</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Side - Interactive Calculator */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="bg-white rounded-3xl shadow-2xl p-8 relative overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Quick Estimate</h3>
                  <Calculator className="w-6 h-6 text-blue-600" />
                </div>

                {/* Country Selection */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Shopping From</label>
                  <div className="grid grid-cols-4 gap-2">
                    {countries.map((country) => (
                      <button
                        key={country.code}
                        onClick={() => setSelectedCountry(country.code)}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                          selectedCountry === country.code
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-2xl">{country.flag}</span>
                        <p className="text-xs mt-1">{country.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product Price Slider */}
                <div className="mb-8">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Product Price: <span className="text-blue-600 font-bold">${productPrice}</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="1000"
                    value={productPrice}
                    onChange={(e) => setProductPrice(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>$10</span>
                    <span>$1000</span>
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="space-y-3 mb-6">
                  <motion.div 
                    className="flex justify-between items-center"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="flex items-center gap-2 text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      Product Price
                    </span>
                    <span className="font-medium">${productPrice.toFixed(2)}</span>
                  </motion.div>
                  
                  <motion.div 
                    className="flex justify-between items-center"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <span className="flex items-center gap-2 text-gray-600">
                      <Truck className="w-4 h-4" />
                      Shipping
                    </span>
                    <span className="font-medium">${shipping.toFixed(2)}</span>
                  </motion.div>
                  
                  <motion.div 
                    className="flex justify-between items-center"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <span className="flex items-center gap-2 text-gray-600">
                      <FileText className="w-4 h-4" />
                      Customs & Duties
                    </span>
                    <span className="font-medium">${customs.toFixed(2)}</span>
                  </motion.div>
                  
                  <motion.div 
                    className="flex justify-between items-center"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    <span className="flex items-center gap-2 text-gray-600">
                      <Calculator className="w-4 h-4" />
                      Service Fee
                    </span>
                    <span className="font-medium">${serviceFee.toFixed(2)}</span>
                  </motion.div>
                </div>

                {/* Divider */}
                <div className="border-t-2 border-dashed border-gray-200 my-6" />

                {/* Total */}
                <motion.div 
                  className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-6"
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total Cost</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Includes all fees and charges</p>
                </motion.div>

                {/* CTA Buttons */}
                <div className="space-y-3">
                  <Button asChild size="lg" className="w-full">
                    <Link to="/cost-estimator">
                      Try Full Calculator
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="w-full">
                    <Link to="/quote">Get Exact Quote</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};