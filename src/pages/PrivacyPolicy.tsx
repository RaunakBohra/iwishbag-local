import { useEffect } from 'react';
import { H1, H2, H3, Body, BodyLarge } from '@/components/ui/typography';
import { useCountryDetection } from '@/hooks/useCountryDetection';
import { getCompanyInfo } from '@/config/companyInfo';

const PrivacyPolicy = () => {
  const { countryCode } = useCountryDetection();
  const companyInfo = getCompanyInfo(countryCode);
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-4xl font-semibold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Your privacy is important to us. This policy explains how we collect, use, and protect
              your information.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="prose prose-gray max-w-none">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">
              Information We Collect
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              We collect information you provide directly to us when you create an account, make a
              purchase, or contact us for support.
            </p>

            <h3 className="text-xl font-medium text-gray-900 mb-4">Personal Information</h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              This includes your name, email address, phone number, shipping address, and payment
              information.
            </p>

            <h3 className="text-xl font-medium text-gray-900 mb-4">Usage Information</h3>
            <p className="text-gray-600 mb-12 leading-relaxed">
              We collect information about how you use our service, including pages visited,
              features used, and actions taken.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">
              How We Use Your Information
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              We use the information we collect to provide, maintain, and improve our services.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <div className="p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Service Delivery</h3>
                <p className="text-gray-600 leading-relaxed">
                  Process orders, arrange shipping, and provide customer support.
                </p>
              </div>

              <div className="p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Communication</h3>
                <p className="text-gray-600 leading-relaxed">
                  Send you order updates, newsletters, and important service announcements.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Information Sharing</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We may
              share information in the following situations:
            </p>

            <div className="bg-gray-50 p-6 rounded-lg mb-12">
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Service Providers:</strong> Trusted partners who help us deliver our
                    services, such as payment processors and shipping companies.
                  </p>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Legal Requirements:</strong> When required by law or to protect our
                    rights and the safety of our users.
                  </p>
                </li>
                <li className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Business Transfers:</strong> In connection with a merger, acquisition,
                    or sale of assets.
                  </p>
                </li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Data Security</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              We implement appropriate security measures to protect your personal information
              against unauthorized access, alteration, disclosure, or destruction.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Encryption</h3>
                <p className="text-gray-600">All data is encrypted in transit and at rest.</p>
              </div>

              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Access Controls</h3>
                <p className="text-gray-600">Strict access controls and regular security audits.</p>
              </div>

              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Staff Training</h3>
                <p className="text-gray-600">
                  Regular privacy and security training for all staff.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Your Rights</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              You have the right to access, update, or delete your personal information. You can
              also opt out of marketing communications at any time.
            </p>

            <div className="bg-teal-50 border border-teal-200 p-6 rounded-lg mb-12">
              <p className="text-gray-700 leading-relaxed">
                <strong>Contact us</strong> at {companyInfo.contact.privacyEmail} if you have any questions about
                your privacy rights or want to exercise any of these rights.
              </p>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">
              International Transfers
            </h2>
            <p className="text-gray-600 mb-12 leading-relaxed">
              As we serve customers globally, your information may be transferred to and processed
              in countries other than your own. We ensure appropriate safeguards are in place.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">
              Cookies and Tracking
            </h2>
            <p className="text-gray-600 mb-12 leading-relaxed">
              We use cookies and similar technologies to improve your experience, analyze usage, and
              deliver personalized content.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">
              Changes to This Policy
            </h2>
            <p className="text-gray-600 mb-12 leading-relaxed">
              We may update this privacy policy from time to time. We will notify you of any
              material changes by posting the new policy on this page.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-12">Contact Us</h2>
            <div className="bg-gray-50 p-6 rounded-lg mb-8">
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about this privacy policy, please contact us at:
              </p>
              <div className="space-y-2">
                <p className="text-gray-700">
                  <strong>Email:</strong> {companyInfo.contact.privacyEmail}
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

export default PrivacyPolicy;
