
import { Link } from "react-router-dom";
import { ShoppingBag, Twitter, Facebook, Instagram, Linkedin, Phone, Mail, MapPin, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Footer = () => {
  const { data: footerSettings } = useQuery({
    queryKey: ['footer-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('footer_settings')
        .select('*')
        .single();
      
      if (error) {
        console.error('Error fetching footer settings:', error);
        return null;
      }
      return data;
    },
  });

  return (
    <footer className="border-t bg-background">
      <div className="container py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company & contact info */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">
                {footerSettings?.company_name || "WishBag"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {footerSettings?.company_description || "Shop the world, delivered to your doorstep."}
            </p>

            {/* Emails */}
            {(footerSettings?.primary_email || footerSettings?.support_email) && (
              <div className="flex items-start space-x-2">
                <Mail className="w-4 h-4 text-primary mt-0.5" />
                <div>
                  {footerSettings?.primary_email && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Email:</span> {footerSettings.primary_email}
                    </div>
                  )}
                  {footerSettings?.support_email && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Support:</span> {footerSettings.support_email}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Phones */}
            {(footerSettings?.primary_phone || footerSettings?.secondary_phone) && (
              <div className="flex items-start space-x-2">
                <Phone className="w-4 h-4 text-primary mt-0.5" />
                <div>
                  {footerSettings?.primary_phone && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Phone:</span> {footerSettings.primary_phone}
                    </div>
                  )}
                  {footerSettings?.secondary_phone && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Alt:</span> {footerSettings.secondary_phone}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Addresses */}
            {(footerSettings?.primary_address || footerSettings?.secondary_address) && (
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                <div>
                  {footerSettings?.primary_address && (
                    <div className="text-xs text-muted-foreground whitespace-pre-line">
                      <span className="font-medium">Address:</span> {footerSettings.primary_address}
                    </div>
                  )}
                  {footerSettings?.secondary_address && (
                    <div className="text-xs text-muted-foreground whitespace-pre-line">
                      <span className="font-medium">Office 2:</span> {footerSettings.secondary_address}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Business hours */}
            {footerSettings?.business_hours && (
              <div className="flex items-start space-x-2">
                <Clock className="w-4 h-4 text-primary mt-0.5" />
                <span className="text-xs text-muted-foreground whitespace-pre-line">{footerSettings.business_hours}</span>
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
              {footerSettings?.social_twitter && (
                <a href={footerSettings.social_twitter} className="text-muted-foreground hover:text-primary" target="_blank" rel="noopener noreferrer">
                  <Twitter className="h-5 w-5" />
                </a>
              )}
              {footerSettings?.social_facebook && (
                <a href={footerSettings.social_facebook} className="text-muted-foreground hover:text-primary" target="_blank" rel="noopener noreferrer">
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {footerSettings?.social_instagram && (
                <a href={footerSettings.social_instagram} className="text-muted-foreground hover:text-primary" target="_blank" rel="noopener noreferrer">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {footerSettings?.social_linkedin && (
                <a href={footerSettings.social_linkedin} className="text-muted-foreground hover:text-primary" target="_blank" rel="noopener noreferrer">
                  <Linkedin className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        </div>
        
        <div className="border-t mt-8 pt-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {footerSettings?.company_name || "WishBag"}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
