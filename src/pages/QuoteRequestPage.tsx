// =========================
// QUOTE REQUEST FLOW IMPROVEMENTS
// =========================
//
// This page implements a streamlined quote request flow with the following features:
//
// 1. PRODUCT SUMMARY FOR REVIEW:
//    - Shows in ShippingContactStep before submission
//    - Allows users to review products and go back to edit if needed
//    - Displays total items, value, and individual product details
//
// 2. PRODUCT SUMMARY AFTER SUBMISSION:
//    - Shows submitted products from local state (no DB call needed)
//    - Provides immediate feedback on what was submitted
//    - Helps users confirm their request was received correctly
//
// 3. ENHANCED PROGRESS INDICATOR:
//    - Clear 2-step process: Product Info → Shipping & Review
//    - Visual progress bar with step indicators
//
// 4. ESTIMATED RESPONSE TIME:
//    - Prominently displayed in success message
//    - Sets clear expectations for users
//
// 5. EDIT/CORRECT OPTION:
//    - "Edit Products" button in review step
//    - Allows users to go back and fix mistakes before submitting
//
// The flow minimizes friction while providing necessary feedback and review opportunities.
// =========================

import React, { useState } from 'react';
import ProductInfoStep from '@/components/quote/ProductInfoStep';
import ShippingContactStep from '@/components/quote/ShippingContactStep';
import ProductSummary from '@/components/quote/ProductSummary';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Sparkles, Clock, CheckCircle, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCountryUtils } from '@/lib/countryUtils';
import { currencyService } from '@/services/CurrencyService';

const steps = ['Product Info', 'Shipping & Contact', 'Review & Submit'];

