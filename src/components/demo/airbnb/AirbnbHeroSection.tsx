import React from 'react';
import { Button } from '@/components/ui/button';
import { AirbnbSearchBar } from './AirbnbSearchBar';

export const AirbnbHeroSection: React.FC = () => {
  return (
    <div className="relative bg-white">
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-white" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-24 pb-16 text-center">
          {/* Main Headline - Airbnb style large, emotional */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-light text-gray-900 mb-8 tracking-tight">
            Bring the World
            <br />
            <span className="font-medium text-teal-600">Home</span>
          </h1>
          
          {/* Subtitle - Clear value proposition */}
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            Shop internationally. Delivered locally. Customs handled.
          </p>

          {/* Airbnb-style Search Bar */}
          <div className="mb-12">
            <AirbnbSearchBar />
          </div>

          {/* Single Primary CTA */}
          <div className="mb-8">
            <Button 
              size="lg" 
              className="bg-teal-600 hover:bg-teal-700 text-white px-12 py-4 text-lg font-medium h-14 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Start Shopping
            </Button>
          </div>

          {/* Minimal trust indicator */}
          <p className="text-sm text-gray-500 font-light">
            Trusted by <span className="font-medium text-gray-700">50,000+</span> customers worldwide
          </p>
        </div>
      </div>

      {/* Subtle bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200" />
    </div>
  );
};