import { H1, H2, H3, Body, BodyLarge } from '@/components/ui/typography';
import { AlertTriangle } from 'lucide-react';

const TermsConditions = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-4xl font-semibold text-gray-900 mb-4">Terms and Conditions</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              These terms govern your use of iwishBag's international shopping services.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="prose prose-gray max-w-none">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Acceptance of Terms</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              By accessing and using iwishBag's services, you accept and agree to be bound by these
              terms and conditions. If you do not agree to these terms, please do not use our
              services.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Service Description</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              iwishBag provides international shopping and shipping services, helping customers
              purchase products from global retailers and deliver them worldwide.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <div className="p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">What We Do</h3>
                <p className="text-gray-600 leading-relaxed">
                  Purchase products on your behalf, handle international shipping, and manage
                  customs documentation.
                </p>
              </div>

              <div className="p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">What We Don't Do</h3>
                <p className="text-gray-600 leading-relaxed">
                  We don't manufacture products, control merchant policies, or determine customs
                  duties.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">
              User Responsibilities
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              You agree to provide accurate information and comply with all applicable laws and
              regulations when using our services.
            </p>

            <div className="bg-teal-50 border border-teal-200 p-6 rounded-lg mb-12">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-teal-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Important Requirements</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <p className="text-gray-700 leading-relaxed">
                        Provide accurate shipping addresses and contact information
                      </p>
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <p className="text-gray-700 leading-relaxed">
                        Comply with import/export regulations of your country
                      </p>
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <p className="text-gray-700 leading-relaxed">
                        Pay all applicable duties, taxes, and fees
                      </p>
                    </li>
                    <li className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <p className="text-gray-700 leading-relaxed">
                        Do not request prohibited or restricted items
                      </p>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Pricing and Payment</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Our pricing includes item cost, shipping, handling, and any applicable fees. Prices
              are quoted in USD and may vary based on exchange rates.
            </p>

            <h3 className="text-xl font-medium text-gray-900 mb-6">Payment Terms</h3>
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <h4 className="text-lg font-medium text-gray-900 mb-2">Quotes</h4>
                <p className="text-gray-600">Valid for 7 days from issue date</p>
              </div>

              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <h4 className="text-lg font-medium text-gray-900 mb-2">Payment</h4>
                <p className="text-gray-600">Required before order processing</p>
              </div>

              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <h4 className="text-lg font-medium text-gray-900 mb-2">Refunds</h4>
                <p className="text-gray-600">Subject to our returns policy</p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">
              Shipping and Delivery
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              We strive to deliver your orders safely and on time, but shipping times may vary due
              to factors beyond our control.
            </p>

            <div className="bg-gray-50 p-6 rounded-lg mb-12">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery Timeline</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Order Processing</span>
                  <span className="text-gray-900 font-medium">1-3 business days</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">International Shipping</span>
                  <span className="text-gray-900 font-medium">5-15 business days</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Customs Clearance</span>
                  <span className="text-gray-900 font-medium">1-7 business days</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Local Delivery</span>
                  <span className="text-gray-900 font-medium">1-3 business days</span>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Customs and Duties</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              International shipments may be subject to customs duties, taxes, and fees determined
              by your country's customs authorities.
            </p>

            <div className="bg-gray-50 p-6 rounded-lg mb-12">
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Customer Responsibility:</strong> You are responsible for all customs
                    duties, taxes, and fees imposed by your country.
                  </p>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Estimates Only:</strong> Our duty calculations are estimates and may
                    differ from actual amounts charged by customs.
                  </p>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Compliance:</strong> We comply with all applicable import/export
                    regulations and customs requirements.
                  </p>
                </li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">
              Limitation of Liability
            </h2>
            <p className="text-gray-600 mb-12 leading-relaxed">
              Our liability is limited to the value of your order. We are not responsible for
              indirect damages, delays beyond our control, or issues with merchant products.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Prohibited Items</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              We cannot ship hazardous materials, illegal items, or products restricted by
              international shipping regulations.
            </p>

            <div className="bg-gray-50 p-6 rounded-lg mb-12">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Examples of Prohibited Items
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <p className="text-gray-700">Weapons and ammunition</p>
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <p className="text-gray-700">Hazardous chemicals</p>
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <p className="text-gray-700">Illegal drugs</p>
                  </li>
                </ul>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <p className="text-gray-700">Counterfeit goods</p>
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <p className="text-gray-700">Perishable items</p>
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <p className="text-gray-700">Restricted electronics</p>
                  </li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Termination</h2>
            <p className="text-gray-600 mb-12 leading-relaxed">
              We reserve the right to terminate or suspend your account for violation of these terms
              or inappropriate use of our services.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Changes to Terms</h2>
            <p className="text-gray-600 mb-12 leading-relaxed">
              We may update these terms from time to time. Continued use of our services constitutes
              acceptance of any changes.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Governing Law</h2>
            <p className="text-gray-600 mb-12 leading-relaxed">
              These terms are governed by the laws of [Your Jurisdiction]. Any disputes will be
              resolved through binding arbitration.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Contact Information</h2>
            <div className="bg-gray-50 p-6 rounded-lg mb-8">
              <p className="text-gray-700 leading-relaxed">
                For questions about these terms, please contact us at:
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-gray-700">
                  <strong>Email:</strong> legal@iwishbag.com
                </p>
                <p className="text-gray-700">
                  <strong>Address:</strong> iwishBag Legal Department, [Your Address]
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsConditions;
