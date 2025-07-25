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
  Headphones
} from 'lucide-react';

export const HomepageBanner: React.FC = () => {
  return (
    <div className="relative min-h-[800px] bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        {/* Rajasthani-inspired Background */}
        <div className="absolute inset-0 opacity-6">
          <svg viewBox="0 0 1200 800" className="w-full h-full">
            {/* Traditional Rajasthani Palace Architecture Silhouettes */}
            <g className="text-teal-600/15">
              {/* Left Palace Silhouette */}
              <path d="M0,800 L0,600 Q50,580 80,600 L80,550 Q100,530 120,550 L120,500 Q140,480 160,500 L160,450 Q180,430 200,450 L200,500 Q220,480 240,500 L240,550 Q260,530 280,550 L280,600 Q310,580 340,600 L340,800 Z" fill="currentColor" opacity="0.3" />
              
              {/* Right Palace Silhouette */}
              <path d="M1200,800 L1200,650 Q1150,630 1120,650 L1120,600 Q1100,580 1080,600 L1080,550 Q1060,530 1040,550 L1040,500 Q1020,480 1000,500 L1000,450 Q980,430 960,450 L960,500 Q940,480 920,500 L920,550 Q900,530 880,550 L880,650 Q850,630 820,650 L820,800 Z" fill="currentColor" opacity="0.3" />
            </g>
            
            {/* Rajasthani Floral Vines and Patterns */}
            <g className="text-cyan-600/12">
              {/* Intricate Vine Pattern */}
              <path d="M100,100 Q150,80 200,120 Q250,100 300,140 Q350,120 400,160 Q450,140 500,180" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M700,200 Q750,180 800,220 Q850,200 900,240 Q950,220 1000,260 Q1050,240 1100,280" stroke="currentColor" strokeWidth="2" fill="none" />
              
              {/* Flower motifs along vines */}
              <circle cx="150" cy="100" r="8" fill="currentColor" opacity="0.4" />
              <circle cx="250" cy="120" r="6" fill="currentColor" opacity="0.4" />
              <circle cx="350" cy="140" r="8" fill="currentColor" opacity="0.4" />
              <circle cx="750" cy="200" r="8" fill="currentColor" opacity="0.4" />
              <circle cx="850" cy="220" r="6" fill="currentColor" opacity="0.4" />
              <circle cx="950" cy="240" r="8" fill="currentColor" opacity="0.4" />
            </g>
            
            {/* Traditional Rajasthani Geometric Patterns */}
            <g className="text-teal-600/10">
              {/* Diamond Pattern */}
              <path d="M300,300 L320,280 L340,300 L320,320 Z" fill="currentColor" opacity="0.5" />
              <path d="M280,320 L300,300 L320,320 L300,340 Z" fill="currentColor" opacity="0.3" />
              <path d="M320,320 L340,300 L360,320 L340,340 Z" fill="currentColor" opacity="0.3" />
              
              <path d="M800,450 L820,430 L840,450 L820,470 Z" fill="currentColor" opacity="0.5" />
              <path d="M780,470 L800,450 L820,470 L800,490 Z" fill="currentColor" opacity="0.3" />
              <path d="M820,470 L840,450 L860,470 L840,490 Z" fill="currentColor" opacity="0.3" />
            </g>
            
            {/* Rajasthani Camel and Desert Elements */}
            <g className="text-orange-500/8">
              {/* Sand Dunes */}
              <path d="M0,700 Q200,650 400,700 Q600,680 800,720 Q1000,700 1200,740 L1200,800 L0,800 Z" fill="currentColor" opacity="0.3" />
              <path d="M0,720 Q300,680 600,720 Q900,700 1200,730 L1200,800 L0,800 Z" fill="currentColor" opacity="0.2" />
            </g>
            
            {/* Traditional Rajasthani Border Patterns */}
            <g className="text-teal-600/8">
              {/* Top border pattern */}
              <pattern id="rajasthaniPattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0,20 Q10,10 20,20 Q30,10 40,20 Q30,30 20,20 Q10,30 0,20" fill="currentColor" opacity="0.4" />
              </pattern>
              <rect x="0" y="0" width="1200" height="40" fill="url(#rajasthaniPattern)" />
              
              {/* Side decorative elements */}
              <path d="M0,200 Q20,180 40,200 Q20,220 0,200" fill="currentColor" opacity="0.4" />
              <path d="M0,250 Q30,225 60,250 Q30,275 0,250" fill="currentColor" opacity="0.3" />
              <path d="M1200,200 Q1180,180 1160,200 Q1180,220 1200,200" fill="currentColor" opacity="0.4" />
              <path d="M1200,250 Q1170,225 1140,250 Q1170,275 1200,250" fill="currentColor" opacity="0.3" />
            </g>
            
            {/* Hawa Mahal inspired geometric pattern */}
            <g className="text-cyan-600/8" transform="translate(500,150)">
              {/* Honeycomb pattern inspired by Hawa Mahal windows */}
              <polygon points="0,20 17.32,10 17.32,-10 0,-20 -17.32,-10 -17.32,10" fill="currentColor" opacity="0.3" />
              <polygon points="34.64,0 51.96,-10 51.96,-30 34.64,-40 17.32,-30 17.32,-10" fill="currentColor" opacity="0.2" />
              <polygon points="-34.64,0 -17.32,-10 -17.32,-30 -34.64,-40 -51.96,-30 -51.96,-10" fill="currentColor" opacity="0.2" />
            </g>
            
            {/* Traditional Rajasthani Peacock motifs */}
            <g className="text-blue-600/10">
              <path d="M150,500 Q140,480 160,470 Q180,480 170,500 Q160,520 150,500" fill="currentColor" opacity="0.4" />
              <path d="M165,485 Q175,475 185,485 Q175,495 165,485" fill="currentColor" opacity="0.6" />
              
              <path d="M950,350 Q940,330 960,320 Q980,330 970,350 Q960,370 950,350" fill="currentColor" opacity="0.4" />
              <path d="M965,335 Q975,325 985,335 Q975,345 965,335" fill="currentColor" opacity="0.6" />
            </g>
          </svg>
        </div>
        
        {/* Enhanced Gradient Orbs */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-teal-500/15 to-cyan-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-br from-cyan-500/15 to-blue-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-teal-400/10 to-cyan-400/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-32 w-48 h-48 bg-gradient-to-br from-orange-400/8 to-orange-500/8 rounded-full blur-2xl" />
        
        {/* Floating Icons */}
        <div className="absolute top-32 right-20 animate-bounce">
          <div className="p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-teal-100">
            <Package className="w-6 h-6 text-teal-600" />
          </div>
        </div>
        <div className="absolute top-64 left-20 animate-pulse">
          <div className="p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-cyan-100">
            <Globe className="w-6 h-6 text-cyan-600" />
          </div>
        </div>
        <div className="absolute bottom-32 left-32 animate-bounce delay-300">
          <div className="p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-teal-100">
            <Shield className="w-6 h-6 text-teal-600" />
          </div>
        </div>
        <div className="absolute bottom-48 right-32 animate-pulse delay-500">
          <div className="p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-blue-100">
            <Zap className="w-6 h-6 text-blue-600" />
          </div>
        </div>
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
              Access millions of products from Amazon, eBay, Alibaba and more. 
              We handle everything - purchasing, shipping, and customs clearance.
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
              <p className="text-slate-600 text-sm">Access products from top international marketplaces</p>
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
                "iwishBag made international shopping effortless. Got my products from Amazon US delivered to Delhi in just 10 days!"
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