import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Package, 
  CreditCard, 
  Truck, 
  RotateCcw, 
  User, 
  Shield,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Clock,
  Globe,
  Calculator,
  FileText,
  Phone,
  Mail,
  Sparkles,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCountryDetection } from '@/hooks/useCountryDetection';
import { getContactInfo, hasPhoneSupport, getPhoneLink, getFormattedHours } from '@/config/contactInfo';
import { getCountryFAQs } from '@/config/countryFAQs';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  color: string;
  faqs: FAQItem[];
}

const Help = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { countryCode, isLoading: countryLoading } = useCountryDetection();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [expandedQuestions, setExpandedQuestions] = useState<string[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<FAQCategory[]>([]);

  // Get country-specific FAQs based on auto-detected country
  const countryFAQs = getCountryFAQs(countryCode);

  // Universal FAQ categories that don't change by country
  const universalCategories: FAQCategory[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: Sparkles,
      description: 'New to iWishBag? Start here',
      color: 'teal',
      faqs: [
        {
          question: 'How does iWishBag work?',
          answer: 'iWishBag helps you shop from international stores and delivers to your doorstep. Simply request a quote for any product, we\'ll calculate all costs including shipping and customs, and once approved, we\'ll handle the purchase and delivery.'
        },
        {
          question: 'What countries can I shop from?',
          answer: 'You can shop from any online store in the US, UK, Germany, Japan, China, and many more countries. We support purchases from Amazon, eBay, Walmart, Target, and thousands of other retailers worldwide.'
        },
        {
          question: 'How do I request my first quote?',
          answer: 'Click "Get Quote" in the navigation, paste the product URL or upload an image, fill in the quantity and any special instructions, then submit. We\'ll send you a detailed cost breakdown within 24-48 hours.'
        },
        {
          question: 'Do I need an account to get a quote?',
          answer: 'No, you can request quotes without an account. However, creating an account lets you track orders, save addresses, and access order history.'
        }
      ]
    },
    {
      id: 'shipping',
      title: 'Shipping & Delivery',
      icon: Truck,
      description: 'Delivery times, tracking, and customs',
      color: 'blue',
      faqs: [
        {
          question: 'How long does shipping take?',
          answer: 'Standard shipping takes 7-15 business days, Express shipping takes 3-7 business days. Delivery times vary by origin country and shipping method selected.'
        },
        {
          question: 'Which countries do you deliver to?',
          answer: 'We currently deliver to India and Nepal. We\'re expanding to more countries soon!'
        },
        {
          question: 'Can I track my package from the origin country?',
          answer: 'Yes! We provide end-to-end tracking. You\'ll get the original carrier tracking (like USPS, UPS) plus our consolidated tracking that follows your package through customs to final delivery.'
        },
        {
          question: 'What shipping carriers do you use?',
          answer: 'We partner with DHL, FedEx, Aramex for international shipping, and local carriers like Blue Dart, DTDC for final delivery. We choose the best option based on speed and reliability.'
        },
        {
          question: 'Do you offer express shipping options?',
          answer: 'Yes! We offer Express (3-7 days) and Standard (7-15 days) shipping. Express shipping is available for most items under 30kg. Rates are shown in your quote.'
        },
        {
          question: 'What happens if my package is damaged?',
          answer: 'All packages are insured. If damaged, take photos immediately and contact us within 48 hours. We\'ll handle the claim and ensure you get a replacement or full refund.'
        },
        {
          question: 'Can I ship to a different address?',
          answer: 'Yes, you can ship to any address in India or Nepal. Just provide the delivery address when approving your quote. We\'ll verify it for successful delivery.'
        },
        {
          question: 'How can I track my order?',
          answer: 'Once your order ships, you\'ll receive a tracking number via email. You can also track your order in your dashboard or using our tracking page.'
        },
        {
          question: 'What about customs and duties?',
          answer: 'All customs duties and taxes are calculated upfront in your quote. There are no hidden charges - the price you approve is the final price you pay.'
        },
        {
          question: 'Do you offer package consolidation?',
          answer: 'Yes! If you\'re ordering multiple items, we can consolidate them into one shipment to save on shipping costs. Just select "Combined Quote" when requesting.'
        }
      ]
    },
    {
      id: 'pricing',
      title: 'Pricing & Payments',
      icon: CreditCard,
      description: 'Costs, fees, and payment methods',
      color: 'green',
      faqs: [
        {
          question: 'What costs are included in the quote?',
          answer: 'Your quote includes: product price, international shipping, customs duties, handling fees, and any applicable taxes. The quoted price is final - no hidden charges.'
        },
        {
          question: 'How are customs duties calculated?',
          answer: 'Customs duties are calculated based on product category (HSN code), value, and destination country regulations. We use official government rates and include them transparently in your quote.'
        },
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept all major credit/debit cards, PayPal, and bank transfers. Payment is processed only after you approve the quote.'
        },
        {
          question: 'When do I pay?',
          answer: 'Payment is required after you approve the quote and before we purchase the item. We don\'t charge anything for quote requests.'
        },
        {
          question: 'Can I pay in installments?',
          answer: 'Currently, we require full payment upfront. However, you can use your credit card\'s EMI option if available. We\'re working on adding installment plans soon.'
        },
        {
          question: 'What happens if actual customs differ from the estimate?',
          answer: 'Our estimates are highly accurate. If customs are lower, we refund the difference. If higher by more than 10%, we cover the extra cost. Minor variations (under 10%) are absorbed as per our policy.'
        },
        {
          question: 'Are there any hidden fees?',
          answer: 'Absolutely not! The quote price is all-inclusive. It covers product cost, shipping, customs, and our service fee. You pay exactly what\'s quoted, nothing more.'
        },
        {
          question: 'Can I get a refund if the price changes?',
          answer: 'If the product price increases after quote approval, we\'ll notify you before proceeding. If it decreases, we\'ll automatically adjust and refund the difference.'
        },
        {
          question: 'Are there any membership fees?',
          answer: 'No membership fees! You only pay for the products you order. We do offer optional premium memberships with benefits like faster processing and discounts.'
        }
      ]
    },
    {
      id: 'returns',
      title: 'Returns & Refunds',
      icon: RotateCcw,
      description: 'Return policy and refund process',
      color: 'orange',
      faqs: [
        {
          question: 'What is your return policy?',
          answer: 'We offer a 30-day return policy for most items. Products must be unused, in original packaging, and with all tags attached. Some items like electronics may have different policies.'
        },
        {
          question: 'How do I initiate a return?',
          answer: 'Log into your account, go to Orders, click "Return Item" next to the product, fill out the return form, and we\'ll provide a return shipping label and instructions.'
        },
        {
          question: 'Who pays for return shipping?',
          answer: 'For defective or wrong items, we cover return shipping. For change of mind returns, the customer covers return shipping costs which will be deducted from the refund.'
        },
        {
          question: 'Can I cancel my order after payment?',
          answer: 'Yes, if we haven\'t purchased the item yet. Once purchased from the seller, cancellation isn\'t possible, but you can still return it after delivery (return shipping charges apply).'
        },
        {
          question: 'How long do refunds take?',
          answer: 'Refunds are processed within 2-3 business days after we receive the returned item. Bank processing may take additional 5-7 business days. Card refunds are usually faster.'
        },
        {
          question: 'What if I receive the wrong item?',
          answer: 'Take photos and notify us immediately. We\'ll arrange free return pickup and either send the correct item or provide a full refund including all shipping costs.'
        },
        {
          question: 'Do you handle warranty claims?',
          answer: 'Yes! We assist with international warranty claims. We\'ll coordinate with the manufacturer and handle shipping if repairs/replacements are needed. Warranty terms vary by product.'
        },
        {
          question: 'Can I return items bought from any store?',
          answer: 'Returns depend on the original store\'s policy. We\'ll help facilitate returns but some stores may have restrictions on international returns.'
        }
      ]
    },
    {
      id: 'account',
      title: 'Account & Security',
      icon: User,
      description: 'Login, profile, and security',
      color: 'purple',
      faqs: [
        {
          question: 'How do I reset my password?',
          answer: 'Click "Forgot Password" on the login page, enter your email, and we\'ll send a password reset link. The link expires in 24 hours for security.'
        },
        {
          question: 'Can I change my email address?',
          answer: 'Yes, go to Profile Settings in your dashboard to update your email. You\'ll need to verify the new email address before the change takes effect.'
        },
        {
          question: 'Is my personal information secure?',
          answer: 'Yes, we use industry-standard encryption for all data. We never share your personal information with third parties without your consent.'
        },
        {
          question: 'Can I delete my account?',
          answer: 'Yes, you can request account deletion from Profile Settings. Note that order history is retained for legal compliance but personal data is anonymized.'
        }
      ]
    },
    {
      id: 'ordering',
      title: 'Ordering Process',
      icon: Package,
      description: 'From quote to delivery',
      color: 'pink',
      faqs: [
        {
          question: 'What happens after I submit a quote request?',
          answer: 'Our team reviews your request, calculates all costs, and sends you a detailed quote within 24-48 hours. You can then approve, modify, or decline the quote.'
        },
        {
          question: 'Which international stores do you support?',
          answer: 'We support major platforms like Amazon (all countries), eBay, Walmart, Best Buy, Target, Alibaba, AliExpress, and most US/UK/Europe based online stores. If you\'re unsure, just submit a quote request!'
        },
        {
          question: 'How do I request a quote for multiple items?',
          answer: 'You can add multiple product URLs in a single quote request, or submit separate requests and ask us to combine them. We\'ll calculate the best shipping option for all items together.'
        },
        {
          question: 'Can I combine orders from different websites?',
          answer: 'Yes! We can consolidate items from multiple websites into a single shipment to save on shipping costs. Just mention in your quote request that you want to combine orders.'
        },
        {
          question: 'Can I modify my order after approval?',
          answer: 'Minor modifications may be possible before we purchase the item. Contact support immediately if you need changes. After purchase, modifications aren\'t possible.'
        },
        {
          question: 'What if an item goes out of stock?',
          answer: 'If an item becomes unavailable after quote approval, we\'ll notify you immediately and offer alternatives or a full refund of any payment made.'
        },
        {
          question: 'Do you handle restricted/prohibited items?',
          answer: 'Some items like weapons, hazardous materials, certain electronics, and liquids cannot be shipped internationally. We\'ll inform you during quote review if your item has restrictions.'
        }
      ]
    },
    {
      id: 'customs',
      title: 'Customs & Import',
      icon: Globe,
      description: 'Import regulations and documentation',
      color: 'purple',
      faqs: [
        {
          question: 'Will I need to pay customs separately?',
          answer: 'No! All customs duties and taxes are included in your quote. You won\'t have to pay anything extra at delivery. We handle all customs clearance for you.'
        },
        {
          question: 'What documents do I need for customs?',
          answer: 'We handle all documentation! For personal imports, we just need your ID (Aadhaar/PAN). For commercial imports, GST registration may be required.'
        },
        {
          question: 'How do you handle customs inspections?',
          answer: 'Our customs team manages all inspections. If customs officials need additional info, we\'ll contact you immediately. Most packages clear without inspection.'
        },
        {
          question: 'What items are prohibited for import?',
          answer: 'Prohibited items include: weapons, explosives, drugs, counterfeit goods, ivory, certain electronics, and items violating Indian/Nepali laws. We screen all orders for compliance.'
        },
        {
          question: 'Can you help with commercial imports?',
          answer: 'Yes! We handle both personal and commercial imports. For commercial shipments, we\'ll help with proper invoicing, GST compliance, and bulk shipping rates.'
        },
        {
          question: 'What is the duty-free limit?',
          answer: 'For India: ₹5,000 for gifts, no general exemption. For Nepal: Similar limits apply. However, our quotes always include applicable duties regardless of value.'
        }
      ]
    },
    {
      id: 'issues',
      title: 'Common Issues',
      icon: AlertCircle,
      description: 'Solutions to frequent problems',
      color: 'red',
      faqs: [
        {
          question: 'My tracking hasn\'t updated in days',
          answer: 'International tracking can have gaps, especially during customs processing. If no update for 5+ days, contact support with your tracking number for investigation.'
        },
        {
          question: 'I can\'t log into my account',
          answer: 'Try resetting your password first. If that doesn\'t work, clear your browser cache or try a different browser. Contact support if the issue persists.'
        },
        {
          question: 'The website I want to order from isn\'t working',
          answer: 'Some sites block international IPs. Send us the product link - we have methods to access most sites. If truly inaccessible, we\'ll suggest alternatives.'
        },
        {
          question: 'My payment was declined',
          answer: 'Common reasons: international transaction block, insufficient funds, or wrong CVV. Contact your bank to enable international transactions or try a different payment method.'
        },
        {
          question: 'I received a customs notice',
          answer: 'Don\'t worry! Forward the notice to us immediately. This is usually routine verification. We\'ll handle all communication with customs on your behalf.'
        },
        {
          question: 'My order shows delivered but I haven\'t received it',
          answer: 'Check with neighbors/security first. If truly missing, contact us within 24 hours with delivery proof. We\'ll investigate with the carrier and ensure resolution.'
        }
      ]
    }
  ];

  // Merge universal and country-specific FAQs
  const mergedCategories = React.useMemo(() => {
    // Create a map of country-specific categories by ID
    const countryFAQMap = new Map<string, FAQCategory>();
    countryFAQs.forEach(category => {
      countryFAQMap.set(category.id, category);
    });

    // Replace universal categories with country-specific ones where they exist
    return universalCategories.map(universalCategory => {
      const countrySpecificCategory = countryFAQMap.get(universalCategory.id);
      return countrySpecificCategory || universalCategory;
    });
  }, [countryCode]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Search functionality
  useEffect(() => {
    if (!searchQuery) {
      setFilteredCategories(mergedCategories);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = mergedCategories.map(category => ({
      ...category,
      faqs: category.faqs.filter(
        faq => 
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query)
      )
    })).filter(category => 
      category.faqs.length > 0 || 
      category.title.toLowerCase().includes(query)
    );

    setFilteredCategories(filtered);
    // Auto-expand categories with search results
    setExpandedCategories(filtered.map(cat => cat.id));
  }, [searchQuery, mergedCategories]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId) // Close this category
        : [...prev, categoryId] // Add this category to open ones
    );
  };

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const popularTopics = [
    { icon: Truck, label: 'Track Order', link: '/track' },
    { icon: Calculator, label: 'Estimate Costs', link: '/cost-estimator' },
    { icon: FileText, label: 'Get Quote', link: '/quote' },
    { icon: RotateCcw, label: 'Returns', link: '/returns' },
    { icon: MessageCircle, label: 'Support Tickets', link: '/support/my-tickets' },
    { icon: Package, label: 'My Orders', link: '/dashboard' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 rounded-full mb-6">
              <HelpCircle className="h-8 w-8 text-teal-600" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How can we help you?
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Find answers to common questions or contact our support team
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {popularTopics.map((topic, index) => (
            <Link
              key={index}
              to={topic.link}
              className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200 hover:border-teal-500 hover:shadow-md transition-all group"
            >
              <topic.icon className="h-6 w-6 text-gray-600 group-hover:text-teal-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">{topic.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* FAQ Categories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map((category) => {
            const Icon = category.icon;
            const isExpanded = expandedCategories.includes(category.id);
            
            return (
              <Card key={category.id} className={cn(
                "overflow-hidden flex flex-col transition-all duration-300",
                isExpanded ? "h-[400px] md:h-[500px]" : "h-auto"
              )}>
                <div
                  className={cn(
                    "cursor-pointer hover:bg-gray-50 transition-colors flex-shrink-0",
                    isExpanded ? "p-4" : "p-5"
                  )}
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        `bg-${category.color}-100`
                      )}>
                        <Icon className={cn("h-5 w-5", `text-${category.color}-600`)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-base">{category.title}</h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{category.description}</p>
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {category.faqs.length} articles
                        </Badge>
                      </div>
                    </div>
                    <ChevronDown className={cn(
                      "h-4 w-4 text-gray-400 transition-transform flex-shrink-0 mt-1",
                      isExpanded && "transform rotate-180"
                    )} />
                  </div>
                </div>

                {isExpanded && (
                  <CardContent className="pt-0 px-4 pb-4 flex-1 overflow-hidden">
                    <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                      <div className="space-y-3">
                        {category.faqs.map((faq, index) => {
                          const questionId = `${category.id}-${index}`;
                          const isQuestionExpanded = expandedQuestions.includes(questionId);
                          
                          return (
                            <div
                              key={index}
                              className="border border-gray-100 rounded-lg overflow-hidden"
                            >
                              <button
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleQuestion(questionId);
                                }}
                              >
                                <span className="font-medium text-gray-900 text-sm pr-2">
                                  {faq.question}
                                </span>
                                <ChevronRight className={cn(
                                  "h-4 w-4 text-gray-400 flex-shrink-0 transition-transform",
                                  isQuestionExpanded && "transform rotate-90"
                                )} />
                              </button>
                              {isQuestionExpanded && (
                                <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600 leading-relaxed">
                                  {/* Special handling for specific FAQs with links */}
                                  {faq.question === 'Can I delete my account?' ? (
                                    <>
                                      Yes, you can request account deletion from{' '}
                                      <Link 
                                        to="/profile" 
                                        className="text-teal-600 hover:text-teal-700 underline font-medium"
                                      >
                                        Profile Settings
                                      </Link>
                                      . Note that order history is retained for legal compliance but personal data is anonymized.
                                    </>
                                  ) : faq.question === 'How do I reset my password?' ? (
                                    <>
                                      {user ? (
                                        <>
                                          You can change your password from your{' '}
                                          <Link 
                                            to="/profile" 
                                            className="text-teal-600 hover:text-teal-700 underline font-medium"
                                          >
                                            Profile Settings
                                          </Link>
                                          . Look for the "Change Password" option in your account settings.
                                        </>
                                      ) : (
                                        <>
                                          Go to the{' '}
                                          <Link 
                                            to="/auth" 
                                            className="text-teal-600 hover:text-teal-700 underline font-medium"
                                            onClick={() => {
                                              // Store a flag to open forgot password modal after navigation
                                              sessionStorage.setItem('openForgotPassword', 'true');
                                            }}
                                          >
                                            login page and click "Forgot Password?"
                                          </Link>
                                          {' '}Enter your email, and we'll send you a 6-digit verification code. The code expires in 24 hours for security.
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    faq.answer
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Contact Support Section */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Can't find what you're looking for?
            </h2>
            <p className="text-gray-600">
              Choose the best way to get personalized support
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Live Chat Placeholder */}
            <Card className="hover:shadow-lg transition-all group relative overflow-hidden border-2 border-transparent hover:border-green-500">
              <CardContent className="p-6 text-center">
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                    Coming Soon
                  </Badge>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Live Chat</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Real-time support assistance
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>Instant responses</span>
                </div>
              </CardContent>
            </Card>

            {/* Support Tickets */}
            {user ? (
              <Card className="hover:shadow-lg transition-all group cursor-pointer border-2 border-transparent hover:border-teal-500" onClick={() => navigate('/support/my-tickets')}>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <MessageCircle className="h-6 w-6 text-teal-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Support Tickets</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Create & manage support requests
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-teal-600">
                    <Clock className="h-4 w-4" />
                    <span>24-48 hour response</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="hover:shadow-lg transition-all group cursor-pointer border-2 border-transparent hover:border-teal-500" onClick={() => navigate('/auth')}>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <User className="h-6 w-6 text-teal-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Sign In</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Sign in to create support tickets
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    Get help
                  </Badge>
                </CardContent>
              </Card>
            )}

            {/* Emergency Support - Country-Specific */}
            <Card className="hover:shadow-lg transition-all group border-2 border-transparent hover:border-orange-500">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Phone className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Urgent Help</h3>
                <p className="text-sm text-gray-600 mb-4">
                  For urgent shipping issues
                </p>
                
                {/* Country-specific contact information */}
                {!countryLoading && (() => {
                  const contactInfo = getContactInfo(countryCode);
                  const showPhone = hasPhoneSupport(countryCode);
                  
                  return (
                    <div className="space-y-3">
                      {/* Phone numbers for supported countries */}
                      {showPhone && contactInfo.phone && contactInfo.phone.map((phone, index) => (
                        <div key={index}>
                          <a 
                            href={getPhoneLink(phone)} 
                            className="text-sm font-medium text-orange-600 hover:text-orange-700 flex items-center justify-center gap-2"
                          >
                            <Phone className="h-4 w-4" />
                            {phone}
                          </a>
                        </div>
                      ))}
                      
                      {/* Email (always shown) */}
                      <div className={showPhone ? "border-t border-gray-200 pt-3" : ""}>
                        <a 
                          href={`mailto:${contactInfo.email}`} 
                          className="text-sm font-medium text-orange-600 hover:text-orange-700 flex items-center justify-center gap-2"
                        >
                          <Mail className="h-4 w-4" />
                          {contactInfo.email}
                        </a>
                      </div>
                      
                    </div>
                  );
                })()}
                
                {/* Loading state */}
                {countryLoading && (
                  <div className="text-sm text-gray-500">
                    Loading contact information...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Business Hours - Country-Specific */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-full">
              <Clock className="h-4 w-4" />
              <span>
                {countryLoading 
                  ? 'Loading support hours...' 
                  : `Support Hours: ${getFormattedHours(countryCode)}`
                }
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Need help outside business hours? Browse our FAQ above or create a ticket for a response within 24-48 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;