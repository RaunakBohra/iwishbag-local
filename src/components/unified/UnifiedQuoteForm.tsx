import React, { useMemo, useCallback, memo, useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  X,
  AlertTriangle,
  CheckCircle,
  Loader2,
  FileText,
  Image,
  Archive,
  Globe,
  DollarSign,
  Package,
  MapPin,
  Calendar,
  User,
  Mail,
  Phone,
  Link,
  Info,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuoteTheme, useConversionColors } from '@/contexts/QuoteThemeContext';
import { useColorVariantTesting } from '@/hooks/useColorVariantTesting';
import type { UnifiedQuote } from '@/types/unified-quote';
// import { TurnstileProtectedForm } from .* // Component removed

// Security: File upload validation
const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  archive: ['application/zip', 'application/x-rar-compressed'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_QUOTE = 5;

// Internationalization support
const SUPPORTED_LOCALES = ['en', 'hi', 'ne', 'es', 'fr'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

interface I18nStrings {
  [key: string]: {
    [K in Locale]: string;
  };
}

const i18nStrings: I18nStrings = {
  productUrl: {
    en: 'Product URL',
    hi: 'उत्पाद का लिंक',
    ne: 'उत्पादन लिङ्क',
    es: 'URL del producto',
    fr: 'URL du produit',
  },
  productName: {
    en: 'Product Name',
    hi: 'उत्पाद का नाम',
    ne: 'उत्पादनको नाम',
    es: 'Nombre del producto',
    fr: 'Nom du produit',
  },
  quantity: {
    en: 'Quantity',
    hi: 'मात्रा',
    ne: 'परिमाण',
    es: 'Cantidad',
    fr: 'Quantité',
  },
  estimatedPrice: {
    en: 'Estimated Price',
    hi: 'अनुमानित मूल्य',
    ne: 'अनुमानित मूल्य',
    es: 'Precio estimado',
    fr: 'Prix estimé',
  },
  specialInstructions: {
    en: 'Special Instructions',
    hi: 'विशेष निर्देश',
    ne: 'विशेष निर्देशहरू',
    es: 'Instrucciones especiales',
    fr: 'Instructions spéciales',
  },
  submitQuote: {
    en: 'Submit Quote Request',
    hi: 'कोटेशन भेजें',
    ne: 'कोटेसन पठाउनुहोस्',
    es: 'Enviar solicitud de cotización',
    fr: 'Soumettre la demande de devis',
  },
  updateQuote: {
    en: 'Update Quote',
    hi: 'कोटेशन अपडेट करें',
    ne: 'कोटेसन अपडेट गर्नुहोस्',
    es: 'Actualizar cotización',
    fr: 'Mettre à jour le devis',
  },
  uploadFiles: {
    en: 'Upload Files (Optional)',
    hi: 'फाइलें अपलोड करें (वैकल्पिक)',
    ne: 'फाइलहरू अपलोड गर्नुहोस् (वैकल्पिक)',
    es: 'Subir archivos (Opcional)',
    fr: 'Télécharger des fichiers (Optionnel)',
  },
};

// Form validation schema with i18n error messages
const createValidationSchema = (locale: Locale, isEditMode: boolean) => {
  const messages = {
    required: {
      en: 'This field is required',
      hi: 'यह फील्ड आवश्यक है',
      ne: 'यो फिल्ड आवश्यक छ',
      es: 'Este campo es obligatorio',
      fr: 'Ce champ est obligatoire',
    }[locale],
    invalidUrl: {
      en: 'Please enter a valid URL',
      hi: 'कृपया एक वैध URL दर्ज करें',
      ne: 'कृपया मान्य URL प्रविष्ट गर्नुहोस्',
      es: 'Por favor ingrese una URL válida',
      fr: 'Veuillez saisir une URL valide',
    }[locale],
    invalidEmail: {
      en: 'Please enter a valid email',
      hi: 'कृपया एक वैध ईमेल दर्ज करें',
      ne: 'कृपया मान्य इमेल प्रविष्ट गर्नुहोस्',
      es: 'Por favor ingrese un email válido',
      fr: 'Veuillez saisir un email valide',
    }[locale],
    minQuantity: {
      en: 'Quantity must be at least 1',
      hi: 'मात्रा कम से कम 1 होनी चाहिए',
      ne: 'परिमाण कम से कम १ हुनुपर्छ',
      es: 'La cantidad debe ser al menos 1',
      fr: 'La quantité doit être au moins 1',
    }[locale],
    maxPrice: {
      en: 'Price cannot exceed $100,000',
      hi: 'मूल्य $100,000 से अधिक नहीं हो सकता',
      ne: 'मूल्य $१००,००० भन्दा बढी हुन सक्दैन',
      es: 'El precio no puede exceder $100,000',
      fr: 'Le prix ne peut pas dépasser 100 000 $',
    }[locale],
  };

  return z.object({
    // Product information
    productUrl: z.string().url(messages.invalidUrl).min(1, messages.required),

    productName: z.string().min(1, messages.required).max(200, 'Product name too long'),

    quantity: z.number().min(1, messages.minQuantity).max(1000, 'Maximum 1000 items allowed'),

    estimatedPrice: z
      .number()
      .min(0, 'Price cannot be negative')
      .max(100000, messages.maxPrice)
      .optional(),

    // Customer information (for guest users)
    customerName: z.string().min(1, messages.required).max(100, 'Name too long').optional(),

    customerEmail: z.string().email(messages.invalidEmail).optional(),

    customerPhone: z
      .string()
      .min(10, 'Phone number too short')
      .max(20, 'Phone number too long')
      .optional(),

    // Shipping information
    destinationCountry: z.string().min(2, 'Please select a country').max(3, 'Invalid country code'),

    shippingAddress: z
      .string()
      .min(10, 'Please provide complete address')
      .max(500, 'Address too long')
      .optional(),

    // Additional details
    specialInstructions: z.string().max(1000, 'Instructions too long').optional(),

    // Files (handled separately)
    attachments: z.array(z.any()).optional(),

    // Admin fields (when editing)
    adminNotes: isEditMode ? z.string().max(1000).optional() : z.never().optional(),
    priority: isEditMode
      ? z.enum(['low', 'medium', 'high', 'urgent']).optional()
      : z.never().optional(),
  });
};

type FormData = z.infer<ReturnType<typeof createValidationSchema>>;

// File upload security validation
const validateFileUpload = (file: File): { valid: boolean; error?: string } => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }

  // Check file type
  const isValidType = Object.values(ALLOWED_FILE_TYPES).flat().includes(file.type);
  if (!isValidType) {
    return { valid: false, error: 'File type not allowed' };
  }

  // Check file name for security (no executable extensions)
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
  const fileName = file.name.toLowerCase();
  const hasDangerousExtension = dangerousExtensions.some((ext) => fileName.endsWith(ext));

  if (hasDangerousExtension) {
    return { valid: false, error: 'File type not allowed for security reasons' };
  }

  return { valid: true };
};

