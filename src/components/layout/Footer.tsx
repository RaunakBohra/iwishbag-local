import { Link } from 'react-router-dom';
import { Twitter, Facebook, Instagram, Linkedin } from 'lucide-react';
import { cn } from '@/lib/design-system';
import { useCountryDetection } from '@/hooks/useCountryDetection';
import { getCompanyInfo, getRegistrationDetails } from '@/config/companyInfo';

const Footer = () => {
  const { countryCode } = useCountryDetection();
  
  // Get country-specific company info
  const companyInfo = getCompanyInfo(countryCode);
  const registrationDetails = getRegistrationDetails(countryCode);

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="container py-6 md:py-8">
        {/* Logo & Description Centered */}
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          {companyInfo.logoUrl ? (
            <img
              src={companyInfo.logoUrl}
              alt={companyInfo.shortName}
              className="h-8 w-auto object-contain mb-1"
            />
          ) : (
            <span className="font-semibold text-lg mb-1 text-gray-900">
              {companyInfo.shortName}
            </span>
          )}
          <p className="text-xs md:text-sm leading-relaxed line-clamp-2 mb-1 text-gray-600">
            {companyInfo.tagline}
          </p>
        </div>
        {/* Divider */}
        <div className="my-3 border-t border-gray-200 w-full" />
        {/* Centered Row: Company | Services | Legal | Social */}
        <div className="flex flex-row justify-center items-start gap-6 md:gap-12 text-xs md:text-sm w-full">
          {/* Company */}
          <div className="flex flex-col items-center min-w-[80px]">
            <span className="font-semibold mb-1 text-gray-900">Company</span>
            <Link
              to="/about"
              className="text-gray-600 hover:text-teal-600 transition-colors mb-0.5"
            >
              About Us
            </Link>
            <Link to="/blog" className="text-gray-600 hover:text-teal-600 transition-colors">
              Blog
            </Link>
          </div>
          {/* Services */}
          <div className="flex flex-col items-center min-w-[80px]">
            <span className="font-semibold mb-1 text-gray-900">Services</span>
            <Link
              to="/quote"
              className="text-gray-600 hover:text-teal-600 transition-colors mb-0.5"
            >
              Quote Request
            </Link>
            <Link
              to="/track"
              className="text-gray-600 hover:text-teal-600 transition-colors mb-0.5"
            >
              Track Order
            </Link>
            <Link
              to="/cost-estimator"
              className="text-gray-600 hover:text-teal-600 transition-colors mb-0.5"
            >
              Cost Estimator
            </Link>
            <Link
              to="/help"
              className="text-gray-600 hover:text-teal-600 transition-colors mb-0.5"
            >
              Help Center
            </Link>
          </div>
          {/* Legal */}
          <div className="flex flex-col items-center min-w-[80px]">
            <span className="font-semibold mb-1 text-gray-900">Legal</span>
            <Link
              to="/privacy-policy"
              className="text-gray-600 hover:text-teal-600 transition-colors mb-0.5"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms-conditions"
              className="text-gray-600 hover:text-teal-600 transition-colors mb-0.5"
            >
              Terms & Conditions
            </Link>
            <Link to="/returns" className="text-gray-600 hover:text-teal-600 transition-colors">
              Returns & Refunds
            </Link>
          </div>
          {/* Social */}
          <div className="flex flex-col items-center min-w-[80px]">
            <span className="font-semibold mb-1 text-gray-900">Follow</span>
            <div className="flex space-x-3 mt-1">
              {companyInfo.socialMedia.twitter && (
                <a
                  href={companyInfo.socialMedia.twitter}
                  className="text-gray-600 hover:text-teal-600 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Twitter className="h-4 w-4 md:h-5 md:w-5" />
                </a>
              )}
              {companyInfo.socialMedia.facebook && (
                <a
                  href={companyInfo.socialMedia.facebook}
                  className="text-gray-600 hover:text-teal-600 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Facebook className="h-4 w-4 md:h-5 md:w-5" />
                </a>
              )}
              {companyInfo.socialMedia.instagram && (
                <a
                  href={companyInfo.socialMedia.instagram}
                  className="text-gray-600 hover:text-teal-600 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram className="h-4 w-4 md:h-5 md:w-5" />
                </a>
              )}
              {companyInfo.socialMedia.linkedin && (
                <a
                  href={companyInfo.socialMedia.linkedin}
                  className="text-gray-600 hover:text-teal-600 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Linkedin className="h-4 w-4 md:h-5 md:w-5" />
                </a>
              )}
            </div>
          </div>
        </div>
        
        {/* Payment Methods - Country Specific */}
        <div className="flex justify-center items-center gap-4 mt-6 pt-6 border-t border-gray-200">
          <span className="text-xs text-gray-500">We accept:</span>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {countryCode === 'IN' ? (
              <>
                {/* India-specific payment methods */}
                <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium" title="Visa">
                  VISA
                </div>
                <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium" title="Mastercard">
                  Mastercard
                </div>
                <div className="bg-orange-600 text-white px-2 py-1 rounded text-xs font-medium" title="UPI">
                  UPI
                </div>
                <div className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600" title="Bank Transfer">
                  Bank Transfer
                </div>
                <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium" title="PayPal">
                  PayPal
                </div>
              </>
            ) : (
              <>
                {/* Default payment methods for other countries */}
                <div className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600" title="Bank Transfer">
                  Bank Transfer
                </div>
                <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium" title="Visa">
                  VISA
                </div>
                <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium" title="Mastercard">
                  MC
                </div>
                <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium" title="PayU">
                  PayU
                </div>
              </>
            )}
          </div>
        </div>

        {/* Copyright Section with Company Info */}
        <div className="border-t border-gray-200 mt-6 pt-4 text-center">
          <p className="text-xs md:text-sm text-gray-500">
            © {new Date().getFullYear()} {companyInfo.companyName}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {companyInfo.address}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
