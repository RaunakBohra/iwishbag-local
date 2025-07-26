import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Globe,
  Shield,
  Zap,
  Star,
  CheckCircle,
  Users,
  MapPin,
  Headphones,
} from 'lucide-react';

export const HomepageBanner: React.FC = () => {
  return (
    <div className="relative min-h-[800px] bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        {/* Enhanced Gradient Orbs */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-teal-500/15 to-cyan-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-br from-cyan-500/15 to-blue-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-teal-400/10 to-cyan-400/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-32 w-48 h-48 bg-gradient-to-br from-orange-400/8 to-orange-500/8 rounded-full blur-2xl" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-20 pb-16">
          {/* Promotional Badge */}
          <div className="flex justify-center mb-8">
            <Badge className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-2 text-sm font-medium shadow-lg">
              🌟 Free shipping on orders over $500
            </Badge>
          </div>

          {/* Main Headline */}
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-4 leading-tight">
              Shop the World,
              <br />
              <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Delivered to You
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Access millions of products from Amazon, eBay, Alibaba and more. We handle everything
              - purchasing, shipping, and customs clearance.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button
              size="lg"
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-8 py-4 text-lg font-semibold h-14 shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              Get Your Free Quote
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-teal-300 hover:border-teal-500 text-teal-700 hover:text-teal-800 hover:bg-orange-50 px-8 py-4 text-lg font-semibold h-14 bg-white/90 backdrop-blur-sm transition-all duration-300"
            >
              Calculate Costs Instantly
            </Button>
          </div>

          {/* Trust Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="w-6 h-6 text-teal-600 mr-2" />
                <span className="text-3xl font-bold text-slate-900">50K+</span>
              </div>
              <p className="text-sm text-slate-600 font-medium">Happy Customers</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <MapPin className="w-6 h-6 text-cyan-600 mr-2" />
                <span className="text-3xl font-bold text-slate-900">100+</span>
              </div>
              <p className="text-sm text-slate-600 font-medium">Countries Served</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Headphones className="w-6 h-6 text-teal-600 mr-2" />
                <span className="text-3xl font-bold text-slate-900">24/7</span>
              </div>
              <p className="text-sm text-slate-600 font-medium">Support</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Package className="w-6 h-6 text-orange-500 mr-2" />
                <span className="text-3xl font-bold text-slate-900">5M+</span>
              </div>
              <p className="text-sm text-slate-600 font-medium">Products Delivered</p>
            </div>
          </div>

          {/* Value Propositions */}
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-teal-100 hover:border-teal-200">
              <Globe className="w-10 h-10 text-teal-600 mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2">Shop Globally</h3>
              <p className="text-slate-600 text-sm">
                Access products from top international marketplaces
              </p>
            </div>
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-cyan-100 hover:border-cyan-200">
              <Package className="w-10 h-10 text-cyan-600 mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2">Customs Handled</h3>
              <p className="text-slate-600 text-sm">We manage all customs and shipping logistics</p>
            </div>
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-100 hover:border-blue-200">
              <Shield className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2">Best Price Guarantee</h3>
              <p className="text-slate-600 text-sm">Competitive pricing with transparent costs</p>
            </div>
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-orange-100 hover:border-orange-200">
              <CheckCircle className="w-10 h-10 text-orange-500 mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2">Secure & Trusted</h3>
              <p className="text-slate-600 text-sm">SSL encrypted with money-back guarantee</p>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="text-center">
            <div className="flex flex-wrap justify-center items-center gap-8 mb-8">
              {/* Security Badge */}
              <div className="flex items-center bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-md">
                <Shield className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-slate-700">SSL Secured</span>
              </div>

              {/* Money Back Badge */}
              <div className="flex items-center bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-md">
                <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-slate-700">Money-Back Guarantee</span>
              </div>

              {/* Customer Rating */}
              <div className="flex items-center bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-md">
                <div className="flex items-center mr-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <span className="text-sm font-medium text-slate-700">4.9/5 Rating</span>
              </div>
            </div>

            {/* Customer Testimonial Preview */}
            <div className="max-w-2xl mx-auto">
              <blockquote className="text-lg italic text-slate-600 mb-4">
                "iwishBag made international shopping effortless. Got my products from Amazon US
                delivered to Delhi in just 10 days!"
              </blockquote>
              <cite className="text-sm font-medium text-slate-500">
                - Priya S., Verified Customer
              </cite>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
