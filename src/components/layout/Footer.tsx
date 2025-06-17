import { Link } from "react-router-dom";
import { ShoppingBag, Twitter, Facebook, Instagram, Linkedin, Phone, Mail, MapPin, Clock } from "lucide-react";
import { useHomePageSettings } from "@/hooks/useHomePageSettings";

const Footer = () => {
  const { formData: homePageSettings } = useHomePageSettings();

  return (
    <footer className="border-t bg-background">
      <div className="container py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company & contact info */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center gap-2 mb-4">
              {homePageSettings?.website_logo_url ? (
                <img src={homePageSettings.website_logo_url} alt="Logo" className="h-10 w-auto object-contain" />
              ) : (
                <span className="font-bold text-xl">{homePageSettings?.company_name || "WishBag"}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {homePageSettings?.company_description || "Shop the world, delivered to your doorstep."}
            </p>

            {/* Emails */}
            {(homePageSettings?.primary_email || homePageSettings?.support_email) && (
              <div className="flex items-start space-x-2">
                <Mail className="w-4 h-4 text-primary mt-0.5" />
                <div>
                  {homePageSettings?.primary_email && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Email:</span> {homePageSettings.primary_email}
                    </div>
                  )}
                  {homePageSettings?.support_email && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Support:</span> {homePageSettings.support_email}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Phones */}
            {(homePageSettings?.primary_phone || homePageSettings?.secondary_phone) && (
              <div className="flex items-start space-x-2">
                <Phone className="w-4 h-4 text-primary mt-0.5" />
                <div>
                  {homePageSettings?.primary_phone && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Phone:</span> {homePageSettings.primary_phone}
                    </div>
                  )}
                  {homePageSettings?.secondary_phone && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Alt:</span> {homePageSettings.secondary_phone}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Addresses */}
            {(homePageSettings?.primary_address || homePageSettings?.secondary_address) && (
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                <div>
                  {homePageSettings?.primary_address && (
                    <div className="text-xs text-muted-foreground whitespace-pre-line">
                      <span className="font-medium">Address:</span> {homePageSettings.primary_address}
                    </div>
                  )}
                  {homePageSettings?.secondary_address && (
                    <div className="text-xs text-muted-foreground whitespace-pre-line">
                      <span className="font-medium">Office 2:</span> {homePageSettings.secondary_address}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Business hours */}
            {homePageSettings?.business_hours && (
              <div className="flex items-start space-x-2">
                <Clock className="w-4 h-4 text-primary mt-0.5" />
                <span className="text-xs text-muted-foreground whitespace-pre-line">{homePageSettings.business_hours}</span>
              </div>
            )}
          </div>
          
          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <div className="flex flex-col space-y-2">
              <Link to="/about" className="text-sm text-muted-foreground hover:text-primary">
                About Us
              </Link>
              <Link to="/blog" className="text-sm text-muted-foreground hover:text-primary">
                Blog
              </Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary">
                Contact Us
              </Link>
            </div>
          </div>
          
          {/* Services */}
          <div>
            <h3 className="font-semibold mb-4">Services</h3>
            <div className="flex flex-col space-y-2">
              <Link to="/quote" className="text-sm text-muted-foreground hover:text-primary">
                Get Quote
              </Link>
              <Link to="/#cost-estimator" className="text-sm text-muted-foreground hover:text-primary">
                Cost Estimator
              </Link>
            </div>
          </div>
          
          {/* Social */}
          <div>
            <h3 className="font-semibold mb-4">Follow Us</h3>
            <div className="flex items-center space-x-4">
              {homePageSettings?.social_twitter && (
                <a href={homePageSettings.social_twitter} className="text-muted-foreground hover:text-primary" target="_blank" rel="noopener noreferrer">
                  <Twitter className="h-5 w-5" />
                </a>
              )}
              {homePageSettings?.social_facebook && (
                <a href={homePageSettings.social_facebook} className="text-muted-foreground hover:text-primary" target="_blank" rel="noopener noreferrer">
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {homePageSettings?.social_instagram && (
                <a href={homePageSettings.social_instagram} className="text-muted-foreground hover:text-primary" target="_blank" rel="noopener noreferrer">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {homePageSettings?.social_linkedin && (
                <a href={homePageSettings.social_linkedin} className="text-muted-foreground hover:text-primary" target="_blank" rel="noopener noreferrer">
                  <Linkedin className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        </div>
        
        <div className="border-t mt-8 pt-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {homePageSettings?.company_name || "WishBag"}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
