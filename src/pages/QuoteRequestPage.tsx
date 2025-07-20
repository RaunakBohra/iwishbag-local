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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Sparkles, Clock, CheckCircle, Package, Mail, User, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCountryUtils } from '@/lib/countryUtils';
import { currencyService } from '@/services/CurrencyService';

const steps = ['Product Info', 'Contact & Submit'];

export default function QuoteRequestPage() {
  const { user, convertAnonymousToRegistered } = useAuth();
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
  
  // Signup state for success page
  const [showSignupOption, setShowSignupOption] = useState(false);
  const [signupPassword, setSignupPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);

  const nextStep = () => setCurrentStep(currentStep + 1);
  const prevStep = () => setCurrentStep(currentStep - 1);

  const handleSignup = async () => {
    if (!submittedEmail || !signupPassword) return;
    
    setIsSigningUp(true);
    setSignupError('');
    
    try {
      const result = await convertAnonymousToRegistered(submittedEmail, signupPassword);
      
      if (result.success) {
        setSignupSuccess(true);
        setShowSignupOption(false);
        // Redirect to dashboard after a delay
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        setSignupError(result.error || 'Failed to create account');
      }
    } catch (error) {
      setSignupError('Something went wrong. Please try again.');
    } finally {
      setIsSigningUp(false);
    }
  };

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
        {/* Only show header on step 1 (product info) */}
        {!quoteSubmitted && currentStep === 1 && (
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">Request a Quote</h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
              Get accurate shipping costs for your international purchases
            </p>
          </div>
        )}

        {quoteSubmitted ? (
          <div className="max-w-2xl mx-auto">
            {/* Single Unified Success Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              {/* Success Icon & Message */}
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                  Quote Request Submitted!
                </h2>
                <p className="text-gray-600 text-base sm:text-lg lg:text-xl">
                  We'll review your {products?.length} {products?.length === 1 ? 'product' : 'products'} and send you a detailed quote within 24-48 hours.
                </p>
              </div>

              {/* Email Confirmation */}
              {submittedEmail && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-8">
                  <div className="flex items-center justify-center gap-2 text-teal-800">
                    <Mail className="h-5 w-5" />
                    <span className="font-medium text-sm sm:text-base">Updates will be sent to: {submittedEmail}</span>
                  </div>
                </div>
              )}

              {/* Action Section */}
              <div className="space-y-6">
                {user && !user.is_anonymous ? (
                  /* Registered User */
                  <button
                    onClick={() => (window.location.href = '/dashboard')}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all font-medium text-sm sm:text-base lg:text-lg flex items-center justify-center gap-2 mx-auto"
                  >
                    <Package className="h-5 w-5" />
                    Track Your Quotes
                  </button>
                ) : signupSuccess ? (
                  /* Signup Success */
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center justify-center gap-3 text-green-700">
                      <CheckCircle className="h-6 w-6" />
                      <div>
                        <p className="font-semibold text-sm sm:text-base">Account Created Successfully!</p>
                        <p className="text-xs sm:text-sm">Redirecting to your dashboard...</p>
                      </div>
                    </div>
                  </div>
                ) : !showSignupOption ? (
                  /* Optional Signup Invitation */
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-lg p-6">
                      <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-teal-800 mb-2">
                        Want to track your quote progress?
                      </h3>
                      <p className="text-teal-600 text-xs sm:text-sm lg:text-base mb-4">
                        Create an account to get notifications and track this quote in your dashboard.
                      </p>
                      <button
                        onClick={() => setShowSignupOption(true)}
                        className="px-4 sm:px-6 py-2 sm:py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm sm:text-base"
                      >
                        Create Account ({submittedEmail})
                      </button>
                      <p className="text-xs sm:text-sm text-teal-500 mt-2">
                        Optional - you'll receive quote updates via email either way
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Signup Form */
                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-lg p-6">
                    <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-teal-800 mb-4">Create Your Account</h3>
                    <div className="space-y-4">
                      <div className="text-left">
                        <label className="block text-xs sm:text-sm font-medium text-teal-700 mb-2">Email</label>
                        <input
                          type="email"
                          value={submittedEmail}
                          disabled
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-teal-300 rounded-lg bg-teal-100 text-teal-800 text-sm sm:text-base"
                        />
                      </div>
                      <div className="text-left">
                        <label className="block text-xs sm:text-sm font-medium text-teal-700 mb-2">Password</label>
                        <input
                          type="password"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          placeholder="Create a secure password"
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm sm:text-base"
                        />
                        <p className="text-xs sm:text-sm text-teal-600 mt-1">
                          8+ characters with uppercase, lowercase, number & symbol
                        </p>
                      </div>
                      {signupError && (
                        <div className="text-red-600 text-xs sm:text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                          {signupError}
                        </div>
                      )}
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setShowSignupOption(false);
                            setSignupPassword('');
                            setSignupError('');
                          }}
                          className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-teal-600 border border-teal-300 rounded-lg hover:bg-teal-50 transition-colors text-sm sm:text-base"
                        >
                          Skip for Now
                        </button>
                        <button
                          onClick={handleSignup}
                          disabled={!signupPassword || isSigningUp}
                          className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 text-sm sm:text-base"
                        >
                          {isSigningUp ? 'Creating...' : 'Create Account'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Simple Next Steps */}
                <div className="border-t border-gray-200 pt-6 space-y-4">
                  <p className="text-gray-600 text-xs sm:text-sm lg:text-base">
                    ✓ Our team will review your request<br/>
                    ✓ You'll receive a detailed quote via email<br/>
                    ✓ No commitment required until you approve
                  </p>
                  
                  {/* Simple Actions */}
                  <div className="flex items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm lg:text-base">
                    <button
                      onClick={() => {
                        setQuoteSubmitted(false);
                        setCurrentStep(1);
                        setProducts([{
                          name: '', url: '', file: null, quantity: 1, price: '', weight: '', country: '',
                        }]);
                        setContactInfo({ name: '', email: '' });
                        setDestinationCountry('');
                        setShowSignupOption(false);
                        setSignupSuccess(false);
                      }}
                      className="text-teal-600 hover:text-teal-800 font-medium"
                    >
                      Request Another Quote
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
                    <span className={`ml-2 sm:ml-3 text-xs sm:text-sm font-medium ${currentStep >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>
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
                    <span className={`ml-2 sm:ml-3 text-xs sm:text-sm font-medium ${currentStep >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>
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
