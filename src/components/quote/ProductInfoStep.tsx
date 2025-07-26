// =========================
// QUOTE TYPE COUNTRY VALIDATION
// =========================
//
// This component implements intelligent country validation based on quote type:
//
// COMBINED QUOTES:
// - All products MUST be from the same country
// - Auto-sync: When first product's country changes, all other products sync to it
// - Visual indicators: Country fields for products 2+ are disabled and show "Auto-synced"
// - Validation: Prevents submission if different countries are detected
// - User guidance: Clear messaging about requirements and easy switch to separate quotes
// - Backend: Creates one quote with multiple items
//
// SEPARATE QUOTES:
// - Each product gets its own separate quotation
// - Auto-sync initially: Countries are auto-filled for convenience
// - Individual control: Users can change each product's country independently
// - Visual indicators: Country fields show "Auto-filled" but remain editable
// - No validation restrictions: Users can have different countries
// - Backend: Creates individual quote for each product
//
// AUTO-SYNC LOGIC:
// - useEffect watches first product's country for both quote types
// - updateProduct handles auto-sync when first product country changes
// - addProduct pre-fills new products with first product's country
// - Visual feedback shows sync/fill status with checkmarks and labels
//
// VALIDATION:
// - validate() only checks country consistency for combined quotes
// - Separate quotes have no country restrictions
// - Shows clear error messages with helpful suggestions
// - Prevents form submission until validation passes
// =========================

import React, { useState, useEffect } from 'react';
import { ImageUpload } from '@/components/ui/image-upload';
import { InlineFileUploadZone } from '@/components/ui/InlineFileUploadZone';
import { usePurchaseCountries } from '@/hooks/usePurchaseCountries';
import { useShippingCountries } from '@/hooks/useShippingCountries';
import { useAuth } from '@/contexts/AuthContext';
import {
  Upload,
  X,
  Plus,
  Globe,
  Info,
  AlertCircle,
  CheckCircle,
  FileText,
  MapPin,
  ArrowRight,
  Loader2,
  RefreshCw,
  Trash2,
  File,
  FileImage,
  FileSpreadsheet,
  Image,
  Eye,
  LogIn,
  ChevronDown,
  ChevronUp,
  Shield,
  Lock,
  HelpCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ShippingRouteDisplay } from '@/components/shared/ShippingRouteDisplay';
