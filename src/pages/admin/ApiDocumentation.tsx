import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Book,
  Calculator,
  Code2,
  Copy,
  ExternalLink,
  Key,
  Lock,
  Shield,
  Zap,
  Database,
  Globe,
  MessageCircle,
  ShoppingCart,
  Users,
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  parameters?: { name: string; type: string; required: boolean; description: string }[];
  response: object;
  example: {
    request?: object;
    response: object;
  };
  authentication: 'none' | 'user' | 'admin';
  version: string;
  deprecated?: boolean;
}

interface ApiCategory {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  endpoints: ApiEndpoint[];
}

export const ApiDocumentation: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('quotes');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      toast({
        title: "Copied to clipboard",
        description: `${label} has been copied to your clipboard.`,
      });
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  const apiCategories: ApiCategory[] = [
    {
      name: 'quotes',
      description: 'Quote management and calculation APIs',
      icon: FileText,
      endpoints: [
        {
          method: 'GET',
          path: '/api/quotes',
          description: 'Retrieve quotes with pagination and filtering',
          parameters: [
            { name: 'limit', type: 'number', required: false, description: 'Number of quotes to return (max 100)' },
            { name: 'offset', type: 'number', required: false, description: 'Number of quotes to skip' },
            { name: 'status', type: 'string', required: false, description: 'Filter by quote status' },
            { name: 'user_id', type: 'string', required: false, description: 'Filter by user ID (admin only)' }
          ],
          response: {
            data: [],
            total: 0,
            hasMore: false
          },
          example: {
            request: {
              url: '/api/quotes?limit=10&status=pending',
              headers: {
                'Authorization': 'Bearer <token>',
                'Content-Type': 'application/json'
              }
            },
            response: {
              data: [
                {
                  id: 'quote_123',
                  quote_number: 'IWB-2025-001',
                  status: 'pending',
                  total_amount: 150.50,
                  currency: 'USD',
                  created_at: '2025-01-28T10:00:00Z'
                }
              ],
              total: 25,
              hasMore: true
            }
          },
          authentication: 'user',
          version: 'v1.1'
        },
        {
          method: 'POST',
          path: '/api/quotes',
          description: 'Create a new quote request',
          parameters: [
            { name: 'items', type: 'array', required: true, description: 'Array of items to quote' },
            { name: 'shipping_country', type: 'string', required: true, description: 'Destination country code' },
            { name: 'customer_data', type: 'object', required: false, description: 'Customer information' }
          ],
          response: {
            id: 'string',
            quote_number: 'string',
            status: 'pending',
            estimated_total: 0
          },
          example: {
            request: {
              items: [
                {
                  name: 'Wireless Headphones',
                  price_usd: 99.99,
                  quantity: 1,
                  weight: 0.5,
                  url: 'https://example.com/product'
                }
              ],
              shipping_country: 'NP',
              customer_data: {
                name: 'John Doe',
                email: 'john@example.com'
              }
            },
            response: {
              id: 'quote_456',
              quote_number: 'IWB-2025-002',
              status: 'pending',
              estimated_total: 125.50
            }
          },
          authentication: 'none',
          version: 'v1.1'
        }
      ]
    },
    {
      name: 'orders',
      description: 'Order processing and tracking APIs',
      icon: ShoppingCart,
      endpoints: [
        {
          method: 'GET',
          path: '/api/orders',
          description: 'Retrieve order history',
          parameters: [
            { name: 'limit', type: 'number', required: false, description: 'Number of orders to return' },
            { name: 'status', type: 'string', required: false, description: 'Filter by order status' }
          ],
          response: {
            data: [],
            total: 0
          },
          example: {
            response: {
              data: [
                {
                  id: 'order_789',
                  quote_id: 'quote_123',
                  status: 'shipped',
                  tracking_id: 'IWB20251001',
                  total_amount: 150.50
                }
              ],
              total: 5
            }
          },
          authentication: 'user',
          version: 'v1.1'
        }
      ]
    },
    {
      name: 'customers',
      description: 'Customer management APIs (Admin only)',
      icon: Users,
      endpoints: [
        {
          method: 'GET',
          path: '/api/customers',
          description: 'Retrieve customer list with search and filtering',
          parameters: [
            { name: 'search', type: 'string', required: false, description: 'Search by name or email' },
            { name: 'limit', type: 'number', required: false, description: 'Number of customers to return' }
          ],
          response: {
            data: [],
            total: 0
          },
          example: {
            response: {
              data: [
                {
                  id: 'customer_321',
                  full_name: 'Jane Smith',
                  email: 'jane@example.com',
                  phone: '+977-9841234567',
                  created_at: '2025-01-15T08:30:00Z'
                }
              ],
              total: 150
            }
          },
          authentication: 'admin',
          version: 'v1.1'
        }
      ]
    },
    {
      name: 'tracking',
      description: 'Order tracking and status APIs',
      icon: Globe,
      endpoints: [
        {
          method: 'GET',
          path: '/api/tracking/{tracking_id}',
          description: 'Get tracking information for an order',
          parameters: [
            { name: 'tracking_id', type: 'string', required: true, description: 'Tracking ID (e.g., IWB20251001)' }
          ],
          response: {
            tracking_id: 'string',
            status: 'string',
            updates: []
          },
          example: {
            response: {
              tracking_id: 'IWB20251001',
              status: 'in_transit',
              updates: [
                {
                  status: 'shipped',
                  location: 'Warehouse - USA',
                  timestamp: '2025-01-25T14:30:00Z',
                  description: 'Package shipped from warehouse'
                }
              ]
            }
          },
          authentication: 'none',
          version: 'v1.1'
        }
      ]
    },
    {
      name: 'calculator',
      description: 'Quote calculation and cost estimation APIs',
      icon: Calculator,
      endpoints: [
        {
          method: 'POST',
          path: '/api/calculator/estimate',
          description: 'Calculate shipping costs and taxes for items',
          parameters: [
            { name: 'items', type: 'array', required: true, description: 'Array of items to calculate' },
            { name: 'shipping_country', type: 'string', required: true, description: 'Destination country code' },
            { name: 'shipping_route', type: 'string', required: false, description: 'Preferred shipping route' },
            { name: 'include_taxes', type: 'boolean', required: false, description: 'Include tax calculations (default: true)' }
          ],
          response: {
            calculation_id: 'string',
            total_estimate: 0,
            breakdown: {}
          },
          example: {
            request: {
              items: [
                {
                  name: 'iPhone 15',
                  price_usd: 999.99,
                  quantity: 1,
                  weight: 0.2,
                  category: 'electronics',
                  hsn_code: '8517'
                }
              ],
              shipping_country: 'NP',
              include_taxes: true
            },
            response: {
              calculation_id: 'calc_abc123',
              total_estimate: 1245.50,
              breakdown: {
                item_cost: 999.99,
                shipping_fee: 85.00,
                customs_duty: 140.00,
                tax_amount: 20.51,
                service_fee: 0.00
              },
              currency: 'USD',
              expires_at: '2025-01-28T11:00:00Z'
            }
          },
          authentication: 'none',
          version: 'v1.1'
        },
        {
          method: 'POST',
          path: '/api/calculator/detailed',
          description: 'Get detailed calculation breakdown with all fees',
          parameters: [
            { name: 'items', type: 'array', required: true, description: 'Array of items with detailed information' },
            { name: 'shipping_country', type: 'string', required: true, description: 'Destination country code' },
            { name: 'customer_tier', type: 'string', required: false, description: 'Customer tier for pricing (new, regular, premium)' },
            { name: 'currency', type: 'string', required: false, description: 'Display currency (default: USD)' }
          ],
          response: {
            calculation_id: 'string',
            total_estimate: 0,
            detailed_breakdown: {},
            recommendations: []
          },
          example: {
            request: {
              items: [
                {
                  name: 'MacBook Pro',
                  price_usd: 2499.99,
                  quantity: 1,
                  weight: 2.0,
                  dimensions: { length: 35, width: 25, height: 2 },
                  category: 'electronics',
                  hsn_code: '8471',
                  url: 'https://apple.com/macbook-pro'
                }
              ],
              shipping_country: 'IN',
              customer_tier: 'premium',
              currency: 'INR'
            },
            response: {
              calculation_id: 'calc_def456',
              total_estimate: 312450.75,
              currency: 'INR',
              detailed_breakdown: {
                item_costs: [
                  {
                    item_name: 'MacBook Pro',
                    base_price_usd: 2499.99,
                    base_price_display: 208275.42,
                    quantity: 1,
                    subtotal: 208275.42
                  }
                ],
                shipping: {
                  base_fee: 12500.00,
                  weight_fee: 2500.00,
                  dimensional_weight: 2.5,
                  total_shipping: 15000.00
                },
                customs_taxes: {
                  customs_duty_rate: 20,
                  customs_duty: 50000.00,
                  gst_rate: 18,
                  gst_amount: 37500.00,
                  total_taxes: 87500.00
                },
                service_fees: {
                  processing_fee: 1250.00,
                  premium_discount: -625.00,
                  total_service: 625.00
                },
                insurance: {
                  coverage_amount: 250000.00,
                  premium_rate: 0.5,
                  cost: 1250.33
                }
              },
              recommendations: [
                'Consider shipping via air for faster delivery',
                'Premium customers get 50% discount on service fees'
              ],
              delivery_estimate: '7-10 business days',
              expires_at: '2025-01-28T11:00:00Z'
            }
          },
          authentication: 'user',
          version: 'v1.1'
        },
        {
          method: 'GET',
          path: '/api/calculator/rates',
          description: 'Get current shipping rates and tax information',
          parameters: [
            { name: 'from_country', type: 'string', required: false, description: 'Origin country (default: US)' },
            { name: 'to_country', type: 'string', required: true, description: 'Destination country code' },
            { name: 'category', type: 'string', required: false, description: 'Product category for specific rates' }
          ],
          response: {
            shipping_rates: {},
            tax_rates: {},
            available_routes: []
          },
          example: {
            response: {
              shipping_rates: {
                air: { base_rate: 25.00, per_kg: 15.00, min_charge: 50.00 },
                sea: { base_rate: 15.00, per_kg: 8.00, min_charge: 30.00 },
                express: { base_rate: 45.00, per_kg: 25.00, min_charge: 80.00 }
              },
              tax_rates: {
                customs_duty: { min: 10, max: 30, typical: 20 },
                gst: 18,
                additional_cess: 0
              },
              available_routes: [
                { id: 'air_express', name: 'Air Express', delivery_days: '3-5' },
                { id: 'air_standard', name: 'Air Standard', delivery_days: '7-10' },
                { id: 'sea_freight', name: 'Sea Freight', delivery_days: '21-30' }
              ],
              currency: 'USD',
              last_updated: '2025-01-28T09:00:00Z'
            }
          },
          authentication: 'none',
          version: 'v1.1'
        },
        {
          method: 'POST',
          path: '/api/calculator/bulk',
          description: 'Calculate costs for multiple item sets (bulk calculation)',
          parameters: [
            { name: 'calculations', type: 'array', required: true, description: 'Array of calculation requests' },
            { name: 'customer_id', type: 'string', required: false, description: 'Customer ID for personalized pricing' },
            { name: 'save_results', type: 'boolean', required: false, description: 'Save results for later retrieval' }
          ],
          response: {
            bulk_id: 'string',
            results: [],
            summary: {}
          },
          example: {
            request: {
              calculations: [
                {
                  id: 'calc_1',
                  items: [{ name: 'Item 1', price_usd: 100, quantity: 1, weight: 0.5 }],
                  shipping_country: 'NP'
                },
                {
                  id: 'calc_2', 
                  items: [{ name: 'Item 2', price_usd: 200, quantity: 2, weight: 1.0 }],
                  shipping_country: 'IN'
                }
              ],
              save_results: true
            },
            response: {
              bulk_id: 'bulk_xyz789',
              results: [
                { id: 'calc_1', total_estimate: 145.50, status: 'success' },
                { id: 'calc_2', total_estimate: 598.75, status: 'success' }
              ],
              summary: {
                total_calculations: 2,
                successful: 2,
                failed: 0,
                total_value: 744.25
              },
              expires_at: '2025-01-28T11:00:00Z'
            }
          },
          authentication: 'user',
          version: 'v1.1'
        },
        {
          method: 'GET',
          path: '/api/calculator/hsn-lookup',
          description: 'Look up HSN codes and tax rates for products',
          parameters: [
            { name: 'product_name', type: 'string', required: false, description: 'Product name for HSN suggestion' },
            { name: 'category', type: 'string', required: false, description: 'Product category' },
            { name: 'hsn_code', type: 'string', required: false, description: 'Specific HSN code to look up' },
            { name: 'country', type: 'string', required: false, description: 'Destination country for tax rates' }
          ],
          response: {
            suggestions: [],
            tax_info: {}
          },
          example: {
            request: {
              product_name: 'smartphone',
              country: 'IN'
            },
            response: {
              suggestions: [
                {
                  hsn_code: '8517',
                  description: 'Telephone sets, including smartphones',
                  confidence: 0.95,
                  tax_rates: {
                    customs_duty: 20,
                    gst: 18,
                    additional_cess: 0
                  }
                }
              ],
              tax_info: {
                effective_rate: 41.6,
                breakdown: 'Customs Duty (20%) + GST (18%) on (Cost + Duty)'
              }
            }
          },
          authentication: 'none',
          version: 'v1.1'
        }
      ]
    },
    {
      name: 'webhooks',
      description: 'Webhook endpoints for real-time updates',
      icon: Zap,
      endpoints: [
        {
          method: 'POST',
          path: '/webhooks/quote-status',
          description: 'Webhook for quote status updates',
          parameters: [
            { name: 'quote_id', type: 'string', required: true, description: 'Quote identifier' },
            { name: 'status', type: 'string', required: true, description: 'New status' },
            { name: 'timestamp', type: 'string', required: true, description: 'ISO timestamp' }
          ],
          response: { success: true },
          example: {
            request: {
              quote_id: 'quote_123',
              status: 'approved',
              timestamp: '2025-01-28T10:30:00Z',
              data: {
                approved_by: 'admin_user',
                notes: 'Quote approved for processing'
              }
            },
            response: { success: true }
          },
          authentication: 'none',
          version: 'v1.1'
        }
      ]
    }
  ];

  const currentCategory = apiCategories.find(cat => cat.name === selectedCategory);

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-600';
      case 'POST': return 'bg-blue-600';
      case 'PUT': return 'bg-orange-600';
      case 'DELETE': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getAuthIcon = (auth: string) => {
    switch (auth) {
      case 'none': return <Globe className="h-4 w-4" />;
      case 'user': return <Lock className="h-4 w-4" />;
      case 'admin': return <Shield className="h-4 w-4" />;
      default: return <Key className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API Documentation</h1>
          <p className="text-muted-foreground mt-1">
            Complete reference for iwishBag platform APIs
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => window.open('/api/postman-collection.json', '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
            Postman Collection
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => window.open('/api/openapi.yaml', '_blank')}
          >
            <Code2 className="h-4 w-4" />
            OpenAPI Spec
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => window.open('/api/README.md', '_blank')}
          >
            <Book className="h-4 w-4" />
            Full Documentation
          </Button>
        </div>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Start
          </CardTitle>
          <CardDescription>
            Get started with the iwishBag API in minutes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="font-medium flex items-center gap-2">
                <Key className="h-4 w-4" />
                1. Authentication
              </h3>
              <p className="text-sm text-muted-foreground">
                Sign up for an account and get your API key from the admin dashboard.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                2. Make Requests
              </h3>
              <p className="text-sm text-muted-foreground">
                Use HTTP requests with JSON payloads to interact with our endpoints.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                3. Handle Responses
              </h3>
              <p className="text-sm text-muted-foreground">
                Process JSON responses and handle errors appropriately.
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="font-medium">Base URL</h3>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
              <span>https://iwishbag.com/api</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard('https://iwishbag.com/api', 'Base URL')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Authentication Header</h3>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
              <span>Authorization: Bearer YOUR_API_KEY</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard('Authorization: Bearer YOUR_API_KEY', 'Auth header')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API Categories</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {apiCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.name}
                      onClick={() => setSelectedCategory(category.name)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors ${
                        selectedCategory === category.name ? 'bg-accent text-accent-foreground' : ''
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <div className="flex-1">
                        <div className="font-medium capitalize">{category.name}</div>
                        <div className="text-xs text-muted-foreground">{category.endpoints.length} endpoints</div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {currentCategory && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 capitalize">
                    <currentCategory.icon className="h-5 w-5" />
                    {currentCategory.name} API
                  </CardTitle>
                  <CardDescription>{currentCategory.description}</CardDescription>
                </CardHeader>
              </Card>

              {/* Endpoints */}
              <div className="space-y-6">
                {currentCategory.endpoints.map((endpoint, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={getMethodColor(endpoint.method)}>
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm font-mono">{endpoint.path}</code>
                          {endpoint.deprecated && (
                            <Badge variant="destructive">Deprecated</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getAuthIcon(endpoint.authentication)}
                          <Badge variant="outline">{endpoint.version}</Badge>
                        </div>
                      </div>
                      <CardDescription>{endpoint.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Tabs defaultValue="overview">
                        <TabsList>
                          <TabsTrigger value="overview">Overview</TabsTrigger>
                          <TabsTrigger value="parameters">Parameters</TabsTrigger>
                          <TabsTrigger value="example">Example</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-4">
                          <div className="space-y-2">
                            <h4 className="font-medium">Authentication</h4>
                            <div className="flex items-center gap-2">
                              {getAuthIcon(endpoint.authentication)}
                              <span className="text-sm capitalize">{endpoint.authentication}</span>
                              {endpoint.authentication === 'admin' && (
                                <Badge variant="secondary">Admin Only</Badge>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-medium">Response Format</h4>
                            <ScrollArea className="h-32">
                              <pre className="text-xs bg-muted p-3 rounded">
                                {JSON.stringify(endpoint.response, null, 2)}
                              </pre>
                            </ScrollArea>
                          </div>
                        </TabsContent>

                        <TabsContent value="parameters" className="space-y-4">
                          {endpoint.parameters && endpoint.parameters.length > 0 ? (
                            <div className="space-y-3">
                              {endpoint.parameters.map((param, paramIndex) => (
                                <div key={paramIndex} className="border rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <code className="text-sm font-mono">{param.name}</code>
                                    <Badge variant={param.required ? "default" : "secondary"}>
                                      {param.type}
                                    </Badge>
                                    {param.required && (
                                      <Badge variant="destructive" className="text-xs">Required</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{param.description}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground">No parameters required for this endpoint.</p>
                          )}
                        </TabsContent>

                        <TabsContent value="example" className="space-y-4">
                          {endpoint.example.request && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">Request Example</h4>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(
                                    JSON.stringify(endpoint.example.request, null, 2),
                                    'Request example'
                                  )}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                              <ScrollArea className="h-48">
                                <pre className="text-xs bg-muted p-3 rounded">
                                  {JSON.stringify(endpoint.example.request, null, 2)}
                                </pre>
                              </ScrollArea>
                            </div>
                          )}

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Response Example</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(
                                  JSON.stringify(endpoint.example.response, null, 2),
                                  'Response example'
                                )}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <ScrollArea className="h-48">
                              <pre className="text-xs bg-muted p-3 rounded">
                                {JSON.stringify(endpoint.example.response, null, 2)}
                              </pre>
                            </ScrollArea>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Codes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Common Error Codes
          </CardTitle>
          <CardDescription>
            Standard HTTP status codes and their meanings in our API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge className="bg-green-600">200</Badge>
                <span className="text-sm">Success - Request completed successfully</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-600">201</Badge>
                <span className="text-sm">Created - Resource created successfully</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-orange-600">400</Badge>
                <span className="text-sm">Bad Request - Invalid request format</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-red-600">401</Badge>
                <span className="text-sm">Unauthorized - Invalid or missing API key</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge className="bg-red-600">403</Badge>
                <span className="text-sm">Forbidden - Insufficient permissions</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-red-600">404</Badge>
                <span className="text-sm">Not Found - Resource not found</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-red-600">429</Badge>
                <span className="text-sm">Rate Limit - Too many requests</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-red-600">500</Badge>
                <span className="text-sm">Server Error - Internal server error</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiDocumentation;