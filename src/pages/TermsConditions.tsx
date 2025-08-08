import { useEffect } from 'react';
import { H1, H2, H3, Body, BodyLarge } from '@/components/ui/typography';
import { AlertTriangle } from 'lucide-react';
import { useCountryDetection } from '@/hooks/useCountryDetection';
import { getCompanyInfo, getFormattedAddress } from '@/config/companyInfo';

const TermsConditions = () => {
  const { countryCode } = useCountryDetection();
  const companyInfo = getCompanyInfo(countryCode);
  const formattedAddress = getFormattedAddress(countryCode, true);
  
  useEffect(() => {
    // Handle anchor links for weight policy, etc.
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-4xl font-semibold text-gray-900 mb-4">Terms and Conditions</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              These terms govern your use of {companyInfo.shortName}'s international shopping services.
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
              By accessing and using {companyInfo.shortName}'s services, you accept and agree to be bound by these
              terms and conditions. If you do not agree to these terms, please do not use our
              services.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Service Description</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              {companyInfo.shortName} provides international shopping and shipping services, helping customers
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

            <h2 id="weight-policy" className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Weight & Pricing Variations Policy</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              As an international shopping and forwarding service, iWishBag provides weight estimates based on seller listings. 
              However, actual shipped weights often differ due to packaging requirements, protective materials, and merchant practices.
            </p>

            <div className="bg-blue-50 p-6 rounded-lg mb-8 border border-blue-200">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-blue-900 mb-2">Weight Increases Are Normal in International Shipping</h3>
                  <p className="text-blue-800 leading-relaxed">
                    Weight increases of 15-30% are common due to protective packaging, retail boxes, bubble wrap, 
                    and additional materials needed for safe international transport.
                  </p>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-medium text-gray-900 mb-4">Our Weight Verification Process</h3>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="p-6 bg-gray-50 rounded-lg">
                <h4 className="text-lg font-medium text-gray-900 mb-3">When Your Items Arrive at Our Facility</h4>
                <ul className="space-y-2 text-gray-700">
                  <li>• Professional digital scale verification</li>
                  <li>• WhatsApp/SMS notification within 2-4 hours</li>
                  <li>• Detailed cost breakdown provided</li>
                  <li>• Photos of packaging included</li>
                  <li>• Transparent documentation process</li>
                </ul>
              </div>
              
              <div className="p-6 bg-gray-50 rounded-lg">
                <h4 className="text-lg font-medium text-gray-900 mb-3">Your Response Options</h4>
                <ul className="space-y-2 text-gray-700">
                  <li>• 48-hour response window provided</li>
                  <li>• Approve additional shipping costs</li>
                  <li>• Request repackaging to reduce weight</li>
                  <li>• Discuss alternative solutions</li>
                  <li>• Customer service consultation available</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-medium text-gray-900 mb-4">Real Weight Increase Examples from Our Operations</h3>
            <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-3 text-left font-medium text-gray-900">Product Category</th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-medium text-gray-900">Seller Listed Weight</th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-medium text-gray-900">Actual Shipped Weight</th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-medium text-gray-900">Primary Reason</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-4 py-3 text-gray-700">Electronics (iPhone, headphones)</td>
                    <td className="border border-gray-200 px-4 py-3 text-gray-700">0.4 kg</td>
                    <td className="border border-gray-200 px-4 py-3 text-gray-700">0.6 kg (+50%)</td>
                    <td className="border border-gray-200 px-4 py-3 text-gray-700">Original Apple box + bubble wrap</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 text-gray-700">Clothing (shirts, jeans)</td>
                    <td className="border border-gray-200 px-4 py-3 text-gray-700">1.0 kg</td>
                    <td className="border border-gray-200 px-4 py-3 text-gray-700">1.3 kg (+30%)</td>
                    <td className="border border-gray-200 px-4 py-3 text-gray-700">Brand tags, hangers, tissue paper</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-3 text-gray-700">Books/Media</td>
                    <td className="border border-gray-200 px-4 py-3 text-gray-700">1.8 kg</td>
                    <td className="border border-gray-200 px-4 py-3 text-gray-700">2.2 kg (+22%)</td>
                    <td className="border border-gray-200 px-4 py-3 text-gray-700">Protective cardboard + Amazon packaging</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 text-gray-700">Shoes/Accessories</td>
                    <td className="border border-gray-200 px-4 py-3 text-gray-700">0.8 kg</td>
                    <td className="border border-gray-200 px-4 py-3 text-gray-700">1.1 kg (+38%)</td>
                    <td className="border border-gray-200 px-4 py-3 text-gray-700">Brand shoe box + stuffing materials</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-medium text-gray-900 mb-4">Additional Cost Calculation</h3>
            <div className="bg-gray-50 p-6 rounded-lg mb-8">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Shipping Rate</h4>
                  <p className="text-gray-700 text-sm">Additional shipping charged at actual carrier rates</p>
                  <p className="text-blue-700 text-xs font-medium">India: ~₹400-600/kg</p>
                  <p className="text-blue-700 text-xs font-medium">Nepal: ~NPR 800-1200/kg</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Customs & Duties</h4>
                  <p className="text-gray-700 text-sm">Applied per destination country regulations</p>
                  <p className="text-blue-700 text-xs font-medium">India: 0-42% depending on category</p>
                  <p className="text-blue-700 text-xs font-medium">Nepal: 5-80% depending on category</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Processing Fee</h4>
                  <p className="text-gray-700 text-sm">iWishBag handling fee for additional processing</p>
                  <p className="text-blue-700 text-xs font-medium">Fixed at 5% of additional charges</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg mb-8 border border-green-200">
              <h3 className="text-lg font-medium text-green-900 mb-3">Customer Protection & Dispute Resolution</h3>
              <p className="text-green-800 leading-relaxed mb-4">
                iWishBag is committed to fair and transparent pricing. If you believe a weight increase is unreasonable 
                or have concerns about additional charges, our customer service team will review your case within 24 hours.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-green-900 mb-2">What We Provide</h4>
                  <ul className="text-green-800 text-sm space-y-1">
                    <li>• Digital scale photos and readings</li>
                    <li>• Packaging breakdown documentation</li>
                    <li>• Alternative repackaging options</li>
                    <li>• Third-party weight verification if needed</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-green-900 mb-2">Resolution Options</h4>
                  <ul className="text-green-800 text-sm space-y-1">
                    <li>• Weight verification adjustment</li>
                    <li>• Repackaging to reduce weight</li>
                    <li>• Partial cost sharing in genuine disputes</li>
                    <li>• Escalation to senior management</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg mb-12 border border-blue-200">
              <h3 className="text-lg font-medium text-blue-900 mb-3">Contact Customer Support</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">India Support</h4>
                  <p className="text-blue-800 text-sm">📞 +91 9971093202</p>
                  <p className="text-blue-800 text-sm">📧 support@iwishbag.com</p>
                  <p className="text-blue-800 text-xs">Mon-Fri 10AM-5PM IST</p>
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">Nepal Support</h4>
                  <p className="text-blue-800 text-sm">📞 +977 9813108332</p>
                  <p className="text-blue-800 text-sm">📧 support@iwishbag.com</p>
                  <p className="text-blue-800 text-xs">Sun-Fri 10AM-5PM NPT</p>
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">WhatsApp</h4>
                  <p className="text-blue-800 text-sm">💬 Same numbers as phone</p>
                  <p className="text-blue-800 text-sm">📱 Fastest response time</p>
                  <p className="text-blue-800 text-xs">Photos & documents supported</p>
                </div>
              </div>
            </div>

            <h2 id="shipping" className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Customs and Duties</h2>
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
              These terms are governed by the laws of {companyInfo.jurisdiction}. Any disputes will be
              resolved through binding arbitration.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Contact Information</h2>
            <div className="bg-gray-50 p-6 rounded-lg mb-8">
              <p className="text-gray-700 leading-relaxed">
                For questions about these terms, please contact us at:
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-gray-700">
                  <strong>Email:</strong> {companyInfo.contact.legalEmail}
                </p>
                <p className="text-gray-700">
                  <strong>Address:</strong> {companyInfo.companyName}, {companyInfo.address}
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
