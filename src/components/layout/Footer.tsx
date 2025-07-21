import { Link } from 'react-router-dom';
import { Twitter, Facebook, Instagram, Linkedin } from 'lucide-react';
import { cn } from '@/lib/design-system';

const Footer = () => {
  // Default footer settings
  const homePageSettings = {
    website_logo_url:
      'https://res.cloudinary.com/dto2xew5c/image/upload/v1749986458/iWishBag-india-logo_p7nram.png',
    company_name: 'iwishBag',
    company_description: 'Shop the world, delivered to your doorstep.',
    social_twitter: 'https://twitter.com/iwishbag',
    social_facebook: 'https://facebook.com/iwishbag',
    social_instagram: 'https://instagram.com/iwishbag',
    social_linkedin: 'https://linkedin.com/company/iwishbag',
  };

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="container py-6 md:py-8">
        {/* Logo & Description Centered */}
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          {homePageSettings?.website_logo_url ? (
            <img
              src={homePageSettings.website_logo_url}
              alt="Logo"
              className="h-8 w-auto object-contain mb-1"
            />
          ) : (
            <span className="font-semibold text-lg mb-1 text-gray-900">
              {homePageSettings?.company_name || 'WishBag'}
            </span>
          )}
          <p className="text-xs md:text-sm leading-relaxed line-clamp-2 mb-1 text-gray-600">
            {homePageSettings?.company_description || 'Shop the world, delivered to your doorstep.'}
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
            <Link to="/blog" className="text-gray-600 hover:text-teal-600 transition-colors mb-0.5">
              Blog
            </Link>
            <Link to="/contact" className="text-gray-600 hover:text-teal-600 transition-colors">
              Contact Us
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
              className="text-gray-600 hover:text-teal-600 transition-colors"
            >
              Cost Estimator
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
              {homePageSettings?.social_twitter && (
                <a
                  href={homePageSettings.social_twitter}
                  className="text-gray-600 hover:text-teal-600 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Twitter className="h-4 w-4 md:h-5 md:w-5" />
                </a>
              )}
              {homePageSettings?.social_facebook && (
                <a
                  href={homePageSettings.social_facebook}
                  className="text-gray-600 hover:text-teal-600 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Facebook className="h-4 w-4 md:h-5 md:w-5" />
                </a>
              )}
              {homePageSettings?.social_instagram && (
                <a
                  href={homePageSettings.social_instagram}
                  className="text-gray-600 hover:text-teal-600 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram className="h-4 w-4 md:h-5 md:w-5" />
                </a>
              )}
              {homePageSettings?.social_linkedin && (
                <a
                  href={homePageSettings.social_linkedin}
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
        {/* Copyright Section */}
        <div className="border-t border-gray-200 mt-6 pt-4 text-center">
          <p className="text-xs md:text-sm text-gray-500">
            © {new Date().getFullYear()} {homePageSettings?.company_name || 'WishBag'}. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
