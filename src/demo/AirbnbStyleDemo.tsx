import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ToggleLeft, ToggleRight, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';

// Import Airbnb-style components
import { AirbnbHeroSection } from '@/components/demo/airbnb/AirbnbHeroSection';
import { AirbnbHowItWorks } from '@/components/demo/airbnb/AirbnbHowItWorks';
import { AirbnbTestimonials } from '@/components/demo/airbnb/AirbnbTestimonials';

// Import current homepage component
import { HomepageBanner } from '@/components/home/HomepageBanner';

export default function AirbnbStyleDemo() {
  const [showComparison, setShowComparison] = useState(false);
  const [currentView, setCurrentView] = useState<'airbnb' | 'current'>('airbnb');

  const AirbnbNavigation = () => (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-2xl font-medium text-teal-600">
              iwishBag
            </Link>
            <div className="hidden md:flex space-x-6">
              <a href="#" className="text-gray-700 hover:text-gray-900 font-light">How it Works</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 font-light">Pricing</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 font-light">About</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 font-light">Contact</a>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg"
          >
            Get Quote
          </Button>
        </div>
      </div>
    </nav>
  );

  const DemoControls = () => (
    <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Demo Controls</span>
        <Link to="/demo" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>
      
      <div className="space-y-2">
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
        >
          {showComparison ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span>{showComparison ? 'Hide' : 'Show'} Comparison</span>
        </button>
        
        {showComparison && (
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">Current</span>
              <button
                onClick={() => setCurrentView(currentView === 'airbnb' ? 'current' : 'airbnb')}
                className="text-teal-600"
              >
                {currentView === 'airbnb' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </button>
              <span className="text-xs text-gray-500">Airbnb Style</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <DemoControls />
      
      {showComparison ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
          {/* Current Design */}
          <div className="border-r border-gray-200">
            <div className="sticky top-0 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 border-b border-gray-200">
              Current Homepage Design
            </div>
            <div className="overflow-y-auto">
              <HomepageBanner />
            </div>
          </div>
          
          {/* Airbnb Style */}
          <div>
            <div className="sticky top-0 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 border-b border-teal-200">
              Airbnb-Inspired Design
            </div>
            <div className="overflow-y-auto">
              <AirbnbNavigation />
              <AirbnbHeroSection />
              <AirbnbHowItWorks />
              <AirbnbTestimonials />
            </div>
          </div>
        </div>
      ) : (
        // Single view mode
        <div>
          {currentView === 'airbnb' ? (
            <>
              <AirbnbNavigation />
              <AirbnbHeroSection />
              <AirbnbHowItWorks />
              <AirbnbTestimonials />
              
              {/* Design Notes */}
              <div className="bg-gray-50 py-12">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
                    <h3 className="text-xl font-medium text-gray-900 mb-4">
                      Airbnb Design Principles Applied
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">✨ Visual Hierarchy</h4>
                        <p className="mb-4">Clear Z-layout pattern guides attention from headline → search → CTA</p>
                        
                        <h4 className="font-medium text-gray-900 mb-2">🎯 Single Focus</h4>
                        <p className="mb-4">One primary action reduces decision paralysis</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">🤍 Minimalist Aesthetic</h4>
                        <p className="mb-4">Clean backgrounds with strategic whitespace</p>
                        
                        <h4 className="font-medium text-gray-900 mb-2">🎨 Neutral Palette</h4>
                        <p>Teal accent color against gray/white base</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <HomepageBanner />
          )}
        </div>
      )}
    </div>
  );
}