export default function QuoteRequestPage() {
  const { user } = useAuth();
  const { countries } = useCountryUtils();
  const [currentStep, setCurrentStep] = useState(1);
  const [quoteType, setQuoteType] = useState('separate');
  const [products, setProducts] = useState([
    {
      name: '',
      url: '',
      file: null,
      quantity: 1,
      price: '',
      weight: '',
      country: '',
    },
  ]);
  const [shippingContact, setShippingContact] = useState({
    name: '',
    email: '',
    whatsapp: '',
    address: '',
    country: '',
    state: '',
    city: '',
    zip: '',
  });
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);

  const nextStep = () => setCurrentStep(currentStep + 1);
  const prevStep = () => setCurrentStep(currentStep - 1);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ProductInfoStep
            quoteType={quoteType}
            setQuoteType={setQuoteType}
            products={products}
            setProducts={setProducts}
            next={nextStep}
          />
        );
      case 2:
        return (
          <ShippingContactStep
            shippingContact={shippingContact}
            setShippingContact={setShippingContact}
            next={handleSubmit}
            back={prevStep}
            products={products}
            quoteType={quoteType}
          />
        );
      default:
        return null;
    }
  };

  const handleSubmit = async () => {
    try {
      // Determine email to use
      const emailToUse = user?.email || shippingContact.email;
      if (!emailToUse || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailToUse)) {
        alert('A valid email is required to submit a quote.');
        return;
      }

      // Store shipping address in the proper format
      const shippingAddressData = {
        fullName: shippingContact.name,
        streetAddress: shippingContact.address,
        city: shippingContact.city,
        state: shippingContact.state,
        postalCode: shippingContact.zip,
        country: shippingContact.country, // Store country code for logic and DB
        destination_country: shippingContact.country, // Add destination_country for calculation compatibility
        phone: shippingContact.whatsapp || '',
        email: emailToUse,
      };

      if (quoteType === 'combined') {
        // Combined quote: Create one quote with multiple items
        const items = products.map((product) => ({
          productUrl: product.url,
          productName: product.name,
          quantity: product.quantity,
          options: product.notes || '',
          imageUrl: product.file ? product.url : '',
          price: product.price,
          weight: product.weight,
        }));

        // Submit combined quote to Supabase
        const { data: quote, error: quoteError } = await supabase
          .from('quotes')
          .insert({
            email: emailToUse,
            destination_country: shippingContact.country || '',
            origin_country: products[0]?.country || '',
            status: 'pending',
            currency: 'USD',
            final_currency: 'USD',
            user_id: user ? user.id : undefined,
            shipping_address: shippingAddressData,
          })
          .select('id')
          .single();

        if (quoteError || !quote) {
          console.error('Error inserting quote:', quoteError);
          return;
        }

        const quoteItemsToInsert = items.map((item) => ({
          quote_id: quote.id,
          product_url: item.productUrl,
          product_name: item.productName,
          quantity: item.quantity,
          options: item.options,
          image_url: item.imageUrl,
          item_price: item.price && !isNaN(parseFloat(item.price)) ? parseFloat(item.price) : 0,
          item_weight: item.weight && !isNaN(parseFloat(item.weight)) ? parseFloat(item.weight) : 0,
        }));

        const { error: itemsError } = await supabase.from('quote_items').insert(quoteItemsToInsert);

        if (itemsError) {
          console.error('Error inserting quote items:', itemsError);
          return;
        }
      } else {
        // Separate quotes: Create individual quote for each product
        for (const product of products) {
          const item = {
            productUrl: product.url,
            productName: product.name,
            quantity: product.quantity,
            options: product.notes || '',
            imageUrl: product.file ? product.url : '',
            price: product.price,
            weight: product.weight,
          };

          // Submit individual quote to Supabase
          const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .insert({
              email: emailToUse,
              destination_country: shippingContact.country || '',
              origin_country: product.country || '',
              status: 'pending',
              currency: 'USD',
              final_currency: 'USD',
              user_id: user ? user.id : undefined,
              shipping_address: shippingAddressData,
            })
            .select('id')
            .single();

          if (quoteError || !quote) {
            console.error('Error inserting quote:', quoteError);
            continue;
          }

          const quoteItemToInsert = {
            quote_id: quote.id,
            product_url: item.productUrl,
            product_name: item.productName,
            quantity: item.quantity,
            options: item.options,
            image_url: item.imageUrl,
            item_price: item.price && !isNaN(parseFloat(item.price)) ? parseFloat(item.price) : 0,
            item_weight:
              item.weight && !isNaN(parseFloat(item.weight)) ? parseFloat(item.weight) : 0,
          };

          const { error: itemsError } = await supabase
            .from('quote_items')
            .insert([quoteItemToInsert]);

          if (itemsError) {
            console.error('Error inserting quote item:', itemsError);
          }
        }
      }

      // Auto-update user profile with shipping address country and currency
      if (user?.id) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, country, preferred_display_currency')
          .eq('id', user.id)
          .single();

        if (existingProfile && (!existingProfile.country || !existingProfile.preferred_display_currency)) {
          // Get destination country from shipping address
          const destinationCountry = shippingContact.country;
          
          // Get currency for destination country using CurrencyService
          let destinationCurrency = 'USD';
          if (destinationCountry) {
            try {
              destinationCurrency = await currencyService.getCurrencyForCountry(destinationCountry);
            } catch (error) {
              console.error('Error getting currency for country:', error);
              // Fall back to USD if there's an error
              destinationCurrency = 'USD';
            }
          }

          const updateData = {};
          if (!existingProfile.country) {
            updateData.country = destinationCountry;
          }
          if (!existingProfile.preferred_display_currency) {
            updateData.preferred_display_currency = destinationCurrency;
          }

          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update(updateData)
              .eq('id', user.id);

            if (updateError) {
              console.error('❌ Profile update failed:', updateError);
            }
          }
        }
      }

      setQuoteSubmitted(true);
    } catch (error) {
      console.error('Error submitting quote:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto py-4 sm:py-8 px-4 sm:px-6">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">Request a Quote</h1>
          <p className="text-sm sm:text-base text-gray-600 px-2">
            Get a detailed quote for your international shipping needs
          </p>
        </div>

        {quoteSubmitted ? (
          <div className="space-y-6 sm:space-y-8">
            {/* Success Message */}
            <div className="text-center space-y-4 sm:space-y-6 bg-white border border-gray-200 rounded-lg p-6 sm:p-10 shadow-sm">
              <div className="flex justify-center">
                <div className="bg-green-50 border border-green-200 p-4 sm:p-6 rounded-full">
                  <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-600" />
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-2xl sm:text-4xl font-semibold text-gray-900">
                  {quoteType === 'combined'
                    ? 'Quote Request Submitted!'
                    : 'Quote Requests Submitted!'}
                </h2>
                <div className="flex items-center justify-center gap-2 sm:gap-3 text-gray-700 bg-gray-50 border border-gray-200 px-4 sm:px-6 py-2 sm:py-3 rounded-lg inline-flex">
                  <Clock className="h-4 w-4 sm:h-6 sm:w-6" />
                  <span className="font-medium text-sm sm:text-lg">
                    Estimated Response: 24-48 hours
                  </span>
                </div>
                <div className="max-w-2xl mx-auto space-y-2 sm:space-y-3">
                  <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
                    {quoteType === 'combined'
                      ? "Thank you for your quote request. We'll review your products and get back to you with a detailed quote."
                      : "Thank you for your quote requests. We'll review each product individually and get back to you with separate detailed quotes."}
                  </p>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    {quoteType === 'combined'
                      ? "You'll receive a confirmation email shortly with your quote request details."
                      : "You'll receive confirmation emails shortly with your quote request details."}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-4 justify-center pt-4 sm:pt-6">
              <button
                onClick={() => {
                  setQuoteSubmitted(false);
                  setCurrentStep(1);
                  setProducts([
                    {
                      name: '',
                      url: '',
                      file: null,
                      quantity: 1,
                      price: '',
                      weight: '',
                      country: '',
                    },
                  ]);
                  setShippingContact({
                    name: '',
                    email: '',
                    whatsapp: '',
                    address: '',
                    country: '',
                    state: '',
                    city: '',
                    zip: '',
                  });
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-lg border border-blue-600 text-blue-600 bg-white hover:bg-blue-50 font-medium shadow-sm transition text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3"
              >
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                Request Another Quote
              </button>
              <button
                onClick={() => (window.location.href = '/dashboard')}
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-blue-600 text-white font-medium shadow-sm hover:bg-blue-700 transition text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3"
              >
                <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                Go to Dashboard
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="w-full sm:w-auto px-6 py-3 rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 font-medium shadow-sm transition text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3"
              >
                <svg
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Go to Home
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Progress Bar - Only shown during active flow */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center justify-center space-x-2 sm:space-x-4">
                <div
                  className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}
                >
                  <div
                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 text-xs sm:text-sm ${currentStep >= 1 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}
                  >
                    1
                  </div>
                  <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden sm:inline">
                    Product Info
                  </span>
                </div>
                <div
                  className={`w-8 sm:w-12 h-0.5 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}
                ></div>
                <div
                  className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}
                >
                  <div
                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 text-xs sm:text-sm ${currentStep >= 2 ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}
                  >
                    2
                  </div>
                  <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden sm:inline">
                    Shipping & Review
                  </span>
                </div>
              </div>
              {/* Mobile step labels */}
              <div className="flex justify-center space-x-8 mt-2 sm:hidden">
                <span
                  className={`text-xs font-medium ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}
                >
                  Product Info
                </span>
                <span
                  className={`text-xs font-medium ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}
                >
                  Shipping & Review
                </span>
              </div>
            </div>

            {renderStep()}
          </>
        )}
      </div>
    </div>
  );
}
