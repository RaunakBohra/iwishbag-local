import { H1, H2, H3, Body, BodyLarge } from '@/components/ui/typography';
import { AlertCircle } from 'lucide-react';

const Returns = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-4xl font-semibold text-gray-900 mb-4">Returns and Refunds</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We want you to be completely satisfied with your purchase. Here's our returns policy.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Overview */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-2">30-Day Window</h3>
              <p className="text-gray-600">
                Return items within 30 days of delivery
              </p>
            </div>
            
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Original Condition</h3>
              <p className="text-gray-600">
                Items must be unused and in original packaging
              </p>
            </div>
            
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Easy Process</h3>
              <p className="text-gray-600">
                Simple online return request system
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="prose prose-gray max-w-none">
            
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Return Policy Overview</h2>
            <p className="text-gray-600 mb-12 leading-relaxed">
              We offer a 30-day return policy for most items. Due to the international nature of our service, 
              please review our policy carefully before making a purchase.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Eligible Returns</h2>
            <div className="bg-green-50 border border-green-200 p-6 rounded-lg mb-12">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Items We Can Accept</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <p className="text-gray-700 leading-relaxed">
                    Unopened items in original packaging
                  </p>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <p className="text-gray-700 leading-relaxed">
                    Defective or damaged items upon arrival
                  </p>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <p className="text-gray-700 leading-relaxed">
                    Items not matching product description
                  </p>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <p className="text-gray-700 leading-relaxed">
                    Clothing with tags still attached
                  </p>
                </li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Non-Returnable Items</h2>
            <div className="bg-red-50 border border-red-200 p-6 rounded-lg mb-12">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Items We Cannot Accept</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <p className="text-gray-700 leading-relaxed">
                    Perishable goods (food, flowers, etc.)
                  </p>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <p className="text-gray-700 leading-relaxed">
                    Personal care items (cosmetics, underwear)
                  </p>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <p className="text-gray-700 leading-relaxed">
                    Custom or personalized items
                  </p>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <p className="text-gray-700 leading-relaxed">
                    Items damaged by normal wear and tear
                  </p>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <p className="text-gray-700 leading-relaxed">
                    Items returned after 30 days
                  </p>
                </li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">How to Return an Item</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Our return process is designed to be as simple as possible. Follow these steps:
            </p>

            <div className="space-y-6 mb-12">
              <div className="flex items-start space-x-4 p-6 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold">1</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Contact Us</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Email us at returns@iwishbag.com with your order number and reason for return. 
                    We'll respond within 24 hours.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-6 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold">2</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Get Return Authorization</h3>
                  <p className="text-gray-600 leading-relaxed">
                    We'll review your request and provide a return authorization number and 
                    prepaid shipping label if approved.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-6 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold">3</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Package and Ship</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Securely package the item(s) with all original accessories and documentation. 
                    Attach the prepaid label and drop off at any authorized location.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-6 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold">4</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Receive Refund</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Once we receive and inspect your return, we'll process your refund within 
                    5-10 business days to your original payment method.
                  </p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Refund Information</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Refunds will be processed to your original payment method once we receive and 
              inspect the returned items.
            </p>

            <div className="bg-gray-50 p-6 rounded-lg mb-12">
              <h3 className="text-lg font-medium text-gray-900 mb-4">What Gets Refunded</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Item Purchase Price</span>
                  <span className="text-green-600 font-medium">✓ Full Refund</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">iwishBag Service Fee</span>
                  <span className="text-green-600 font-medium">✓ Full Refund</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">International Shipping</span>
                  <span className="text-red-600 font-medium">✗ Non-Refundable</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Customs Duties/Taxes</span>
                  <span className="text-red-600 font-medium">✗ Non-Refundable</span>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Exchanges</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              We don't offer direct exchanges due to the international nature of our service. 
              For size or color changes, please return the item and place a new order.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg mb-12">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Important Notes</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <p className="text-gray-700 leading-relaxed">
                        Return shipping costs are the customer's responsibility unless the item 
                        was defective or incorrectly described
                      </p>
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <p className="text-gray-700 leading-relaxed">
                        International return shipping can be expensive - consider this when placing orders
                      </p>
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <p className="text-gray-700 leading-relaxed">
                        Items damaged during return shipping may not be eligible for refund
                      </p>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Damaged or Defective Items</h2>
            <p className="text-gray-600 mb-12 leading-relaxed">
              If you receive a damaged or defective item, please contact us immediately with photos 
              of the damage. We'll arrange for a replacement or full refund at no cost to you.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Warranty Claims</h2>
            <p className="text-gray-600 mb-12 leading-relaxed">
              For items still under manufacturer warranty, we can help facilitate warranty claims 
              with the original manufacturer. Contact us for assistance.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Questions?</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              If you have any questions about our returns policy or need help with a return, 
              please don't hesitate to contact us.
            </p>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-2">
                <p className="text-gray-700">
                  <strong>Email:</strong> returns@iwishbag.com
                </p>
                <p className="text-gray-700">
                  <strong>Phone:</strong> +1 (555) 123-4567
                </p>
                <p className="text-gray-700">
                  <strong>Hours:</strong> Monday-Friday, 9AM-6PM EST
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Returns;