// Performance monitoring
interface FormPerformanceMetrics {
  renderTime: number;
  validationTime: number;
  submitTime: number;
  fileUploadTime: number;
  formComplexity: 'simple' | 'standard' | 'complex';
  userType: 'admin' | 'customer' | 'guest';
  locale: string;
}

const logFormPerformance = (metrics: FormPerformanceMetrics) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('📝 UnifiedQuoteForm Performance:', metrics);
  }

  // Send to analytics service in production
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'form_performance', {
      component: 'UnifiedQuoteForm',
      render_time: metrics.renderTime,
      validation_time: metrics.validationTime,
      submit_time: metrics.submitTime,
      file_upload_time: metrics.fileUploadTime,
      form_complexity: metrics.formComplexity,
      user_type: metrics.userType,
      locale: metrics.locale,
    });
  }
};

interface UnifiedQuoteFormProps {
  // Form mode
  mode: 'create' | 'edit' | 'duplicate';
  existingQuote?: UnifiedQuote;

  // User context
  viewMode: 'admin' | 'customer' | 'guest';
  locale?: Locale;

  // Form behavior
  enableFileUpload?: boolean;
  enableAdvancedFields?: boolean;
  enableRealTimeValidation?: boolean;

  // Event handlers
  onSubmit?: (data: FormData, files?: File[]) => Promise<any>;
  onCancel?: () => void;
  onFieldChange?: (field: string, value: any) => void;

  // Server validation
  serverValidation?: {
    validateUrl?: (
      url: string,
    ) => Promise<{ valid: boolean; productName?: string; price?: number; error?: string }>;
    checkDuplicate?: (url: string) => Promise<{ isDuplicate: boolean; existingQuoteId?: string }>;
  };

  // Performance & Security
  performanceMode?: 'fast' | 'detailed';
  securityLevel?: 'public' | 'private' | 'admin';

  // Styling
  className?: string;
  compact?: boolean;

  // Cultural theming
  culturalTheme?: 'india' | 'nepal' | 'international';
}

/**
 * UnifiedQuoteForm - Comprehensive quote creation/editing form
 * Context-aware with server validation, file upload security, and i18n support
 */
export const UnifiedQuoteForm = memo<UnifiedQuoteFormProps>(
  ({
    mode = 'create',
    existingQuote,
    viewMode,
    locale = 'en',
    enableFileUpload = true,
    enableAdvancedFields = true,
    enableRealTimeValidation = true,
    onSubmit,
    onCancel,
    onFieldChange,
    serverValidation,
    performanceMode = 'detailed',
    securityLevel = 'private',
    className,
    compact = false,
    culturalTheme = 'international',
  }) => {
    const startTime = performance.now();

    // Theme and color context
    const { colors, userType } = useQuoteTheme();
    const conversionColors = useConversionColors();
    const { variant, trackConversion } = useColorVariantTesting();

    // Form state
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
    const [showAdvanced, setShowAdvanced] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Validation schema
    const validationSchema = useMemo(() => {
      return createValidationSchema(locale, mode === 'edit');
    }, [locale, mode]);

    // Form setup
    const form = useForm<FormData>({
      resolver: zodResolver(validationSchema),
      defaultValues: {
        productUrl: existingQuote?.items?.[0]?.product_url || '',
        productName: existingQuote?.items?.[0]?.name || '',
        quantity: existingQuote?.items?.[0]?.quantity || 1,
        estimatedPrice: existingQuote?.items?.[0]?.price || undefined,
        customerName: existingQuote?.customer_data?.info?.name || '',
        customerEmail: existingQuote?.customer_data?.info?.email || '',
        customerPhone: existingQuote?.customer_data?.info?.phone || '',
        destinationCountry: existingQuote?.destination_country || '',
        shippingAddress: existingQuote?.shipping_address?.formatted || '',
        specialInstructions: existingQuote?.notes || '',
        adminNotes: mode === 'edit' ? existingQuote?.admin_notes || '' : undefined,
        priority: mode === 'edit' ? (existingQuote?.priority as any) || 'medium' : undefined,
      },
      mode: enableRealTimeValidation ? 'onChange' : 'onSubmit',
    });

    // Get translation helper
    const t = useCallback(
      (key: string): string => {
        return i18nStrings[key]?.[locale] || i18nStrings[key]?.['en'] || key;
      },
      [locale],
    );

    // File upload handler
    const handleFileUpload = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        const validFiles: File[] = [];
        const errors: string[] = [];

        // Check total file count
        if (uploadedFiles.length + files.length > MAX_FILES_PER_QUOTE) {
          errors.push(`Maximum ${MAX_FILES_PER_QUOTE} files allowed`);
          return;
        }

        // Validate each file
        files.forEach((file) => {
          const validation = validateFileUpload(file);
          if (validation.valid) {
            validFiles.push(file);
          } else {
            errors.push(`${file.name}: ${validation.error}`);
          }
        });

        if (errors.length > 0) {
          setServerErrors((prev) => ({ ...prev, files: errors.join(', ') }));
        } else {
          setServerErrors((prev) => ({ ...prev, files: '' }));
          setUploadedFiles((prev) => [...prev, ...validFiles]);
        }

        // Clear input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
      [uploadedFiles.length],
    );

    // Remove file handler
    const handleRemoveFile = useCallback((index: number) => {
      setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    }, []);

    // Server validation handlers
    const handleUrlValidation = useCallback(
      async (url: string) => {
        if (!serverValidation?.validateUrl || !url) return;

        try {
          const result = await serverValidation.validateUrl(url);

          if (result.valid) {
            if (result.productName) {
              form.setValue('productName', result.productName);
            }
            if (result.price) {
              form.setValue('estimatedPrice', result.price);
            }
            setServerErrors((prev) => ({ ...prev, productUrl: '' }));
          } else {
            setServerErrors((prev) => ({ ...prev, productUrl: result.error || 'Invalid URL' }));
          }
        } catch (error) {
          console.error('URL validation error:', error);
          setServerErrors((prev) => ({ ...prev, productUrl: 'Validation failed' }));
        }
      },
      [serverValidation, form],
    );

    // Form submission handler
    const handleSubmit = useCallback(
      async (data: FormData, turnstileToken?: string) => {
        const submitStartTime = performance.now();
        setIsSubmitting(true);
        setServerErrors({});

        try {
          // Track form submission
          trackConversion('quote_form_submitted', 1);

          // Call submit handler with turnstile token
          const result = await onSubmit?.({ ...data, turnstileToken }, uploadedFiles);

          // Log performance
          if (performanceMode === 'detailed') {
            const formComplexity =
              uploadedFiles.length > 0 ? 'complex' : enableAdvancedFields ? 'standard' : 'simple';

            logFormPerformance({
              renderTime: performance.now() - startTime,
              validationTime: 0, // Could be tracked separately
              submitTime: performance.now() - submitStartTime,
              fileUploadTime: uploadedFiles.length > 0 ? 100 : 0, // Estimate
              formComplexity,
              userType,
              locale,
            });
          }

          // Track successful submission
          trackConversion('quote_form_success', 1);
        } catch (error) {
          console.error('Form submission error:', error);

          // Handle server validation errors
          if (error && typeof error === 'object' && 'fieldErrors' in error) {
            setServerErrors(error.fieldErrors as Record<string, string>);
          } else {
            setServerErrors({ general: 'Submission failed. Please try again.' });
          }

          trackConversion('quote_form_error', 1);
        } finally {
          setIsSubmitting(false);
        }
      },
      [
        onSubmit,
        uploadedFiles,
        performanceMode,
        startTime,
        userType,
        locale,
        trackConversion,
        enableAdvancedFields,
      ],
    );

    // Field change handler
    const handleFieldChange = useCallback(
      (field: string, value: any) => {
        onFieldChange?.(field, value);

        // Clear server errors for this field
        if (serverErrors[field]) {
          setServerErrors((prev) => ({ ...prev, [field]: '' }));
        }

        // Server validation for specific fields
        if (field === 'productUrl' && value) {
          const debounced = setTimeout(() => handleUrlValidation(value), 1000);
          return () => clearTimeout(debounced);
        }
      },
      [onFieldChange, serverErrors, handleUrlValidation],
    );

    // Get file type icon
    const getFileIcon = (file: File) => {
      if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />;
      if (file.type === 'application/pdf') return <FileText className="h-4 w-4" />;
      if (file.type.includes('zip') || file.type.includes('rar'))
        return <Archive className="h-4 w-4" />;
      return <FileText className="h-4 w-4" />;
    };

    // Render form section
    const renderFormSection = (
      title: string,
      children: React.ReactNode,
      icon?: React.ReactNode,
    ) => (
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
          {icon}
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        {children}
      </div>
    );

    return (
      <Card
        className={cn(
          'quote-form transition-all duration-200',
          `quote-form--${viewMode}`,
          `quote-form--${mode}`,
          `color-variant-${variant}`,
          compact && 'quote-form--compact',
          className,
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {mode === 'create' ? t('submitQuote') : t('updateQuote')}
            <Badge variant="outline" className="ml-auto">
              {locale.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form 
            onSubmit={form.handleSubmit((data) => handleSubmit(data, undefined))}
            className="space-y-8"
            id="unified-quote-form"
          >
            {/* General error message */}
            {serverErrors.general && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700">{serverErrors.general}</span>
              </div>
            )}

            {/* Product Information */}
            {renderFormSection(
              'Product Information',
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="productUrl" className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    {t('productUrl')} *
                  </Label>
                  <Controller
                    name="productUrl"
                    control={form.control}
                    render={({ field }) => (
                      <div className="space-y-1">
                        <Input
                          {...field}
                          id="productUrl"
                          placeholder="https://example.com/product"
                          onChange={(e) => {
                            field.onChange(e);
                            handleFieldChange('productUrl', e.target.value);
                          }}
                          className={cn(
                            serverErrors.productUrl && 'border-red-300 focus:border-red-500',
                          )}
                        />
                        {serverErrors.productUrl && (
                          <p className="text-sm text-red-600">{serverErrors.productUrl}</p>
                        )}
                        {form.formState.errors.productUrl && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.productUrl.message}
                          </p>
                        )}
                      </div>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="productName">{t('productName')} *</Label>
                  <Controller
                    name="productName"
                    control={form.control}
                    render={({ field }) => (
                      <div className="space-y-1">
                        <Input
                          {...field}
                          id="productName"
                          onChange={(e) => {
                            field.onChange(e);
                            handleFieldChange('productName', e.target.value);
                          }}
                        />
                        {form.formState.errors.productName && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.productName.message}
                          </p>
                        )}
                      </div>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="quantity">{t('quantity')} *</Label>
                  <Controller
                    name="quantity"
                    control={form.control}
                    render={({ field: { onChange, ...field } }) => (
                      <div className="space-y-1">
                        <Input
                          {...field}
                          id="quantity"
                          type="number"
                          min="1"
                          max="1000"
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 1;
                            onChange(value);
                            handleFieldChange('quantity', value);
                          }}
                        />
                        {form.formState.errors.quantity && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.quantity.message}
                          </p>
                        )}
                      </div>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="estimatedPrice" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {t('estimatedPrice')}
                  </Label>
                  <Controller
                    name="estimatedPrice"
                    control={form.control}
                    render={({ field: { onChange, ...field } }) => (
                      <div className="space-y-1">
                        <Input
                          {...field}
                          id="estimatedPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100000"
                          placeholder="0.00"
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || undefined;
                            onChange(value);
                            handleFieldChange('estimatedPrice', value);
                          }}
                        />
                        {form.formState.errors.estimatedPrice && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.estimatedPrice.message}
                          </p>
                        )}
                      </div>
                    )}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="destinationCountry" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Destination Country *
                  </Label>
                  <Controller
                    name="destinationCountry"
                    control={form.control}
                    render={({ field }) => (
                      <div className="space-y-1">
                        <select
                          {...field}
                          id="destinationCountry"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onChange={(e) => {
                            field.onChange(e);
                            handleFieldChange('destinationCountry', e.target.value);
                          }}
                        >
                          <option value="">Select country...</option>
                          <option value="IN">India</option>
                          <option value="NP">Nepal</option>
                          <option value="US">United States</option>
                          <option value="UK">United Kingdom</option>
                          <option value="CA">Canada</option>
                          <option value="AU">Australia</option>
                          <option value="DE">Germany</option>
                          <option value="FR">France</option>
                          <option value="JP">Japan</option>
                          <option value="SG">Singapore</option>
                        </select>
                        {form.formState.errors.destinationCountry && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.destinationCountry.message}
                          </p>
                        )}
                      </div>
                    )}
                  />
                </div>
              </div>,
              <Package className="h-4 w-4" />,
            )}

            {/* Customer Information (for guest users) */}
            {viewMode === 'guest' &&
              renderFormSection(
                'Customer Information',
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Your Name *
                    </Label>
                    <Controller
                      name="customerName"
                      control={form.control}
                      render={({ field }) => (
                        <div className="space-y-1">
                          <Input
                            {...field}
                            id="customerName"
                            onChange={(e) => {
                              field.onChange(e);
                              handleFieldChange('customerName', e.target.value);
                            }}
                          />
                          {form.formState.errors.customerName && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.customerName.message}
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor="customerEmail" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address *
                    </Label>
                    <Controller
                      name="customerEmail"
                      control={form.control}
                      render={({ field }) => (
                        <div className="space-y-1">
                          <Input
                            {...field}
                            id="customerEmail"
                            type="email"
                            onChange={(e) => {
                              field.onChange(e);
                              handleFieldChange('customerEmail', e.target.value);
                            }}
                          />
                          {form.formState.errors.customerEmail && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.customerEmail.message}
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor="customerPhone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </Label>
                    <Controller
                      name="customerPhone"
                      control={form.control}
                      render={({ field }) => (
                        <div className="space-y-1">
                          <Input
                            {...field}
                            id="customerPhone"
                            type="tel"
                            onChange={(e) => {
                              field.onChange(e);
                              handleFieldChange('customerPhone', e.target.value);
                            }}
                          />
                          {form.formState.errors.customerPhone && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.customerPhone.message}
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </div>
                </div>,
                <User className="h-4 w-4" />,
              )}

            {/* File Upload */}
            {enableFileUpload &&
              renderFormSection(
                t('uploadFiles'),
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      Click to upload files or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      Images, PDFs, Documents (Max {MAX_FILE_SIZE / 1024 / 1024}MB each)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={Object.values(ALLOWED_FILE_TYPES).flat().join(',')}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Select Files
                    </Button>
                  </div>

                  {/* Uploaded files list */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                        >
                          {getFileIcon(file)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile(index)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {serverErrors.files && (
                    <p className="text-sm text-red-600">{serverErrors.files}</p>
                  )}
                </div>,
                <Upload className="h-4 w-4" />,
              )}

            {/* Additional Details */}
            {renderFormSection(
              'Additional Details',
              <div className="space-y-4">
                <div>
                  <Label htmlFor="specialInstructions">{t('specialInstructions')}</Label>
                  <Controller
                    name="specialInstructions"
                    control={form.control}
                    render={({ field }) => (
                      <div className="space-y-1">
                        <Textarea
                          {...field}
                          id="specialInstructions"
                          rows={4}
                          placeholder="Any special requirements, color preferences, size variations, etc."
                          onChange={(e) => {
                            field.onChange(e);
                            handleFieldChange('specialInstructions', e.target.value);
                          }}
                        />
                        {form.formState.errors.specialInstructions && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.specialInstructions.message}
                          </p>
                        )}
                      </div>
                    )}
                  />
                </div>

                {/* Admin fields */}
                {mode === 'edit' && viewMode === 'admin' && enableAdvancedFields && (
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center gap-2"
                    >
                      {showAdvanced ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showAdvanced ? 'Hide' : 'Show'} Admin Fields
                    </Button>

                    {showAdvanced && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="priority">Priority</Label>
                          <Controller
                            name="priority"
                            control={form.control}
                            render={({ field }) => (
                              <select
                                {...field}
                                id="priority"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                              </select>
                            )}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Label htmlFor="adminNotes">Admin Notes</Label>
                          <Controller
                            name="adminNotes"
                            control={form.control}
                            render={({ field }) => (
                              <Textarea
                                {...field}
                                id="adminNotes"
                                rows={3}
                                placeholder="Internal notes for admin team..."
                              />
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>,
              <Info className="h-4 w-4" />,
            )}

            {/* Form Actions */}
            <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 text-base"
              >
{isSubmitting ? "Submitting Quote..." : mode === 'edit' ? "Update Quote" : "Submit Quote Request"}
              </Button>

              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
              )}

              <div className="flex items-center gap-2 ml-auto text-sm text-gray-500">
                <Shield className="h-4 w-4" />
                <span>Secure & Encrypted</span>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  },
);

UnifiedQuoteForm.displayName = 'UnifiedQuoteForm';

export default UnifiedQuoteForm;
