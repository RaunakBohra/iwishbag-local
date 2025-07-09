import { Link } from "react-router-dom";
import { ShoppingBag, Twitter, Facebook, Instagram, Linkedin, Phone, Mail, MapPin, Clock } from "lucide-react";

const Footer = () => {
  // Default footer settings
  const homePageSettings = {
    website_logo_url: null,
    company_name: "iwishBag",
    company_description: "Shop the world, delivered to your doorstep.",
    social_twitter: "https://twitter.com/iwishbag",
    social_facebook: "https://facebook.com/iwishbag",
    social_instagram: "https://instagram.com/iwishbag",
    social_linkedin: "https://linkedin.com/company/iwishbag"
  };

  return (
    <footer className="border-t bg-card text-card-foreground">
      <div className="container py-6 md:py-8">
        {/* Logo & Description Centered */}
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          {homePageSettings?.website_logo_url ? (
            <img src={homePageSettings.website_logo_url} alt="Logo" className="h-8 w-auto object-contain mb-1" />
          ) : (
            <span className="font-bold text-lg mb-1">{homePageSettings?.company_name || "WishBag"}</span>
          )}
          <p className="text-xs md:text-sm leading-relaxed line-clamp-2 mb-1 text-muted-foreground">
            {homePageSettings?.company_description || "Shop the world, delivered to your doorstep."}
          </p>
        </div>
        {/* Divider */}
        <div className="my-3 border-t border-border w-full" />
        {/* Centered Row: Company | Services | Social */}
        <div className="flex flex-row justify-center items-start gap-8 md:gap-16 text-xs md:text-sm w-full">
          {/* Company */}
          <div className="flex flex-col items-center min-w-[100px]">
            <span className="font-semibold mb-1">Company</span>
            <Link to="/about" className="hover:text-foreground/80 transition-colors mb-0.5">About Us</Link>
            <Link to="/blog" className="hover:text-foreground/80 transition-colors mb-0.5">Blog</Link>
            <Link to="/contact" className="hover:text-foreground/80 transition-colors">Contact Us</Link>
          </div>
          {/* Services */}
          <div className="flex flex-col items-center min-w-[100px]">
            <span className="font-semibold mb-1">Services</span>
            <Link to="/quote" className="hover:text-foreground/80 transition-colors mb-0.5">Quote Request</Link>
            <Link to="/#cost-estimator" className="hover:text-foreground/80 transition-colors">Cost Estimator</Link>
          </div>
          {/* Social */}
          <div className="flex flex-col items-center min-w-[100px]">
            <span className="font-semibold mb-1">Follow</span>
            <div className="flex space-x-4 md:space-x-3 mt-1">
              {homePageSettings?.social_twitter && (
                <a href={homePageSettings.social_twitter} className="hover:text-foreground/80 transition-colors" target="_blank" rel="noopener noreferrer">
                  <Twitter className="h-4 w-4 md:h-5 md:w-5" />
                </a>
              )}
              {homePageSettings?.social_facebook && (
                <a href={homePageSettings.social_facebook} className="hover:text-foreground/80 transition-colors" target="_blank" rel="noopener noreferrer">
                  <Facebook className="h-4 w-4 md:h-5 md:w-5" />
                </a>
              )}
              {homePageSettings?.social_instagram && (
                <a href={homePageSettings.social_instagram} className="hover:text-foreground/80 transition-colors" target="_blank" rel="noopener noreferrer">
                  <Instagram className="h-4 w-4 md:h-5 md:w-5" />
                </a>
              )}
              {homePageSettings?.social_linkedin && (
                <a href={homePageSettings.social_linkedin} className="hover:text-foreground/80 transition-colors" target="_blank" rel="noopener noreferrer">
                  <Linkedin className="h-4 w-4 md:h-5 md:w-5" />
                </a>
              )}
            </div>
          </div>
        </div>
        {/* Copyright Section */}
        <div className="border-t border-border mt-6 pt-4 text-center">
          <p className="text-xs md:text-sm text-muted-foreground">
            © {new Date().getFullYear()} {homePageSettings?.company_name || "WishBag"}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