import { locationDetectionService } from '@/services/LocationDetectionService';
import { R2StorageService } from '@/services/R2StorageService';
import { urlAnalysisService } from '@/services/UrlAnalysisService';
import { productDataFetchService } from '@/services/ProductDataFetchService';
import { ProgressiveAuthModal } from '@/components/auth/ProgressiveAuthModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Add CSS animation for fade-in effect
const fadeInStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }
`;

export default function ProductInfoStep({
  products,
  setProducts,
  quoteType,
  setQuoteType,
  destinationCountry,
  setDestinationCountry,
  next,
}) {
  const { user } = useAuth();
  const { data: countries, isLoading, error: countryError } = usePurchaseCountries();
  const { data: shippingCountries, isLoading: shippingCountriesLoading } = useShippingCountries();
  const [errors, setErrors] = useState({});
  const [countryValidationError, setCountryValidationError] = useState('');
  const [destinationCountryError, setDestinationCountryError] = useState('');
  const [uploadStates, setUploadStates] = useState({}); // Track upload states for each product
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState({}); // Track expanded state for notes per product
  const [urlMismatchNotifications, setUrlMismatchNotifications] = useState({}); // Track URL country mismatches
  const [autoFillLoading, setAutoFillLoading] = useState({}); // Track auto-fill loading state per product
  const [autoFillStatus, setAutoFillStatus] = useState({}); // Track auto-fill success/error messages
  
  // Location detection debug state
  const [locationDebug, setLocationDebug] = useState({
    isDetecting: false,
    detectionMethod: null, // 'ip', 'timezone', 'manual'
    detectedCountry: null,
    detectedLocation: null,
    isSupported: null,
    error: null,
    timestamp: null
  });

  // Smart IP-based country detection with user choice fallback
  useEffect(() => {
    if (!destinationCountry && Array.isArray(shippingCountries)) {
      setLocationDebug(prev => ({ ...prev, isDetecting: true, timestamp: new Date().toISOString() }));
      
      // Get detailed location data for debug info
      Promise.all([
        locationDetectionService.detectLocation(),
        locationDetectionService.getSmartCountry()
      ])
        .then(([locationData, detectedCountry]) => {
          // Validate detected country exists in our supported shipping destinations
          const countryExists = shippingCountries.find(c => c.code === detectedCountry);
          
          // Determine detection method
          let detectionMethod = 'manual';
          if (locationData) {
            detectionMethod = locationData.city ? 'ip' : 'timezone';
          }
          
          const debugInfo = {
            isDetecting: false,
            detectionMethod,
            detectedCountry,
            detectedLocation: locationData,
            isSupported: !!countryExists,
            error: null,
            timestamp: new Date().toISOString()
          };
          
          setLocationDebug(debugInfo);
          
          if (countryExists) {
            setDestinationCountry(detectedCountry);
            console.log('✅ Auto-detected destination country:', detectedCountry, debugInfo);
          } else {
            console.log('❌ Detected country not supported for shipping:', detectedCountry, debugInfo);
            // Don't set any default - let user choose from available shipping destinations
          }
        })
        .catch(error => {
          const debugInfo = {
            isDetecting: false,
            detectionMethod: 'manual',
            detectedCountry: null,
            detectedLocation: null,
            isSupported: null,
            error: error.message || 'Detection failed',
            timestamp: new Date().toISOString()
          };
          
          setLocationDebug(debugInfo);
          console.log('❌ Country detection failed, user will choose manually:', error, debugInfo);
          // Don't set any default - let user choose
        });
    }
  }, [destinationCountry, shippingCountries, setDestinationCountry]);

  // Auto-sync countries for both combined and separate quotes (initial sync)
  useEffect(() => {
    if (products.length > 1) {
      const firstCountry = products[0]?.country;
      if (firstCountry) {
        const updatedProducts = products.map((product, index) => ({
          ...product,
          country: index === 0 ? product.country : firstCountry,
        }));
        setProducts(updatedProducts);
      }
    }
  }, [products[0]?.country]);

  const handleChange = (idx, field, value) => {
    const updated = products.map((p, i) => (i === idx ? { ...p, [field]: value } : p));
    setProducts(updated);
  };

  const addProduct = () => {
    const newProduct = {
      url: '',
      title: '', // Product title field
      files: [], // Array of uploaded files with metadata
      quantity: 1,
      price: '',
      weight: '',
      country: products[0]?.country || '', // Auto-sync for both quote types
      notes: '',
    };
    setProducts([...products, newProduct]);
  };

  const removeProduct = (idx) => {
    setProducts(products.filter((_, i) => i !== idx));
    setUploadStates((prev) => {
      const newStates = { ...prev };
      delete newStates[idx];
      return newStates;
    });
    setExpandedNotes((prev) => {
      const newStates = { ...prev };
      delete newStates[idx];
      return newStates;
    });
  };

  const updateProduct = (index, field, value) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [field]: value };

    // Auto-sync countries for both quote types when first product changes
    if (field === 'country' && index === 0) {
      newProducts.forEach((product, i) => {
        if (i > 0) {
          product.country = value;
        }
      });
    }

    setProducts(newProducts);
  };

  const handleFileUpload = async (productIndex, file) => {
    // Require authentication for file uploads
    if (!user || user.is_anonymous) {
      setShowSignInPrompt(true);
      throw new Error('Authentication required');
    }

    // Get or create session ID
    const sessionId = localStorage.getItem('anonymous_session_id') || crypto.randomUUID();
    if (!localStorage.getItem('anonymous_session_id')) {
      localStorage.setItem('anonymous_session_id', sessionId);
    }

    // Upload to R2 via worker
    const r2Service = R2StorageService.getInstance();
    const { url, key } = await r2Service.uploadFile(file, {
      sessionId: sessionId,
      productIndex: productIndex
    });

    return { url, key };
  };

  const handleFilesChange = (productIndex, files) => {
    updateProduct(productIndex, 'files', files);
  };

  const toggleNotesExpansion = (productIndex) => {
    setExpandedNotes(prev => ({
      ...prev,
      [productIndex]: !prev[productIndex]
    }));
  };

  const handleNotesChange = (productIndex, value) => {
    updateProduct(productIndex, 'notes', value);
    
    // Auto-expand if text is long
    if (value.length > 100 && !expandedNotes[productIndex]) {
      setExpandedNotes(prev => ({
        ...prev,
        [productIndex]: true
      }));
    }
  };

  const handleUrlChange = async (productIndex, url) => {
    updateProduct(productIndex, 'url', url);
    
    if (!url) {
      // Clear any notifications when URL is cleared
      setUrlMismatchNotifications(prev => {
        const newNotifications = { ...prev };
        delete newNotifications[productIndex];
        return newNotifications;
      });
      setAutoFillStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[productIndex];
        return newStatus;
      });
      return;
    }
    
    // Only proceed if valid URL
    if (!isValidUrl(url)) {
      return;
    }
    
    // Start auto-fill process
    setAutoFillLoading(prev => ({ ...prev, [productIndex]: true }));
    setAutoFillStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[productIndex];
      return newStatus;
    });
    
    try {
      // Fetch product data
      const result = await productDataFetchService.fetchProductData(url);
      
      if (result.success && result.data) {
        const productData = result.data;
        
        // Auto-fill the fields
        if (productData.title && !products[productIndex].title) {
          updateProduct(productIndex, 'title', productData.title);
        }
        
        if (productData.price && !products[productIndex].price) {
          updateProduct(productIndex, 'price', productData.price.toString());
        }
        
        if (productData.weight && !products[productIndex].weight) {
          updateProduct(productIndex, 'weight', productData.weight.toFixed(2));
        }
        
        // Set success status
        const filledFields = [];
        if (productData.title) filledFields.push('title');
        if (productData.price) filledFields.push('price');
        if (productData.weight) filledFields.push('weight');
        
        if (filledFields.length > 0) {
          setAutoFillStatus(prev => ({
            ...prev,
            [productIndex]: {
              type: 'success',
              message: `Auto-filled: ${filledFields.join(', ')}`,
              source: result.source
            }
          }));
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            setAutoFillStatus(prev => {
              const newStatus = { ...prev };
              delete newStatus[productIndex];
              return newStatus;
            });
          }, 3000);
        }
      } else if (result.source === 'mock') {
        // Don't show error for mock data, just silently continue
      } else {
        // Show error status
        setAutoFillStatus(prev => ({
          ...prev,
          [productIndex]: {
            type: 'error',
            message: 'Could not fetch product details',
            source: result.source
          }
        }));
      }
    } catch (error) {
      console.error('Auto-fill error:', error);
      setAutoFillStatus(prev => ({
        ...prev,
        [productIndex]: {
          type: 'error',
          message: 'Failed to auto-fill product details',
          source: 'error'
        }
      }));
    } finally {
      setAutoFillLoading(prev => ({ ...prev, [productIndex]: false }));
    }
    
    // Analyze URL
    const analysis = urlAnalysisService.analyzeUrl(url);
    
    // Update notes placeholder based on category
    if (analysis.category && analysis.categoryPrompts) {
      // This will trigger a re-render with new placeholder
      // The placeholder is handled in the JSX directly
    }
    
    // Check country match
    const currentCountry = products[productIndex].country;
    if (currentCountry && analysis.suggestedCountry) {
      const countryMatch = urlAnalysisService.checkCountryMatch(url, currentCountry);
      
      if (!countryMatch.matches) {
        // Auto-correct country
        updateProduct(productIndex, 'country', analysis.suggestedCountry);
        
        // Set notification
        const countryName = countries?.find(c => c.code === analysis.suggestedCountry)?.name || analysis.suggestedCountry;
        const notification = {
          type: 'warning',
          message: `Country updated to ${countryName} to match ${analysis.domain}`,
          alternativeDomain: countryMatch.alternativeDomain
        };
        
        setUrlMismatchNotifications(prev => ({
          ...prev,
          [productIndex]: notification
        }));
        
        // Auto-clear notification after 5 seconds
        setTimeout(() => {
          setUrlMismatchNotifications(prev => {
            const newNotifications = { ...prev };
            delete newNotifications[productIndex];
            return newNotifications;
          });
        }, 5000);
      } else {
        // Clear any existing notification
        setUrlMismatchNotifications(prev => {
          const newNotifications = { ...prev };
          delete newNotifications[productIndex];
          return newNotifications;
        });
      }
    }
  };




  const validate = () => {
    const newErrors = {};
    setCountryValidationError('');
    setDestinationCountryError('');

    // Validate destination country
    if (!destinationCountry) {
      setDestinationCountryError('Destination country is required');
      return false;
    }

    // Only validate country consistency for combined quotes
    if (quoteType === 'combined' && products.length > 1) {
      const firstCountry = products[0]?.country;
      const differentCountries = products.some(
        (product, index) => index > 0 && product.country && product.country !== firstCountry,
      );

      if (differentCountries) {
        setCountryValidationError(
          'Combined quotes require all products to be from the same country. Please select the same country for all products or switch to separate quotes.',
        );
        return false;
      }
    }

    products.forEach((product, index) => {
      const hasFiles = product.files && product.files.length > 0;
      if (!product.url && !hasFiles) {
        newErrors[`url-${index}`] = 'Either URL or file upload is required';
      }
      if (product.url && !isValidUrl(product.url)) {
        newErrors[`url-${index}`] = 'Please enter a valid URL';
      }
      if (!product.country) {
        newErrors[`country-${index}`] = 'Purchase country is required for shipping calculations';
      }
      if (!product.quantity || product.quantity < 1) {
        newErrors[`quantity-${index}`] = 'Quantity must be at least 1';
      }
    });

    setErrors(newErrors);
    return (
      Object.keys(newErrors).length === 0 && !countryValidationError && !destinationCountryError
    );
  };

  const handleNext = () => {
    if (validate()) next();
  };

  const getQuoteTypeMessage = () => {
    if (quoteType === 'combined') {
      return {
        type: 'info',
        message:
          'All products must be from the same country for combined shipping and better rates.',
        icon: Info,
        color: 'blue',
      };
    }
    return null; // No message for separate quotes
  };

  const getCountryFieldProps = (index) => {
    if (quoteType === 'combined' && index > 0) {
      return {
        disabled: true,
        className: 'w-full border rounded p-2 bg-gray-100 text-gray-500 cursor-not-allowed',
        title: "Auto-synced to first product's country",
      };
    }
    return {
      className:
        'w-full border border-gray-200 rounded p-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500',
    };
  };

  const getNotesPlaceholder = (productIndex) => {
    const product = products[productIndex];
    if (!product?.url) {
      return "Add notes (size, color, special instructions)...";
    }
    
    const analysis = urlAnalysisService.analyzeUrl(product.url);
    if (analysis.categoryPrompts) {
      return analysis.categoryPrompts.notesPlaceholder;
    }
    
    return "Size, color, variant, or any specific requirements";
  };

  const quoteTypeMessage = getQuoteTypeMessage();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: fadeInStyles }} />
      <div className="space-y-6">
        {/* Trust Signals Bar */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-center gap-6 text-xs sm:text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Shield className="h-4 w-4 text-green-600" />
          <span className="font-medium">SSL Secured</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Lock className="h-4 w-4 text-blue-600" />
          <span className="font-medium">Your data is safe</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <CheckCircle className="h-4 w-4 text-teal-600" />
          <span className="font-medium">No hidden fees</span>
        </div>
      </div>

      {/* Clear Quote Type Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 mb-2">
            How would you like your quote?
          </h3>
          <p className="text-gray-600 text-xs sm:text-sm lg:text-base">
            Choose the option that works best for your shopping needs
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Separate Quotes Option */}
          <label
            className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-teal-300 ${
              quoteType === 'separate'
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="quoteType"
              value="separate"
              checked={quoteType === 'separate'}
              onChange={(e) => setQuoteType(e.target.value)}
              className="sr-only"
            />
            <div className="flex items-start gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 mt-0.5 transition-all ${
                  quoteType === 'separate' ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
                }`}
              >
                {quoteType === 'separate' && (
                  <div className="w-2.5 h-2.5 bg-white rounded-full m-0.5"></div>
                )}
              </div>
              <div>
                <div className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">
                  Separate Quotes
                </div>
                <div className="text-xs sm:text-sm text-gray-600 mb-2">
                  Get individual quotes for each product
                </div>
                <div className="text-xs sm:text-sm text-gray-500">
                  ✓ Products can be from different countries
                  <br />
                  ✓ More flexibility in ordering
                  <br />✓ Easier to compare individual costs
                </div>
              </div>
            </div>
          </label>

          {/* Combined Quote Option */}
          <label
            className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-teal-300 ${
              quoteType === 'combined'
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="quoteType"
              value="combined"
              checked={quoteType === 'combined'}
              onChange={(e) => setQuoteType(e.target.value)}
              className="sr-only"
            />
            <div className="flex items-start gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 mt-0.5 transition-all ${
                  quoteType === 'combined' ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
                }`}
              >
                {quoteType === 'combined' && (
                  <div className="w-2.5 h-2.5 bg-white rounded-full m-0.5"></div>
                )}
              </div>
              <div>
                <div className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">
                  Single Combined Quote
                </div>
                <div className="text-xs sm:text-sm text-gray-600 mb-2">
                  Get one quote for all products together
                </div>
                <div className="text-xs sm:text-sm text-gray-500">
                  ✓ Potentially lower shipping costs
                  <br />
                  ✓ One simple quote to review
                  <br />
                  ⚠️ All products must be from same country
                </div>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Compact Destination Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-teal-600" />
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">
              Deliver to
            </h3>
          </div>

          <div className="flex-1 max-w-xs">
            <select
              value={destinationCountry}
              onChange={(e) => {
                setDestinationCountry(e.target.value);
                // Update debug info for manual selection
                if (e.target.value && locationDebug.detectionMethod !== 'manual') {
                  setLocationDebug(prev => ({
                    ...prev,
                    detectionMethod: 'manual',
                    timestamp: new Date().toISOString()
                  }));
                }
              }}
              className={`w-full border rounded-lg p-2 sm:p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors bg-white ${
                destinationCountryError ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            >
              <option value="">🌍 Select country</option>
              {shippingCountriesLoading ? (
                <option>Loading...</option>
              ) : Array.isArray(shippingCountries) ? (
                shippingCountries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))
              ) : (
                <option>No shipping destinations available</option>
              )}
            </select>
          </div>

          {destinationCountryError && (
            <div className="text-red-500 text-xs sm:text-sm flex items-center gap-1">
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              Required
            </div>
          )}
        </div>

      </div>

      {/* Country Validation Error */}
      {countryValidationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs sm:text-sm">
              <p className="font-medium text-red-800 mb-1 text-sm sm:text-base">Country Mismatch</p>
              <p className="text-red-700 mb-3">{countryValidationError}</p>
              <button
                onClick={() => setQuoteType('separate')}
                className="text-red-600 hover:text-red-800 underline font-medium text-xs sm:text-sm"
              >
                Switch to Separate Quotes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compact Products Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="h-5 w-5 text-teal-600" />
          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">Products</h3>
        </div>

        <div className="space-y-4">
          {products.map((product, index) => (
            <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold animate-fade-in">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900 text-sm sm:text-base">
                    Product {index + 1}
                  </span>
                </div>
                {products.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProduct(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-all duration-150"
                    title="Remove product"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Row 1: Purchase Country + Product URL - Always inline */}
              <div className="flex gap-2 sm:gap-3">
                {/* Purchase Country - 18% on all screen sizes */}
                <div className="w-[18%] min-w-[100px]">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <span>Country *</span>
                    <div className="group relative inline-block">
                      <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-10">
                        Where you're buying from
                      </div>
                    </div>
                    {quoteType === 'combined' && index > 0 && (
                      <span className="text-teal-600 ml-1 text-xs font-normal">
                        (Auto)
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <select
                      value={product.country}
                      onChange={(e) => updateProduct(index, 'country', e.target.value)}
                      className={`w-full h-[40px] sm:h-[48px] border rounded-lg p-2 sm:p-3 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors ${
                        quoteType === 'combined' && index > 0
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                          : 'border-gray-200 bg-white'
                      } ${isLoading ? 'pr-8' : ''}`}
                      disabled={quoteType === 'combined' && index > 0 || isLoading}
                    >
                      <option value="">Select</option>
                      {isLoading ? (
                        <option>Loading countries...</option>
                      ) : countryError ? (
                        <option>Error loading countries</option>
                      ) : Array.isArray(countries) ? (
                        countries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))
                      ) : (
                        <option>No countries available</option>
                      )}
                    </select>
                    {isLoading && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                  {errors[`country-${index}`] && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors[`country-${index}`]}
                    </p>
                  )}
                  {quoteType === 'combined' && index > 0 && product.country && (
                    <div className="flex items-center gap-1 mt-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-green-600">
                        Synced
                      </span>
                    </div>
                  )}
                </div>

                {/* Product URL - 82% on all screen sizes */}
                <div className="flex-1 w-[82%]">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Product URL {!product.url && !product.files?.length && '*'}
                    {autoFillLoading[index] && (
                      <span className="ml-2 text-xs text-blue-600 font-normal">
                        <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                        Fetching details...
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={product.url}
                      onChange={(e) => handleUrlChange(index, e.target.value)}
                      aria-label={`Product ${index + 1} URL`}
                      aria-required={!product.files?.length}
                      aria-invalid={!!errors[`url-${index}`]}
                      aria-describedby={errors[`url-${index}`] ? `url-error-${index}` : undefined}
                      className={`w-full h-[40px] sm:h-[48px] border border-gray-200 rounded-lg p-2 sm:p-3 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors ${
                        autoFillLoading[index] ? 'pr-10' : ''
                      }`}
                      placeholder="Paste product URL (Amazon, eBay, etc.) or upload files below"
                    />
                    {autoFillLoading[index] && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      </div>
                    )}
                  </div>
                  {errors[`url-${index}`] && (
                    <p id={`url-error-${index}`} className="text-red-500 text-xs mt-1" role="alert">
                      {errors[`url-${index}`]}
                    </p>
                  )}
                  {urlMismatchNotifications[index] && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg animate-fade-in">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs">
                          <p className="text-yellow-800 font-medium">
                            {urlMismatchNotifications[index].message}
                          </p>
                          {urlMismatchNotifications[index].alternativeDomain && (
                            <p className="text-yellow-700 mt-1">
                              Tip: Use {urlMismatchNotifications[index].alternativeDomain} for local shopping
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {autoFillStatus[index] && (
                    <div className={`mt-2 p-2 rounded-lg animate-fade-in ${
                      autoFillStatus[index].type === 'success' 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        {autoFillStatus[index].type === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="text-xs">
                          <p className={`font-medium ${
                            autoFillStatus[index].type === 'success' ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {autoFillStatus[index].message}
                          </p>
                          {autoFillStatus[index].source === 'mock' && (
                            <p className="text-gray-600 mt-0.5 text-xs">
                              Using sample data
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Product Title - Full width */}
              <div className="mt-3">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Product Title (optional)
                  <div className="group relative inline-block ml-1">
                    <HelpCircle className="h-3 w-3 text-gray-400 cursor-help inline" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-10">
                      Helps us identify your product accurately
                    </div>
                  </div>
                </label>
                <input
                  type="text"
                  value={product.title || ''}
                  onChange={(e) => updateProduct(index, 'title', e.target.value)}
                  className="w-full h-[40px] sm:h-[48px] border border-gray-200 rounded-lg p-2 sm:p-3 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                  placeholder="Product name (e.g., Nike Air Max 270, iPhone 15 Pro)"
                  aria-label={`Product ${index + 1} title`}
                />
              </div>

              {/* Row 3: Quantity + Price + Weight - Always inline */}
              <div className="mt-3">
                <div className="flex gap-2 sm:gap-3">
                  {/* Quantity - ~30% on mobile, ~20% on desktop */}
                  <div className="w-[30%] sm:w-[20%] min-w-[70px] sm:min-w-[80px]">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Qty *
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={product.quantity}
                      onChange={(e) =>
                        updateProduct(index, 'quantity', parseInt(e.target.value) || 1)
                      }
                      className="w-full h-[40px] sm:h-[48px] border border-gray-200 rounded-lg p-2 sm:p-3 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                      placeholder="1"
                    />
                    {errors[`quantity-${index}`] && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors[`quantity-${index}`]}
                      </p>
                    )}
                  </div>

                  {/* Price - ~35% on mobile, ~25% on desktop */}
                  <div className="flex-1 w-[35%] sm:w-[25%] min-w-[80px] sm:min-w-[100px]">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Price
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={product.price}
                      onChange={(e) => updateProduct(index, 'price', e.target.value)}
                      className="w-full h-[40px] sm:h-[48px] border border-gray-200 rounded-lg p-2 sm:p-3 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Weight - ~35% on mobile, ~25% on desktop */}
                  <div className="flex-1 w-[35%] sm:w-[25%] min-w-[80px] sm:min-w-[100px]">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={product.weight}
                      onChange={(e) => updateProduct(index, 'weight', e.target.value)}
                      className="w-full h-[40px] sm:h-[48px] border border-gray-200 rounded-lg p-2 sm:p-3 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                      placeholder="0.00"
                    />
                  </div>

                </div>
              </div>

              {/* Row 3: Notes + Upload Files */}
              <div className="mt-4">
                <div className="flex gap-2 sm:gap-3">
                  {/* Notes Field - 70% on mobile, 75% on desktop */}
                  <div className="flex-1 w-[70%] sm:w-[75%]">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Notes (optional)
                    </label>
                    
                    {expandedNotes[index] ? (
                      // Expanded textarea
                      <div className="relative">
                        <textarea
                          value={product.notes}
                          onChange={(e) => handleNotesChange(index, e.target.value)}
                          className="w-full border border-gray-200 rounded-lg p-2 sm:p-3 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 min-h-[80px] resize-vertical transition-all duration-200"
                          placeholder={getNotesPlaceholder(index)}
                          rows={3}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => toggleNotesExpansion(index)}
                          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Collapse notes"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      // Collapsed single-line input
                      <div className="relative">
                        <input
                          type="text"
                          value={product.notes}
                          onChange={(e) => handleNotesChange(index, e.target.value)}
                          className="w-full h-[40px] sm:h-[48px] border border-gray-200 rounded-lg p-2 sm:p-3 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 pr-10"
                          placeholder={getNotesPlaceholder(index).split('(')[0].trim() + '...'}
                        />
                        <button
                          type="button"
                          onClick={() => toggleNotesExpansion(index)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Expand notes"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Upload Files - 30% on mobile, 25% on desktop - Only show if files exist or user is authenticated */}
                  {(product.files && product.files.length > 0) || (user && !user.is_anonymous) ? (
                    <div className="w-[30%] sm:w-[25%] min-w-[100px] sm:min-w-[120px]">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <span>Files</span>
                        <div className="group relative inline-block">
                          <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-10">
                            Max 10MB per file • 5 files max
                          </div>
                        </div>
                      </label>
                      {(!user || user.is_anonymous) ? (
                        <button
                          type="button"
                          className="w-full h-[40px] sm:h-[48px] flex items-center justify-center border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          onClick={() => setShowSignInPrompt(true)}
                          aria-label="Sign in to upload files"
                        >
                          <div className="flex items-center gap-1 sm:gap-2">
                            <LogIn className="h-4 w-4 text-blue-600" />
                            <span className="text-blue-700 text-xs sm:text-sm font-medium hidden sm:inline">
                              Sign In
                            </span>
                          </div>
                        </button>
                      ) : (
                        <InlineFileUploadZone
                          onFilesChange={(files) => handleFilesChange(index, files)}
                          onFileUpload={(file) => handleFileUpload(index, file)}
                          uploadedFiles={product.files || []}
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                          maxSize={10 * 1024 * 1024} // 10MB
                          maxFiles={5}
                        />
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Smart Shipping Preview - Only show when we have destination and at least one product with country */}
      {destinationCountry && products.some(p => p.country) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Shipping Routes & Quick Tips</h4>
              
              {/* Shipping Routes */}
              <div className="text-xs text-blue-700 space-y-1 mb-3">
                {products.filter(p => p.country).map((product, index) => {
                  const fromCountry = countries?.find(c => c.code === product.country)?.name || product.country;
                  const toCountry = shippingCountries?.find(c => c.code === destinationCountry)?.name || destinationCountry;
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-blue-600" />
                      <span className="font-medium">{product.title || `Product ${index + 1}`}:</span>
                      <span>{fromCountry} → {toCountry}</span>
                      {product.weight && (
                        <span className="text-blue-600">({product.weight}kg)</span>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Enhanced Tips */}
              <div className="space-y-1 pt-2 border-t border-blue-200">
                <h5 className="text-xs font-medium text-blue-900 mb-1">For faster & accurate quotes:</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  <div className="flex items-start gap-1">
                    <span className="text-blue-600 font-medium">•</span>
                    <span className="text-xs text-blue-700">
                      <strong>Price:</strong> Helps calculate customs instantly
                    </span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="text-blue-600 font-medium">•</span>
                    <span className="text-xs text-blue-700">
                      <strong>Weight:</strong> Ensures accurate shipping costs
                    </span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="text-blue-600 font-medium">•</span>
                    <span className="text-xs text-blue-700">
                      <strong>Title:</strong> Easy tracking of your items
                    </span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="text-blue-600 font-medium">•</span>
                    <span className="text-xs text-blue-700">
                      <strong>Notes:</strong> Correct variant delivery
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons - Centered Add + Right Continue */}
      <div className="relative flex items-center justify-center mt-4 pt-4 border-t border-gray-100">
        {/* Add Product Button - Centered */}
        {products.length < 10 && (
          <button
            type="button"
            onClick={addProduct}
            className="flex items-center gap-2 px-4 py-2 text-orange-600 hover:text-orange-700 border border-orange-200 hover:border-orange-300 rounded-lg hover:bg-orange-50 transition-all duration-200 text-sm font-medium"
          >
            <Plus className="h-4 w-4 transition-colors" />
            <span>Add Product</span>
          </button>
        )}

        {/* Continue Button - Absolute positioned to right */}
        <button
          type="button"
          onClick={handleNext}
          className="absolute right-0 flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium shadow-sm"
        >
          <span>Continue</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Sign-In Prompt Modal */}
      <Dialog open={showSignInPrompt} onOpenChange={setShowSignInPrompt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Sign In to Upload Files</DialogTitle>
          </DialogHeader>
          <ProgressiveAuthModal
            onSuccess={() => {
              setShowSignInPrompt(false);
              // Reload the component to show upload buttons for authenticated user
              window.location.reload();
            }}
            onBack={() => setShowSignInPrompt(false)}
          />
        </DialogContent>
      </Dialog>

      </div>
    </>
  );
}
