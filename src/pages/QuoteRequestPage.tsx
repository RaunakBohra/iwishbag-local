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

const steps = [
  'Product Info',
  'Shipping & Contact', 
  'Review & Submit',
];

export default function QuoteRequestPage() {
  const { user } = useAuth();
  const { countries } = useCountryUtils();
  const [currentStep, setCurrentStep] = useState(1);
  const [quoteType, setQuoteType] = useState('combined');
  const [products, setProducts] = useState([{
    name: '',
    url: '',
    file: null,
    quantity: 1,
    price: '',
    weight: '',
    country: ''
  }]);
  const [shippingContact, setShippingContact] = useState({
    name: '',
    email: '',
    whatsapp: '',
    address: '',
    country: '',
    state: '',
    city: '',
    zip: ''
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
      // Convert products to the format expected by the submission hook
      const items = products.map(product => ({
        productUrl: product.url,
        productName: product.name,
        quantity: product.quantity,
        options: '',
        imageUrl: product.file ? product.url : '',
        price: product.price,
        weight: product.weight,
      }));

      const formData = {
        items,
        countryCode: products[0]?.country || '',
        email: emailToUse,
        quoteType,
        shippingAddress: {
          fullName: shippingContact.name,
          streetAddress: shippingContact.address,
          city: shippingContact.city,
          state: shippingContact.state,
          postalCode: shippingContact.zip,
          country: shippingContact.country,
        }
      };

      // Store shipping address in the proper format
      const shippingAddressData = {
        fullName: shippingContact.name,
        streetAddress: shippingContact.address,
        city: shippingContact.city,
        state: shippingContact.state,
        postalCode: shippingContact.zip,
        country: shippingContact.country,  // Store country code for logic and DB
        country_code: shippingContact.country, // Add country_code for calculation compatibility
        phone: shippingContact.whatsapp || '',
        email: emailToUse
      };

      // Submit quote to Supabase
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          email: emailToUse,
          country_code: products[0]?.country || '',
          origin_country: products[0]?.country || '',
          status: 'pending',
          currency: 'USD',
          final_currency: 'USD',
          user_id: user ? user.id : undefined,
          shipping_address: shippingAddressData
        })
        .select('id')
        .single();

      if (quoteError || !quote) {
        console.error("Error inserting quote:", quoteError);
        return;
      }

      const quoteItemsToInsert = items.map(item => ({
        quote_id: quote.id,
        product_url: item.productUrl,
        product_name: item.productName,
        quantity: item.quantity,
        options: item.options,
        image_url: item.imageUrl,
        item_price: item.price && !isNaN(parseFloat(item.price)) ? parseFloat(item.price) : 0,
        item_weight: item.weight && !isNaN(parseFloat(item.weight)) ? parseFloat(item.weight) : 0,
      }));

      const { error: itemsError } = await supabase.from("quote_items").insert(quoteItemsToInsert);

      if (itemsError) {
        console.error("Error inserting quote items:", itemsError);
        return;
      }

      setQuoteSubmitted(true);
    } catch (error) {
      console.error("Error submitting quote:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Request a Quote</h1>
          <p className="text-gray-600">Get a detailed quote for your international shipping needs</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 1 ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300'}`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Product Info</span>
            </div>
            <div className={`w-12 h-0.5 ${currentStep >= 2 ? 'bg-green-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 2 ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300'}`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Shipping & Review</span>
            </div>
          </div>
        </div>

        {quoteSubmitted ? (
          <div className="space-y-8">
            {/* Success Message */}
            <div className="text-center space-y-6 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border border-green-200 rounded-2xl p-10 shadow-lg">
              <div className="flex justify-center">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-full shadow-lg">
                  <CheckCircle className="h-16 w-16 text-white" />
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
                  Quote Request Submitted!
                </h2>
                <div className="flex items-center justify-center gap-3 text-green-700 bg-green-100 px-6 py-3 rounded-full inline-flex shadow-sm">
                  <Clock className="h-6 w-6" />
                  <span className="font-semibold text-lg">Estimated Response: 24-48 hours</span>
                </div>
                <div className="max-w-2xl mx-auto space-y-3">
                  <p className="text-gray-700 text-lg leading-relaxed">
                    Thank you for your quote request. We'll review your products and get back to you with a detailed quote.
                  </p>
                  <p className="text-gray-500 text-sm">
                    You'll receive a confirmation email shortly with your quote request details.
                  </p>
                </div>
              </div>
            </div>

            {/* Product Summary After Submission */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Package className="h-8 w-8" />
                  Your Submitted Products
                </h3>
                <p className="text-blue-100 mt-2">Review the products you've requested a quote for</p>
              </div>
              <div className="p-8">
                <ProductSummary 
                  products={products} 
                  title="" 
                  showEditButton={false}
                  className="border-0 shadow-none bg-transparent"
                />
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <button
                onClick={() => {
                  setQuoteSubmitted(false);
                  setCurrentStep(1);
                  setProducts([{
                    name: '',
                    url: '',
                    file: null,
                    quantity: 1,
                    price: '',
                    weight: '',
                    country: ''
                  }]);
                  setShippingContact({
                    name: '',
                    email: '',
                    whatsapp: '',
                    address: '',
                    country: '',
                    state: '',
                    city: '',
                    zip: ''
                  });
                }}
                className="flex-1 sm:flex-none px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 font-semibold text-lg flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Sparkles className="h-5 w-5" />
                Request Another Quote
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 sm:flex-none px-10 py-4 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-200 font-semibold text-lg flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Go to Home
              </button>
            </div>
          </div>
        ) : (
          renderStep()
        )}
      </div>
    </div>
  );
} 