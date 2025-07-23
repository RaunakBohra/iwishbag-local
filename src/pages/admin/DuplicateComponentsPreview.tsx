import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Users, 
  CreditCard, 
  MessageCircle, 
  Phone, 
  Calculator,
  Database,
  Copy,
  Trash2,
  AlertTriangle
} from 'lucide-react';

// Import duplicates for preview (we'll create safe wrappers)
// Note: Some imports might fail - we'll handle gracefully

const DuplicateComponentsPreview = () => {
  const [selectedCategory, setSelectedCategory] = useState('currency');

  const duplicateGroups = {
    currency: {
      title: "Currency Display Components",
      icon: <CreditCard className="w-5 h-5" />,
      description: "Multiple components handling currency display with different features",
      items: [
        {
          id: 1,
          name: "DualCurrencyDisplay.tsx",
          path: "src/components/admin/DualCurrencyDisplay.tsx",
          lines: 257,
          status: "Full-featured",
          description: "Complete currency display with tooltips, badges, exchange rate info, stories file included",
          features: ["Tooltips", "Exchange rates", "Multiple currencies", "Storybook stories", "Error handling"],
          lastModified: "Recently used",
          recommendation: "Keep - Most feature complete"
        },
        {
          id: 2,
          name: "MultiCurrencyDisplay.tsx [REMOVED ✅]",
          path: "src/components/admin/MultiCurrencyDisplay.tsx", 
          lines: 26,
          status: "REMOVED",
          description: "✅ REMOVED - Functionality covered by DualCurrencyDisplay",
          features: ["REMOVED"],
          lastModified: "REMOVED",
          recommendation: "✅ REMOVED - 26 lines saved"
        },
        {
          id: 3,
          name: "SimpleDualCurrency (internal)",
          path: "Inside DualCurrencyDisplay.tsx",
          lines: 30,
          status: "Internal component",
          description: "Minimal version defined within DualCurrencyDisplay component",
          features: ["Minimal display", "Internal use only"],
          lastModified: "Part of #1",
          recommendation: "Keep as internal - used by main component"
        }
      ]
    },
    
    tables: {
      title: "Customer Table Components",
      icon: <Users className="w-5 h-5" />,
      description: "Three different customer table implementations with overlapping functionality",
      items: [
        {
          id: 4,
          name: "WorldClassCustomerTable.tsx",
          path: "src/components/admin/WorldClassCustomerTable.tsx",
          lines: 779,
          status: "Production-ready",
          description: "Shopify-style table with advanced features, sorting, filtering, actions",
          features: ["Advanced filtering", "Bulk actions", "Sorting", "Pagination", "Search", "Export", "Modern UI"],
          lastModified: "Active development",
          recommendation: "Keep - Most complete implementation"
        },
        {
          id: 5,
          name: "EnhancedCustomerTable.tsx", 
          path: "src/components/admin/EnhancedCustomerTable.tsx",
          lines: 454,
          status: "Mid-level features",
          description: "Enhanced table with some advanced features but not as complete as WorldClass",
          features: ["Basic filtering", "Some actions", "Sorting", "Search"],
          lastModified: "Moderate use",
          recommendation: "Remove - functionality covered by #4"
        },
        {
          id: 6,
          name: "CustomerTable.tsx",
          path: "src/components/admin/CustomerTable.tsx", 
          lines: 471,
          status: "Basic implementation",
          description: "Simple table implementation with basic functionality",
          features: ["Basic display", "Simple actions", "No advanced features"],
          lastModified: "Legacy",
          recommendation: "Remove - replaced by better implementations"
        }
      ]
    },

    payments: {
      title: "Payment Link Generators", 
      icon: <CreditCard className="w-5 h-5" />,
      description: "Two payment link generation components with different feature sets",
      items: [
        {
          id: 7,
          name: "EnhancedPaymentLinkGenerator.tsx",
          path: "src/components/admin/EnhancedPaymentLinkGenerator.tsx",
          lines: 1221,
          status: "Production-ready",
          description: "Full-featured payment link generator with custom fields, tabs, advanced UI",
          features: ["Custom fields", "Multiple payment methods", "Advanced UI", "Validation", "Templates"],
          lastModified: "Active development", 
          recommendation: "Keep - Production implementation"
        },
        {
          id: 8,
          name: "PaymentLinkGenerator.tsx",
          path: "src/components/admin/PaymentLinkGenerator.tsx",
          lines: 295,
          status: "Basic version",
          description: "Simple payment link creation with basic functionality",
          features: ["Basic link generation", "Simple UI", "Limited options"],
          lastModified: "Legacy",
          recommendation: "Remove - functionality covered by #7"
        }
      ]
    },

    messaging: {
      title: "Messaging System Components",
      icon: <MessageCircle className="w-5 h-5" />,
      description: "Basic vs Enhanced messaging components",
      items: [
        {
          id: 9,
          name: "MessageItem.tsx",
          path: "src/components/admin/MessageItem.tsx",
          lines: 166,
          status: "Basic version",
          description: "Basic message display component",
          features: ["Simple message display", "Basic styling"],
          lastModified: "Legacy",
          recommendation: "Remove - replaced by enhanced version"
        },
        {
          id: 10,
          name: "MessageItemEnhanced.tsx", 
          path: "src/components/admin/MessageItemEnhanced.tsx",
          lines: 367,
          status: "Enhanced version",
          description: "Enhanced message display with more features",
          features: ["Rich message display", "Attachments", "Reactions", "Better UI"],
          lastModified: "Active use",
          recommendation: "Keep - Better implementation"
        },
        {
          id: 11,
          name: "MessageList.tsx",
          path: "src/components/admin/MessageList.tsx", 
          lines: 67,
          status: "Basic list",
          description: "Basic message list component",
          features: ["Simple list", "Basic functionality"],
          lastModified: "Still used in some places",
          recommendation: "Migrate usage to #12, then remove"
        },
        {
          id: 12,
          name: "MessageListEnhanced.tsx",
          path: "src/components/admin/MessageListEnhanced.tsx",
          lines: 151, 
          status: "Enhanced list",
          description: "Enhanced message list with better functionality",
          features: ["Advanced list", "Filtering", "Search", "Better performance"],
          lastModified: "Active development",
          recommendation: "Keep - Better implementation"
        }
      ]
    },

    phone: {
      title: "Phone Collection Modals",
      icon: <Phone className="w-5 h-5" />,
      description: "Exact duplicate phone collection components in different directories",
      items: [
        {
          id: 13,
          name: "PhoneCollectionModal.tsx (Auth)",
          path: "src/components/auth/PhoneCollectionModal.tsx",
          lines: 150,
          status: "Auth version",
          description: "Phone collection modal in auth flow",
          features: ["Phone validation", "OTP integration", "Auth context"],
          lastModified: "Active use",
          recommendation: "Keep one, merge functionality"
        },
        {
          id: 14,
          name: "PhoneCollectionModal.tsx (Onboarding)",
          path: "src/components/onboarding/PhoneCollectionModal.tsx", 
          lines: 155,
          status: "Onboarding version",
          description: "Near-identical phone collection modal in onboarding flow",
          features: ["Phone validation", "OTP integration", "Onboarding context"],
          lastModified: "Active use", 
          recommendation: "Merge with #13 - functionality is identical"
        }
      ]
    },

    calculators: {
      title: "Cost Estimator Components",
      icon: <Calculator className="w-5 h-5" />,
      description: "Multiple cost estimator implementations for different contexts",
      items: [
        {
          id: 15,
          name: "CostEstimator.tsx (Landing)",
          path: "src/components/landing/CostEstimator.tsx",
          lines: 280,
          status: "Landing page version",
          description: "Cost estimator for landing page with marketing focus",
          features: ["Marketing copy", "Simplified UI", "Lead generation"],
          lastModified: "Active use",
          recommendation: "Keep - Specific to landing page"
        },
        {
          id: 16,
          name: "CostEstimator.tsx (Tools)",
          path: "src/components/tools/CostEstimator.tsx",
          lines: 420,
          status: "Tool page version", 
          description: "Full-featured cost estimator for dedicated tool page",
          features: ["Advanced calculations", "Detailed results", "Export options"],
          lastModified: "Active use",
          recommendation: "Keep - Most complete implementation"
        },
        {
          id: 17,
          name: "CostEstimatorPreview.tsx",
          path: "src/components/home/CostEstimatorPreview.tsx",
          lines: 120,
          status: "Home preview",
          description: "Simplified preview version for home page",
          features: ["Preview mode", "Basic calculations", "Call-to-action"],
          lastModified: "Active use",
          recommendation: "Keep - Serves specific purpose"
        },
        {
          id: 18,
          name: "OptimizedCostEstimator.tsx",
          path: "src/components/shared/OptimizedCostEstimator.tsx",
          lines: 180,
          status: "Performance optimized",
          description: "Performance-optimized version with caching",
          features: ["Performance optimized", "Caching", "Reduced re-renders"],
          lastModified: "Recent",
          recommendation: "Evaluate - May replace others if performance is critical"
        }
      ]
    },

    hooks: {
      title: "Duplicate Hooks & Utilities",
      icon: <Database className="w-5 h-5" />,
      description: "Duplicate or similar hooks and utility functions",
      items: [
        {
          id: 19,
          name: "useCustomerManagement.ts",
          path: "src/hooks/useCustomerManagement.ts",
          lines: 180,
          status: "Original implementation",
          description: "Original customer management hook",
          features: ["Basic customer operations", "Original API calls"],
          lastModified: "Legacy",
          recommendation: "Remove - replaced by fixed version"
        },
        {
          id: 20,
          name: "useCustomerManagementFixed.ts",
          path: "src/hooks/useCustomerManagementFixed.ts", 
          lines: 210,
          status: "Fixed version",
          description: "Fixed version with proper email fetching and error handling",
          features: ["Proper email fetching", "Better error handling", "Bug fixes"],
          lastModified: "Active use",
          recommendation: "Keep - Correct implementation"
        },
        {
          id: 21,
          name: "BankAccountForm.tsx",
          path: "src/components/admin/BankAccountForm.tsx",
          lines: 145,
          status: "Basic form",
          description: "Basic bank account form component",
          features: ["Basic fields", "Simple validation"],
          lastModified: "Legacy",
          recommendation: "Remove - replaced by flexible version"
        },
        {
          id: 22,
          name: "FlexibleBankAccountForm.tsx",
          path: "src/components/admin/FlexibleBankAccountForm.tsx",
          lines: 280,
          status: "Advanced form",
          description: "Advanced form with custom fields and country-specific features",
          features: ["Custom fields", "Country-specific", "Advanced validation", "Better UX"],
          lastModified: "Active development",
          recommendation: "Keep - More complete implementation"
        }
      ]
    }
  };

  const totalDuplicates = Object.values(duplicateGroups).reduce((acc, group) => acc + group.items.length, 0);
  const totalLines = Object.values(duplicateGroups).reduce((acc, group) => 
    acc + group.items.reduce((sum, item) => sum + item.lines, 0), 0
  );

  const getStatusColor = (status: string) => {
    if (status.includes('Production') || status.includes('Enhanced') || status.includes('Fixed')) return 'bg-green-100 text-green-800';
    if (status.includes('Basic') || status.includes('Legacy')) return 'bg-yellow-100 text-yellow-800';
    if (status.includes('Duplicate') || status.includes('Original')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getRecommendationColor = (rec: string) => {
    if (rec.includes('Keep')) return 'text-green-600';
    if (rec.includes('Remove')) return 'text-red-600';
    if (rec.includes('Merge') || rec.includes('Migrate')) return 'text-blue-600';
    return 'text-gray-600';
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Duplicate Components Cleanup Preview</h1>
        <p className="text-lg text-gray-600">
          Review duplicate components and decide which ones to keep or remove
        </p>
        <div className="flex justify-center space-x-6 text-sm">
          <Badge variant="outline" className="px-3 py-1">
            <Copy className="w-4 h-4 mr-2" />
            {totalDuplicates} Components
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <FileText className="w-4 h-4 mr-2" />
            {totalLines.toLocaleString()} Total Lines
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <AlertTriangle className="w-4 h-4 mr-2" />
            ~3,000+ Lines Can Be Saved
          </Badge>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          {Object.entries(duplicateGroups).map(([key, group]) => (
            <TabsTrigger key={key} value={key} className="flex items-center space-x-2">
              {group.icon}
              <span className="hidden sm:inline">{group.title.split(' ')[0]}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(duplicateGroups).map(([key, group]) => (
          <TabsContent key={key} value={key} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {group.icon}
                  <span>{group.title}</span>
                  <Badge variant="secondary">{group.items.length} items</Badge>
                </CardTitle>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
            </Card>

            <div className="grid gap-4">
              {group.items.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            #{item.id}
                          </Badge>
                          <h3 className="text-lg font-semibold">{item.name}</h3>
                          <Badge className={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 font-mono">{item.path}</p>
                        <p className="text-sm text-gray-700">{item.description}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge variant="outline">{item.lines} lines</Badge>
                        <p className="text-xs text-gray-500">{item.lastModified}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Features:</h4>
                      <div className="flex flex-wrap gap-1">
                        {item.features.map((feature, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <h4 className="text-sm font-medium mb-1">Recommendation:</h4>
                      <p className={`text-sm font-medium ${getRecommendationColor(item.recommendation)}`}>
                        {item.recommendation}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-900">How to Use This Preview</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>1. <strong>Browse each category</strong> using the tabs above</p>
            <p>2. <strong>Review each component</strong> - check the features, file paths, and recommendations</p>
            <p>3. <strong>Tell me which components to remove</strong> by their numbers (e.g., "Remove #2, #5, #6, #8")</p>
            <p>4. <strong>I'll handle the cleanup</strong> - migrate usage, remove files, update imports</p>
          </div>
          <div className="mt-4 p-3 bg-white rounded border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Example:</strong> "Remove components #2, #5, #6, #8, #9, #11, #13, #19, #21" 
              <br />
              This would save approximately 1,500+ lines of duplicate code.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DuplicateComponentsPreview;