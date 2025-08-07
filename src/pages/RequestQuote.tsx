import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  ShoppingBag,
  User,
  MapPin,
  CheckCircle,
  Clock,
  Shield,
  Mail,
  Phone,
  Globe,
  Package,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import { ContactInformationSection } from '@/components/request-quote/ContactInformationSection';
import { MultipleProductsSection } from '@/components/request-quote/MultipleProductsSection';
import { DeliveryAddressSection } from '@/components/request-quote/DeliveryAddressSection';
import { QuoteSuccessPage } from '@/components/request-quote/QuoteSuccessPage';

// Form validation schema
const requestQuoteSchema = z.object({
  // Contact Information
  customer_name: z.string().min(2, 'Name must be at least 2 characters'),
  customer_email: z.string().email('Please enter a valid email address'),
  customer_phone: z.string().optional(),
  
  // Product Information (Critical Fields) - Now supports multiple products
  products: z.array(z.object({
    product_url: z.string().url('Please enter a valid product URL'),
    product_name: z.string().min(1, 'Product name is required'),
    origin_country: z.string().min(1, 'Please select the origin country'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    estimated_price: z.number().min(0, 'Price must be positive').optional(),
    product_notes: z.string().optional(),
  })).min(1, 'At least one product is required'),
  
  // Delivery Address (Critical Field)
  delivery_address: z.object({
    full_name: z.string().min(2, 'Full name is required'),
    address_line_1: z.string().min(5, 'Address is required'),
    address_line_2: z.string().optional(),
    city: z.string().min(2, 'City is required'),
    state_province: z.string().min(2, 'State/Province is required'),
    postal_code: z.string().min(3, 'Postal code is required'),
    country: z.string().min(2, 'Country is required'),
    phone: z.string().optional(),
  }),
  
});

type RequestQuoteFormData = z.infer<typeof requestQuoteSchema>;

export default function RequestQuote() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);
  const [submittedQuoteData, setSubmittedQuoteData] = useState<any>(null);
  const [currentSection, setCurrentSection] = useState(1);
  const [userProfile, setUserProfile] = useState<any>(null);

  const form = useForm<RequestQuoteFormData>({
    resolver: zodResolver(requestQuoteSchema),
    defaultValues: {
      customer_name: user?.user_metadata?.name || user?.user_metadata?.full_name || '',
      customer_email: user?.email || '',
      customer_phone: user?.user_metadata?.phone || user?.phone || user?.user_metadata?.phone_number || '',
      products: [{
        product_url: '',
        product_name: '',
        origin_country: 'US', // Default to US
        quantity: 1,
        estimated_price: undefined,
        product_notes: '',
      }],
      delivery_address: {
        country: 'IN', // Default to India
      },
    },
  });

  const watchedValues = form.watch();

  // Set user profile data for logged-in users from auth metadata
  useEffect(() => {
    if (user) {
      console.log('Full user object:', user);
      console.log('User metadata:', user.user_metadata);
      console.log('User phone directly:', user.phone);
      
      // Create profile object from user auth data - try multiple locations for phone
      const phoneFromAuth = user.user_metadata?.phone || 
                          user.phone || 
                          user.user_metadata?.phone_number ||
                          user.app_metadata?.phone ||
                          '';
                          
      const profile = {
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        email: user.email || '',
        phone: phoneFromAuth
      };
      
      setUserProfile(profile);
      console.log('User profile from auth:', profile);
      
      // Pre-fill form fields from auth metadata
      if (profile.phone) {
        console.log('Setting phone number in form from auth:', profile.phone);
        form.setValue('customer_phone', profile.phone);
      }
    }
  }, [user, form]);

  // Calculate form completion progress
  const calculateProgress = () => {
    let requiredFields;
    let completed = 0;
    
    if (user) {
      // For logged-in users, exclude contact information fields
      requiredFields = [
        'delivery_address.full_name', 'delivery_address.address_line_1',
        'delivery_address.city', 'delivery_address.state_province', 'delivery_address.postal_code'
      ];
    } else {
      // For guest users, include all required fields
      requiredFields = [
        'customer_name', 'customer_email', 
        'delivery_address.full_name', 'delivery_address.address_line_1',
        'delivery_address.city', 'delivery_address.state_province', 'delivery_address.postal_code'
      ];
    }
    
    // Check regular fields
    requiredFields.forEach(field => {
      const value = field.includes('.') 
        ? field.split('.').reduce((obj, key) => obj?.[key], watchedValues)
        : watchedValues[field as keyof RequestQuoteFormData];
      
      if (value && value.toString().trim() !== '') {
        completed++;
      }
    });
    
    // Check products array - each product needs URL, name, and origin_country
    const products = watchedValues.products || [];
    let productFieldsCompleted = 0;
    let totalProductFields = 0;
    
    products.forEach((product: any) => {
      totalProductFields += 3; // url, name, origin_country
      if (product.product_url && product.product_url.trim()) productFieldsCompleted++;
      if (product.product_name && product.product_name.trim()) productFieldsCompleted++;
      if (product.origin_country && product.origin_country.trim()) productFieldsCompleted++;
    });
    
    const totalFields = requiredFields.length + totalProductFields;
    const totalCompleted = completed + productFieldsCompleted;
    
    return totalFields > 0 ? Math.round((totalCompleted / totalFields) * 100) : 0;
  };

  const onSubmit = async (data: RequestQuoteFormData) => {
    setIsSubmitting(true);

    try {
      // Generate unique share token
      const shareToken = crypto.randomUUID();
      
      // Calculate expires_at (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Prepare quote data for quotes_v2 table
      const quoteData = {
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone || null,
        origin_country: data.origin_country,
        destination_country: data.delivery_address.country,
        status: 'pending',
        source: 'customer_request_quote',
        customer_id: user?.id || null,
        share_token: shareToken,
        validity_days: 7,
        expires_at: expiresAt.toISOString(),
        email_sent: false,
        version: 1,
        is_latest_version: true,
        customer_notes: null,
        customer_message: 'Quote request submitted via customer form',
        
        // Store product and address data in items array
        items: data.products.map(product => ({
          name: product.product_name,
          url: product.product_url,
          quantity: product.quantity,
          unit_price_origin: product.estimated_price || 0,
          notes: product.product_notes || null,
          category: null, // We'll determine this later
        })),
        
        // Store delivery address in calculation_data for now
        calculation_data: {
          delivery_address: data.delivery_address,
        },
      };

      console.log('Submitting quote data:', quoteData);
      console.log('Customer phone from form:', data.customer_phone);
      console.log('User profile phone:', userProfile?.phone);

      // Insert into quotes_v2 table
      const { data: createdQuote, error: quoteError } = await supabase
        .from('quotes_v2')
        .insert([quoteData])
        .select('id, quote_number, share_token, expires_at')
        .single();

      if (quoteError) {
        console.error('Quote creation error:', quoteError);
        throw new Error(`Failed to create quote: ${quoteError.message}`);
      }

      console.log('Quote created successfully:', createdQuote);

      // Insert into quote_items_v2 table
      const itemsToInsert = data.products.map(product => ({
        quote_id: createdQuote.id,
        name: product.product_name,
        url: product.product_url,
        quantity: product.quantity,
        unit_price_origin: product.estimated_price || 0,
        notes: product.product_notes || null,
      }));
      
      const { error: itemError } = await supabase
        .from('quote_items_v2')
        .insert(itemsToInsert);

      if (itemError) {
        console.error('Quote item creation error:', itemError);
        // Don't fail the whole process for item error
      }

      // Generate email templates
      const generateCustomerEmailTemplate = () => {
        const trackingUrl = `${window.location.origin}/quote/view/${createdQuote.share_token}`;
        const expiresAt = new Date(createdQuote.expires_at).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quote Request Received - iwishBag</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background-color: #ffffff;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            background: linear-gradient(135deg, #0d9488, #06b6d4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        .success-badge {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            display: inline-block;
            margin-bottom: 20px;
        }
        .quote-details {
            background: linear-gradient(135deg, #f0fdfa, #f0f9ff);
            border: 1px solid #99f6e4;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding: 8px 0;
            border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: 600;
            color: #374151;
        }
        .detail-value {
            font-weight: 600;
            color: #0d9488;
        }
        .cta-button {
            display: block;
            width: 100%;
            background: linear-gradient(135deg, #0d9488, #06b6d4);
            color: white;
            text-decoration: none;
            padding: 16px 30px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            margin: 30px 0;
            transition: all 0.3s ease;
        }
        .timeline-info {
            background: #fef3c7;
            border: 1px solid #fbbf24;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
        @media only screen and (max-width: 600px) {
            body { padding: 10px; }
            .container { padding: 20px; }
            .detail-row { flex-direction: column; }
            .detail-value { margin-top: 5px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">iwishBag</div>
            <div class="success-badge">✅ Quote Request Received</div>
            <p style="margin: 0; color: #6b7280;">International Shopping Made Easy</p>
        </div>

        <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${data.customer_name}!</h2>
        
        <p>Great news! We've received your quote request and our team is already reviewing it. We'll prepare a detailed cost breakdown for your international purchase.</p>

        <div class="quote-details">
            <h3 style="margin-top: 0; color: #0d9488; display: flex; align-items: center;">
                📋 Quote Details
            </h3>
            <div class="detail-row">
                <span class="detail-label">Quote Number:</span>
                <span class="detail-value">#${createdQuote.quote_number}</span>
            </div>
${data.products.map((product, index) => `
            <div class="detail-row">
                <span class="detail-label">Product ${index + 1}:</span>
                <span class="detail-value">${product.product_name}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">URL:</span>
                <span class="detail-value"><a href="${product.product_url}" style="color: #0d9488; text-decoration: none;">View Product</a></span>
            </div>
            <div class="detail-row">
                <span class="detail-label">From:</span>
                <span class="detail-value">${product.origin_country} (Qty: ${product.quantity})</span>
            </div>
            ${index < data.products.length - 1 ? '<div style="border-top: 1px solid #e5e7eb; margin: 8px 0;"></div>' : ''}
            `).join('')}
            <div class="detail-row">
                <span class="detail-label">Deliver To:</span>
                <span class="detail-value">${data.delivery_address.country}</span>
            </div>
        </div>

        <a href="${trackingUrl}" class="cta-button">
            🔍 Track Your Quote Status
        </a>

        <div class="timeline-info">
            <strong>⏰ What's Next?</strong><br>
            Our team will respond with a detailed quote within <strong>24 hours</strong>.<br>
            Your quote expires on <strong>${expiresAt}</strong>
        </div>

        <div style="background: #f0fdfa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #0d9488;">💡 What We're Preparing For You:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #374151;">
                <li>Complete cost breakdown (product + shipping + customs)</li>
                <li>Multiple shipping options with delivery timelines</li>
                <li>Payment methods and secure checkout process</li>
                <li>Package insurance and tracking information</li>
            </ul>
        </div>

        <p style="margin-top: 30px;">
            <strong>Questions?</strong> Simply reply to this email or contact our support team. We're here to make your international shopping experience smooth and transparent.
        </p>

        <div class="footer">
            <p><strong>iwishBag Team</strong></p>
            <p>🌍 Shop Globally • 📦 Deliver Locally • 💬 Support 24/7</p>
            <p style="font-size: 12px; margin-top: 20px;">
                You're receiving this email because you requested a quote from iwishBag.<br>
                Need help? Contact us at support@iwishbag.com
            </p>
        </div>
    </div>
</body>
</html>
        `;
      };

      const generateAdminEmailTemplate = () => {
        const adminUrl = `${window.location.origin}/admin/quote-calculator-v2/${createdQuote.id}`;
        const deliveryAddress = `${data.delivery_address.address_line_1}, ${data.delivery_address.city}, ${data.delivery_address.state_province} ${data.delivery_address.postal_code}`;

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Quote Request - iwishBag Admin</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 700px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background-color: #ffffff;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #dc2626;
            margin-bottom: 10px;
        }
        .priority-badge {
            background: #dc2626;
            color: white;
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
            margin-bottom: 15px;
        }
        .admin-panel {
            background: linear-gradient(135deg, #fef2f2, #fee2e2);
            border: 1px solid #fca5a5;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        .info-section {
            background: #f9fafb;
            border-radius: 8px;
            padding: 15px;
        }
        .info-section h4 {
            margin: 0 0 10px 0;
            color: #374151;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .info-value {
            color: #1f2937;
            font-weight: 500;
        }
        .product-url {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            padding: 10px;
            word-break: break-all;
            font-size: 14px;
        }
        .cta-button {
            display: block;
            width: 100%;
            background: #dc2626;
            color: white;
            text-decoration: none;
            padding: 16px 30px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            margin: 25px 0;
        }
        .urgency-note {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        @media only screen and (max-width: 600px) {
            .info-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🚨 iwishBag Admin</div>
            <div class="priority-badge">NEW QUOTE REQUEST</div>
            <p style="margin: 0; color: #6b7280;">Customer Quote Management</p>
        </div>

        <div class="admin-panel">
            <h3 style="margin-top: 0; color: #dc2626;">📨 New Customer Quote Request</h3>
            <p style="margin: 0;">
                <strong>Quote #${createdQuote.quote_number}</strong> has been submitted and requires admin review.
            </p>
        </div>

        <div class="info-grid">
            <div class="info-section">
                <h4>👤 Customer Information</h4>
                <div class="info-value">
                    <strong>Name:</strong> ${data.customer_name}<br>
                    <strong>Email:</strong> ${data.customer_email}<br>
                    <strong>Phone:</strong> ${data.customer_phone || 'Not provided'}
                </div>
            </div>
            
            <div class="info-section">
                <h4>📦 Product Details (${data.products.length} ${data.products.length === 1 ? 'Item' : 'Items'})</h4>
                <div class="info-value">
                    ${data.products.map((product, index) => `
                    <strong>Product ${index + 1}:</strong> ${product.product_name}<br>
                    <strong>Origin:</strong> ${product.origin_country} | <strong>Qty:</strong> ${product.quantity}<br>
                    ${index < data.products.length - 1 ? '<hr style="margin: 8px 0; border: none; border-top: 1px solid #e5e7eb;">' : ''}
                    `).join('')}
                    <strong>Destination:</strong> ${data.delivery_address.country}
                </div>
            </div>
        </div>

        <div class="info-section" style="margin: 20px 0;">
            <h4>🔗 Product URLs</h4>
            ${data.products.map((product, index) => `
            <div class="product-url" style="margin-bottom: 10px;">
                <strong>Product ${index + 1}:</strong><br>
                <a href="${product.product_url}" style="color: #2563eb; text-decoration: none;">${product.product_url}</a>
            </div>
            `).join('')}
        </div>

        <div class="info-section">
            <h4>📍 Delivery Address</h4>
            <div class="info-value">
                ${deliveryAddress}<br>
                <strong>Country:</strong> ${data.delivery_address.country}
            </div>
        </div>


        <a href="${adminUrl}" class="cta-button">
            🎯 Process Quote in Admin Panel
        </a>

        <div class="urgency-note">
            <strong>⚡ Action Required:</strong><br>
            Customer expects response within 24 hours. Please review and provide quote ASAP.
        </div>

        <div style="background: #f0f9ff; border-radius: 8px; padding: 15px; margin: 20px 0; font-size: 14px;">
            <strong>📋 Next Steps:</strong>
            <ol style="margin: 10px 0 0 20px; padding: 0;">
                <li>Review product details and shipping requirements</li>
                <li>Calculate accurate pricing including all fees</li>
                <li>Prepare detailed quote with multiple shipping options</li>
                <li>Send quote to customer via admin panel</li>
            </ol>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
            <p><strong>iwishBag Admin System</strong></p>
            <p>Quote ID: ${createdQuote.id} | Generated: ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
        `;
      };

      // Send email notifications
      try {
        // Customer notification email
        const customerEmailHtml = generateCustomerEmailTemplate();
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: data.customer_email,
            subject: `Quote Request Received - #${createdQuote.quote_number}`,
            html: customerEmailHtml,
            from: 'quotes@iwishbag.com',
          },
        });

        if (emailError) {
          console.error('Customer email error:', emailError);
        }

        // Admin notification email
        const adminEmailHtml = generateAdminEmailTemplate();
        const { error: adminEmailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: 'admin@iwishbag.com', // Configure this in production
            subject: `🚨 New Customer Quote Request - #${createdQuote.quote_number}`,
            html: adminEmailHtml,
            from: 'system@iwishbag.com',
          },
        });

        if (adminEmailError) {
          console.error('Admin email error:', adminEmailError);
        }
      } catch (notificationError) {
        console.error('Notification error:', notificationError);
        // Don't fail the quote creation for notification errors
      }

      // Store submission data for success page
      setSubmittedQuoteData({
        quote_number: createdQuote.quote_number,
        quote_id: createdQuote.id,
        share_token: createdQuote.share_token,
        expires_at: createdQuote.expires_at,
        customer_email: data.customer_email,
        products: data.products,
        total_items: data.products.length,
      });

      setQuoteSubmitted(true);

      toast({
        title: 'Quote Request Submitted!',
        description: `Quote #${createdQuote.quote_number} has been created. We'll respond within 24 hours.`,
        duration: 5000,
      });

    } catch (error) {
      console.error('Quote submission error:', error);
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show success page after submission
  if (quoteSubmitted && submittedQuoteData) {
    return (
      <QuoteSuccessPage 
        quoteData={submittedQuoteData}
        isGuestUser={!user}
      />
    );
  }

  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <ShoppingBag className="h-8 w-8 text-teal-600" />
            <h1 className="text-4xl font-bold text-gray-900">Request Your Quote</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Tell us what you want to buy from anywhere in the world. We'll handle the purchase, 
            shipping, and customs clearance to deliver it to your doorstep.
          </p>
          
          {/* Progress Bar */}
          <div className="mt-6 max-w-md mx-auto">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Form Progress</span>
              <span>{progress}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>


        {/* Main Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Contact Information Section */}
            <ContactInformationSection 
              control={form.control} 
              isGuestUser={!user}
              userProfile={userProfile}
            />

            {/* Product Information Section */}
            <MultipleProductsSection 
              control={form.control}
            />

            {/* Delivery Address Section */}
            <DeliveryAddressSection 
              control={form.control}
              isGuestUser={!user}
              onAddressSelect={(address) => {
                // Update form with selected address
                form.setValue('delivery_address.full_name', address.full_name);
                form.setValue('delivery_address.address_line_1', address.address_line_1);
                form.setValue('delivery_address.address_line_2', address.address_line_2);
                form.setValue('delivery_address.city', address.city);
                form.setValue('delivery_address.state_province', address.state_province);
                form.setValue('delivery_address.postal_code', address.postal_code);
                form.setValue('delivery_address.country', address.country);
                form.setValue('delivery_address.phone', address.phone);
              }}
            />


            {/* Submit Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Ready to Submit?</h3>
                <p className="text-gray-600">
                  Our team will review your request and send you a detailed quote within 24 hours.
                </p>
                
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting || progress < 70}
                  className="px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold text-lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Submit Quote Request
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
                
                {progress < 70 && (
                  <Alert>
                    <AlertDescription>
                      Please complete the required fields to submit your quote request.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}