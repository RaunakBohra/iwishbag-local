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
import SimplifiedContactStep from '@/components/quote/SimplifiedContactStep';
import ProductSummary from '@/components/quote/ProductSummary';
import ConversionPrompt from '@/components/auth/ConversionPrompt';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Sparkles, Clock, CheckCircle, Package, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCountryUtils } from '@/lib/countryUtils';
import { currencyService } from '@/services/CurrencyService';

const steps = ['Product Info', 'Contact & Submit'];

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
  const [contactInfo, setContactInfo] = useState({
    name: '',
    email: '',
  });
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');

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
            destinationCountry={destinationCountry}
            setDestinationCountry={setDestinationCountry}
            next={nextStep}
          />
        );
      case 2:
        return (
          <SimplifiedContactStep
            contactInfo={contactInfo}
            setContactInfo={setContactInfo}
            destinationCountry={destinationCountry}
            next={handleSubmit}
            back={prevStep}
            products={products}
            quoteType={quoteType}
            isSubmitting={isSubmitting}
            submitError={submitError}
            clearError={() => setSubmitError('')}
          />
        );
      default:
        return null;
    }
  };

  const handleSubmit = async (submissionData?: { email?: string; name?: string }) => {
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // Debug logging to track email data flow
      console.log('handleSubmit called with:', { 
        submissionData, 
        userEmail: user?.email, 
        contactEmail: contactInfo.email 
      });
      
      // Determine email to use - prioritize passed data, then user email, then contactInfo
      const emailToUse = submissionData?.email || user?.email || contactInfo.email;
      
      // For anonymous users, email is optional (they can request quotes without email)
      // For authenticated (non-anonymous) users, validate email if provided
      if (emailToUse && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailToUse)) {
        setSubmitError('Please enter a valid email address.');
        setIsSubmitting(false);
        return;
      }

      // Store minimal contact and shipping info
      const shippingAddressData = {
        fullName: submissionData?.name || contactInfo.name,
        country: destinationCountry, // Store country code for logic and DB
        destination_country: destinationCountry, // Add destination_country for calculation compatibility
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
            product_name: products.map(p => p.name).join(', '),
            destination_country: destinationCountry || '',
            origin_country: products[0]?.country || '',
            status: 'pending',
            currency: 'USD',
            destination_currency: 'USD',
            user_id: user?.id || null, // Now uses anonymous auth user ID
            shipping_address: shippingAddressData,
          })
          .select('id')
          .single();

        if (quoteError || !quote) {
          console.error('Error inserting quote:', quoteError);
          setSubmitError('Failed to create quote. Please try again or contact support if the problem persists.');
          setIsSubmitting(false);
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
          setSubmitError('Failed to save product details. Please try again.');
          setIsSubmitting(false);
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
              product_name: product.name,
              destination_country: destinationCountry || '',
              origin_country: product.country || '',
              status: 'pending',
              currency: 'USD',
              destination_currency: 'USD',
              user_id: user?.id || null, // Now uses anonymous auth user ID
              shipping_address: shippingAddressData,
            })
            .select('id')
            .single();

          if (quoteError || !quote) {
            console.error('Error inserting quote:', quoteError);
            setSubmitError(`Failed to create quote for ${product.name || 'one of your products'}. Some quotes may have been created successfully.`);
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
      // Only for authenticated (non-anonymous) users
      if (user?.id && !user.is_anonymous) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, country, preferred_display_currency')
          .eq('id', user.id)
          .single();

        if (existingProfile && (!existingProfile.country || !existingProfile.preferred_display_currency)) {
          // Use the destination country from state
          const destCountry = destinationCountry;
          
          // Get currency for destination country using CurrencyService
          let destinationCurrency = 'USD';
          if (destCountry) {
            try {
              destinationCurrency = await currencyService.getCurrencyForCountry(destCountry);
            } catch (error) {
              console.error('Error getting currency for country:', error);
              // Fall back to USD if there's an error
              destinationCurrency = 'USD';
            }
          }

          const updateData = {};
          if (!existingProfile.country) {
            updateData.country = destCountry;
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
      setSubmittedEmail(emailToUse || '');
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error submitting quote:', error);
      setSubmitError('Something went wrong while submitting your quote. Please check your internet connection and try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Request a Quote</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get accurate shipping costs for your international purchases
          </p>
        </div>

        {quoteSubmitted ? (
          <div className="space-y-6 sm:space-y-8">
            {/* Anonymous User Conversion Prompt */}
            {user?.is_anonymous && (
              <ConversionPrompt 
                trigger="quote_submitted"
                submittedEmail={submittedEmail}
                onConversionSuccess={() => {
                  // Optionally redirect to dashboard after conversion
                  setTimeout(() => {
                    window.location.href = '/dashboard';
                  }, 2000);
                }}
              />
            )}

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
                    ? 'Your Combined Quote Request is Submitted!'
                    : 'Your Individual Quote Requests are Submitted!'}
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
                      ? "Thank you! We'll review all your products together and send you one comprehensive quote with combined shipping costs."
                      : "Thank you! We'll review each product separately and send you individual quotes for maximum flexibility."}
                  </p>
                  {submittedEmail && (
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 sm:p-4">
                      <p className="text-teal-800 text-sm sm:text-base font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                        Updates will be sent to: {submittedEmail}
                      </p>
                    </div>
                  )}
                  <p className="text-gray-500 text-xs sm:text-sm">
                    {quoteType === 'combined'
                      ? "You'll receive one confirmation email with your combined quote details."
                      : "You'll receive separate confirmation emails for each product quote."}
                  </p>
                </div>
              </div>
            </div>

            {/* What's Next - Focus on User's Immediate Needs */}
            <div className="text-center space-y-6">
              {/* Primary Action: What Most Users Want */}
              {user && !user.is_anonymous ? (
                <button
                  onClick={() => (window.location.href = '/dashboard')}
                  className="px-8 py-4 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 font-medium shadow-lg transition text-lg flex items-center justify-center gap-3 mx-auto"
                >
                  <Package className="h-5 w-5" />
                  Track Your Quotes
                </button>
              ) : (
                <button
                  onClick={() => (window.location.href = '/auth?mode=signup')}
                  className="px-8 py-4 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 font-medium shadow-lg transition text-lg flex items-center justify-center gap-3 mx-auto"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Create Account to Track Progress
                </button>
              )}
              
              {/* What Users Might Do Later */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-700 text-sm font-medium mb-2">What happens next?</p>
                <div className="text-xs text-gray-600 space-y-1">
                  {submittedEmail && <p>✓ You'll receive a confirmation email shortly</p>}
                  <p>✓ Our team will review your products within 24-48 hours</p>
                  {submittedEmail && <p>✓ You'll get detailed quotes via email</p>}
                  {(!user || user.is_anonymous) && <p>✓ Create an account anytime to track progress</p>}
                </div>
              </div>
              
              {/* Secondary Options - Small and Unobtrusive */}
              <div className="flex items-center justify-center gap-6 text-sm">
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
                    setDestinationCountry('');
                  }}
                  className="text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"
                >
                  <Sparkles className="h-4 w-4" />
                  Need another quote?
                </button>
                <span className="text-gray-300">•</span>
                <button
                  onClick={() => (window.location.href = '/')}
                  className="text-gray-500 hover:text-gray-700 font-medium"
                >
                  Back to Home
                </button>
              </div>
            </div>

          </div>
        ) : (
          <>
            {/* Modernized Progress Indicator */}
            <div className="mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between max-w-md mx-auto">
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                        currentStep >= 1 
                          ? 'bg-teal-600 text-white shadow-lg' 
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      1
                    </div>
                    <span className={`ml-3 text-sm font-medium ${currentStep >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>
                      Products
                    </span>
                  </div>
                  
                  <div className={`flex-1 mx-4 h-0.5 transition-colors ${currentStep >= 2 ? 'bg-teal-600' : 'bg-gray-200'}`}></div>
                  
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                        currentStep >= 2 
                          ? 'bg-teal-600 text-white shadow-lg' 
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      2
                    </div>
                    <span className={`ml-3 text-sm font-medium ${currentStep >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>
                      Contact
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {renderStep()}
          </>
        )}
      </div>
    </div>
  );
}
