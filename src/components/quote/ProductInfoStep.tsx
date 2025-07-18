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
import { usePurchaseCountries } from '@/hooks/usePurchaseCountries';
import { Upload, X, Plus, Globe, Info, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default function ProductInfoStep({ products, setProducts, quoteType, setQuoteType, next }) {
  const { data: countries, isLoading, error: countryError } = usePurchaseCountries();
  const [errors, setErrors] = useState({});
  const [countryValidationError, setCountryValidationError] = useState('');

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
      name: '',
      url: '',
      file: null,
      quantity: 1,
      price: '',
      weight: '',
      country: products[0]?.country || '', // Auto-sync for both quote types
      notes: '',
    };
    setProducts([...products, newProduct]);
  };

  const removeProduct = (idx) => setProducts(products.filter((_, i) => i !== idx));

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

  const handleFileUpload = async (index, file) => {
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `product-images/${fileName}`;

    const { error } = await supabase.storage.from('product-images').upload(filePath, file);

    if (error) {
      console.error('Error uploading file:', error);
      return;
    }

    const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);

    updateProduct(index, 'file', file);
    updateProduct(index, 'url', data.publicUrl);
  };

  const validate = () => {
    const newErrors = {};
    setCountryValidationError('');

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
      if (!product.url && !product.file) {
        newErrors[`url-${index}`] = 'Either URL or file upload is required';
      }
      if (product.url && !isValidUrl(product.url)) {
        newErrors[`url-${index}`] = 'Please enter a valid URL';
      }
      if (!product.country) {
        newErrors[`country-${index}`] = 'Purchase country is required';
      }
      if (!product.quantity || product.quantity < 1) {
        newErrors[`quantity-${index}`] = 'Quantity must be at least 1';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && !countryValidationError;
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
      className: 'w-full border border-gray-200 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    };
  };

  const quoteTypeMessage = getQuoteTypeMessage();

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Quote Type Selection */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Globe className="h-5 w-5 mr-2" />
          How would you like your quote?
        </h3>
        <div className="flex flex-row flex-wrap gap-3 sm:gap-4">
          <div
            className={`flex-1 min-w-[180px] p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all ${
              quoteType === 'separate'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setQuoteType('separate')}
          >
            <div className="flex items-center mb-2">
              <div
                className={`w-4 h-4 rounded-full border-2 mr-3 ${
                  quoteType === 'separate' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}
              >
                {quoteType === 'separate' && (
                  <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                )}
              </div>
              <span className="font-medium">Separate Quotes</span>
            </div>
            <p className="text-sm text-gray-600 ml-7">Get individual quotes for each item</p>
          </div>

          <div
            className={`flex-1 min-w-[180px] p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all ${
              quoteType === 'combined'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setQuoteType('combined')}
          >
            <div className="flex items-center mb-2">
              <div
                className={`w-4 h-4 rounded-full border-2 mr-3 ${
                  quoteType === 'combined' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}
              >
                {quoteType === 'combined' && (
                  <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                )}
              </div>
              <span className="font-medium">Combined Quote</span>
            </div>
            <p className="text-sm text-gray-600 ml-7">Get one quote for all items together</p>
          </div>
        </div>

        {/* Quote Type Information Message - Only for Combined Quotes */}
        {quoteTypeMessage && (
          <div
            className={`mt-4 p-3 sm:p-4 rounded-lg border border-${quoteTypeMessage.color}-200 bg-${quoteTypeMessage.color}-50`}
          >
            <div className="flex items-start gap-3">
              <quoteTypeMessage.icon
                className={`h-5 w-5 text-${quoteTypeMessage.color}-600 mt-0.5 flex-shrink-0`}
              />
              <div className="text-sm">
                <p className={`font-medium text-${quoteTypeMessage.color}-800 mb-1`}>
                  Combined Quote Requirements
                </p>
                <p className={`text-${quoteTypeMessage.color}-700`}>{quoteTypeMessage.message}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Country Validation Error */}
      {countryValidationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-red-800 mb-1">Country Mismatch</p>
              <p className="text-red-700 mb-3">{countryValidationError}</p>
              <button
                onClick={() => setQuoteType('separate')}
                className="text-red-600 hover:text-red-800 underline font-medium"
              >
                Switch to Separate Quotes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Section */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-6">
        <div className="mb-4 sm:mb-6">
          <h3 className="text-lg font-semibold">Product Information</h3>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {products.map((product, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h4 className="font-medium">Product {index + 1}</h4>
                {products.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProduct(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Purchase Country *
                    {quoteType === 'combined' && index > 0 && (
                      <span className="text-blue-600 ml-2 text-xs">(Auto-synced)</span>
                    )}
                  </label>
                  <select
                    value={product.country}
                    onChange={(e) => updateProduct(index, 'country', e.target.value)}
                    {...getCountryFieldProps(index)}
                  >
                    <option value="">Select country</option>
                    {isLoading ? (
                      <option>Loading countries...</option>
                    ) : countryError ? (
                      <option>Failed to load countries</option>
                    ) : (
                      countries?.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))
                    )}
                  </select>
                  {errors[`country-${index}`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`country-${index}`]}</p>
                  )}
                  {quoteType === 'combined' && index > 0 && product.country && (
                    <div className="flex items-center gap-1 mt-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-green-600">Synced with Product 1</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Product Name (optional)</label>
                  <input
                    type="text"
                    value={product.name}
                    onChange={(e) => updateProduct(index, 'name', e.target.value)}
                    className="w-full border border-gray-200 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter product name"
                  />
                </div>
              </div>

              <div className="mt-3 sm:mt-4">
                <label className="block text-sm font-medium mb-1">
                  Product URL or File Upload *
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={product.url}
                    onChange={(e) => updateProduct(index, 'url', e.target.value)}
                    className="flex-1 border border-gray-200 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/product"
                  />
                  <label className="flex items-center justify-center px-3 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer hover:bg-gray-200 min-h-[42px]">
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(index, e.target.files[0])}
                    />
                  </label>
                </div>
                {errors[`url-${index}`] && (
                  <p className="text-red-500 text-xs mt-1">{errors[`url-${index}`]}</p>
                )}
                {product.file && (
                  <p className="text-green-600 text-xs mt-1">
                    ✓ File uploaded: {product.file.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={product.quantity}
                    onChange={(e) =>
                      updateProduct(index, 'quantity', parseInt(e.target.value) || 1)
                    }
                    className="w-full border border-gray-200 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors[`quantity-${index}`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`quantity-${index}`]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Price (optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={product.price}
                    onChange={(e) => updateProduct(index, 'price', e.target.value)}
                    className="w-full border border-gray-200 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Weight (optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={product.weight}
                    onChange={(e) => updateProduct(index, 'weight', e.target.value)}
                    className="w-full border border-gray-200 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00 kg"
                  />
                </div>
              </div>

              {/* Product Notes */}
              <div className="mt-3 sm:mt-4">
                <label className="block text-sm font-medium mb-1">Product Notes (optional)</label>
                <textarea
                  value={product.notes}
                  onChange={(e) => updateProduct(index, 'notes', e.target.value)}
                  className="w-full border border-gray-200 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[60px] resize-vertical"
                  placeholder="E.g., Size, color, specific model, or any other product details..."
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add Product Button - Moved to bottom center */}
        <div className="flex justify-center mt-4 sm:mt-6 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={addProduct}
            className="flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm text-sm sm:text-base"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Add Another Product
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleNext}
          className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base sm:text-lg font-medium"
        >
          Continue to Shipping
        </button>
      </div>
    </div>
  );
}
