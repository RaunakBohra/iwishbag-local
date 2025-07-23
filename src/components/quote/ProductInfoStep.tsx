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
import { useAllCountries } from '@/hooks/useAllCountries';
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
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ShippingRouteDisplay } from '@/components/shared/ShippingRouteDisplay';

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default function ProductInfoStep({
  products,
  setProducts,
  quoteType,
  setQuoteType,
  destinationCountry,
  setDestinationCountry,
  next,
}) {
  const { data: countries, isLoading, error: countryError } = usePurchaseCountries();
  const { data: allCountries, isLoading: allCountriesLoading } = useAllCountries();
  const [errors, setErrors] = useState({});
  const [countryValidationError, setCountryValidationError] = useState('');
  const [destinationCountryError, setDestinationCountryError] = useState('');
  const [uploadStates, setUploadStates] = useState({}); // Track upload states for each product

  // Smart default country selection (no external API calls to avoid CORS/rate limit issues)
  useEffect(() => {
    if (!destinationCountry && allCountries) {
      // Set a reasonable default based on your primary markets
      // India and Nepal are mentioned as primary markets in CLAUDE.md
      const defaultCountry = allCountries.find((c) => c.code === 'IN'); // India as default
      if (defaultCountry) {
        setDestinationCountry('IN');
        console.log('Set default destination country to India (IN)');
      }
    }
  }, [destinationCountry, allCountries, setDestinationCountry]);

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
      imageUrl: '', // Separate field for uploaded image URL
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
    setUploadStates(prev => {
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


  const handleFileUpload = async (index, file) => {
    if (!file) return;

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setUploadStates(prev => ({
        ...prev,
        [index]: { status: 'error', message: 'File size must be less than 10MB' }
      }));
      return;
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setUploadStates(prev => ({
        ...prev,
        [index]: { status: 'error', message: 'File type not supported. Please upload images, PDFs, or documents.' }
      }));
      return;
    }

    // Set uploading state
    setUploadStates(prev => ({
      ...prev,
      [index]: { status: 'uploading', message: 'Uploading...' }
    }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error } = await supabase.storage.from('quote-requests').upload(filePath, file);

      if (error) {
        console.error('Error uploading file:', error);
        setUploadStates(prev => ({
          ...prev,
          [index]: { status: 'error', message: 'Upload failed. Please try again.' }
        }));
        return;
      }

      const { data } = supabase.storage.from('quote-requests').getPublicUrl(filePath);

      // Track the uploaded file in database for cleanup
      try {
        const sessionId = localStorage.getItem('anonymous_session_id') || crypto.randomUUID();
        if (!localStorage.getItem('anonymous_session_id')) {
          localStorage.setItem('anonymous_session_id', sessionId);
        }

        const { error: trackError } = await supabase.rpc('track_uploaded_file', {
          p_file_path: filePath,
          p_file_name: file.name,
          p_file_size: file.size,
          p_file_type: file.type,
          p_session_id: sessionId
        });

        if (trackError) {
          console.warn('Failed to track uploaded file:', trackError);
          // Continue anyway - tracking is not critical for user experience
        }
      } catch (trackError) {
        console.warn('Error tracking uploaded file:', trackError);
        // Continue anyway - tracking is not critical for user experience
      }

      // Update product with file info
      updateProduct(index, 'file', file);
      updateProduct(index, 'imageUrl', data.publicUrl);

      // Set success state
      setUploadStates(prev => ({
        ...prev,
        [index]: { status: 'success', message: 'Upload successful' }
      }));

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStates(prev => ({
        ...prev,
        [index]: { status: 'error', message: 'Upload failed. Please try again.' }
      }));
    }
  };

  const handleDeleteFile = (index) => {
    updateProduct(index, 'file', null);
    updateProduct(index, 'imageUrl', '');
    setUploadStates(prev => {
      const newStates = { ...prev };
      delete newStates[index];
      return newStates;
    });
  };


  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file) => {
    if (!file) return File;
    
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    
    // Images
    if (type.startsWith('image/')) {
      return Image;
    }
    
    // PDFs
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      return FileText;
    }
    
    // Excel files
    if (type.includes('spreadsheet') || name.endsWith('.xlsx') || name.endsWith('.xls')) {
      return FileSpreadsheet;
    }
    
    // Word documents
    if (type.includes('document') || name.endsWith('.docx') || name.endsWith('.doc')) {
      return FileText;
    }
    
    // Default
    return File;
  };

  const isImageFile = (file) => {
    return file && file.type.startsWith('image/');
  };

  const FileChip = ({ file, onDelete, onView, index }) => {
    const FileIcon = getFileIcon(file);
    const isImage = file.type.startsWith('image/');
    
    return (
      <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 max-w-xs">
        <FileIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-green-800 truncate">
            {file.name}
          </p>
          <p className="text-xs text-green-600">
            {formatFileSize(file.size)}
          </p>
        </div>
        <div className="flex gap-1">
          {isImage && (
            <button
              onClick={onView}
              className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded transition-colors"
              title="Preview"
            >
              <Eye className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
            title="Remove"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
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
      if (!product.url && !product.file) {
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

  const quoteTypeMessage = getQuoteTypeMessage();

  return (
    <div className="space-y-6">
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
              onChange={(e) => setDestinationCountry(e.target.value)}
              className={`w-full border rounded-lg p-2 sm:p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors bg-white ${
                destinationCountryError ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            >
              <option value="">🌍 Select country</option>
              {allCountriesLoading ? (
                <option>Loading...</option>
              ) : (
                allCountries?.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))
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
            <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
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
                    className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Purchase Country *
                    {quoteType === 'combined' && index > 0 && (
                      <span className="text-teal-600 ml-2 text-xs sm:text-sm font-normal">
                        (Auto-synced)
                      </span>
                    )}
                  </label>
                  <select
                    value={product.country}
                    onChange={(e) => updateProduct(index, 'country', e.target.value)}
                    className={`w-full border rounded-lg p-2 sm:p-3 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors ${
                      quoteType === 'combined' && index > 0
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'border-gray-200 bg-white'
                    }`}
                    disabled={quoteType === 'combined' && index > 0}
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
                    <p className="text-red-500 text-xs sm:text-sm mt-1">
                      {errors[`country-${index}`]}
                    </p>
                  )}
                  {quoteType === 'combined' && index > 0 && product.country && (
                    <div className="flex items-center gap-1 mt-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-xs sm:text-sm text-green-600">
                        Synced with Product 1
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={product.name}
                    onChange={(e) => updateProduct(index, 'name', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2 sm:p-3 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                    placeholder="Product name (optional)"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Product URL or Upload File *
                </label>
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={product.url}
                    onChange={(e) => updateProduct(index, 'url', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg p-2 sm:p-3 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                    placeholder="Paste product URL (Amazon, eBay, etc.)"
                  />
                  
                  {/* Enhanced Upload Button - Show when no file uploaded */}
                  {!product.file && uploadStates[index]?.status !== 'uploading' && (
                    <label className="flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-teal-600 text-white border border-teal-600 rounded-lg cursor-pointer hover:bg-teal-700 hover:border-teal-700 transition-all duration-200 shadow-sm">
                      <Upload className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      <span className="text-xs sm:text-sm font-medium">Upload File</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                        onChange={(e) => handleFileUpload(index, e.target.files[0])}
                      />
                    </label>
                  )}

                  {/* Uploading State */}
                  {uploadStates[index]?.status === 'uploading' && (
                    <div className="flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-blue-50 border border-blue-300 rounded-lg">
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin text-blue-600" />
                      <span className="text-xs sm:text-sm font-medium text-blue-700">Uploading...</span>
                    </div>
                  )}

                  {/* File Management Buttons - Show when file uploaded */}
                  {product.file && uploadStates[index]?.status !== 'uploading' && (
                    <div className="flex gap-2">
                      <label className="flex items-center justify-center px-3 sm:px-4 py-2 sm:py-3 bg-gray-100 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors" title="Change file">
                        <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="ml-1 text-xs sm:text-sm font-medium hidden sm:inline">Change</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                          onChange={(e) => handleFileUpload(index, e.target.files[0])}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteFile(index)}
                        className="flex items-center justify-center px-3 sm:px-4 py-2 sm:py-3 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 transition-colors text-red-600"
                        title="Delete file"
                      >
                        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="ml-1 text-xs sm:text-sm font-medium hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  )}
                </div>
                
                {/* File Display - Enhanced chip when file is uploaded */}
                {product.file && (
                  <div className="mt-2">
                    <FileChip 
                      file={product.file}
                      onDelete={() => handleDeleteFile(index)}
                      onView={() => window.open(product.imageUrl, '_blank')}
                      index={index}
                    />
                  </div>
                )}
                
                {/* Upload Error State */}
                {uploadStates[index]?.status === 'error' && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      <p className="text-red-600 text-xs sm:text-sm font-medium flex-1">
                        {uploadStates[index].message}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* URL Validation Error */}
                {errors[`url-${index}`] && (
                  <p className="text-red-500 text-xs sm:text-sm mt-2">{errors[`url-${index}`]}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={product.quantity}
                    onChange={(e) =>
                      updateProduct(index, 'quantity', parseInt(e.target.value) || 1)
                    }
                    className="w-full border border-gray-200 rounded-lg p-2 sm:p-3 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                    placeholder="1"
                  />
                  {errors[`quantity-${index}`] && (
                    <p className="text-red-500 text-xs sm:text-sm mt-1">
                      {errors[`quantity-${index}`]}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={product.price}
                    onChange={(e) => updateProduct(index, 'price', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2 sm:p-3 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={product.weight}
                    onChange={(e) => updateProduct(index, 'weight', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2 sm:p-3 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Product Notes */}
              <div className="mt-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Product Notes (optional)
                </label>
                <textarea
                  value={product.notes}
                  onChange={(e) => updateProduct(index, 'notes', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 sm:p-3 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 min-h-[60px] sm:min-h-[80px] resize-vertical transition-colors"
                  placeholder="E.g., Size, color, specific model, or any other product details..."
                  rows={3}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add Product Button - Streamlined */}
        {products.length < 10 && (
          <div className="flex justify-center mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={addProduct}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50 hover:border-teal-300 transition-all duration-200 font-medium text-sm sm:text-base"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Add Another Product</span>
              <span className="sm:hidden">Add Product</span>
            </button>
          </div>
        )}
      </div>

      {/* Continue Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleNext}
          className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 text-sm sm:text-base lg:text-lg font-medium shadow-sm flex items-center justify-center gap-2"
        >
          <span className="hidden sm:inline">Continue to Contact</span>
          <span className="sm:hidden">Continue</span>
          <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>
    </div>
  );
}
