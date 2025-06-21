import { useHomePageSettings } from "@/hooks/useHomePageSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { CompanyInfoForm } from "./footer-settings/CompanyInfoForm";
import { ContactInfoForm } from "./footer-settings/ContactInfoForm";
import { AddressForm } from "./footer-settings/AddressForm";
import { SocialLinksForm } from "./footer-settings/SocialLinksForm";

export const HomePageSettings = () => {
  const { 
    isLoading,
    formData,
    isUpdating,
    handleInputChange,
    handleSubmit 
  } = useHomePageSettings();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Home Page Settings</h1>
        <p className="text-muted-foreground">
          Manage your company information displayed in the footer and contact pages
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <CompanyInfoForm formData={formData} handleInputChange={handleInputChange} />
          <ContactInfoForm formData={formData} handleInputChange={handleInputChange} />
        </div>

        <AddressForm formData={formData} handleInputChange={handleInputChange} />
        <SocialLinksForm formData={formData} handleInputChange={handleInputChange} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle>Website Logo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website_logo_url">Website Logo URL</Label>
                <Input
                  id="website_logo_url"
                  type="url"
                  value={formData.website_logo_url}
                  onChange={e => handleInputChange('website_logo_url', e.target.value)}
                  placeholder="https://your-logo-url.com/logo.png"
                />
                {formData.website_logo_url && (
                  <div className="mt-2">
                    <span className="block text-xs text-muted-foreground mb-1">Preview:</span>
                    <div className="backdrop-blur-xl bg-white/20 border border-white/20 rounded-lg p-2">
                      <img src={formData.website_logo_url} alt="Logo Preview" className="h-16 object-contain" />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle>Hero Banner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hero_banner_url">Hero Banner Image URL</Label>
                <Input
                  id="hero_banner_url"
                  type="url"
                  value={formData.hero_banner_url || ''}
                  onChange={e => handleInputChange('hero_banner_url', e.target.value)}
                  placeholder="https://your-banner-url.com/banner.jpg"
                />
                {formData.hero_banner_url && (
                  <div className="mt-2">
                    <span className="block text-xs text-muted-foreground mb-1">Preview:</span>
                    <div className="backdrop-blur-xl bg-white/20 border border-white/20 rounded-lg p-2">
                      <img src={formData.hero_banner_url} alt="Hero Banner Preview" className="h-32 w-full object-cover rounded" />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle>Hero Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hero_headline">Hero Headline</Label>
                <Input
                  id="hero_headline"
                  type="text"
                  value={formData.hero_headline || ''}
                  onChange={e => handleInputChange('hero_headline', e.target.value)}
                  placeholder="Your main headline here"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hero_subheadline">Hero Subheadline</Label>
                <Input
                  id="hero_subheadline"
                  type="text"
                  value={formData.hero_subheadline || ''}
                  onChange={e => handleInputChange('hero_subheadline', e.target.value)}
                  placeholder="A supporting subheadline here"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hero_cta_text">Hero CTA Text</Label>
                <Input
                  id="hero_cta_text"
                  type="text"
                  value={formData.hero_cta_text || ''}
                  onChange={e => handleInputChange('hero_cta_text', e.target.value)}
                  placeholder="Get Started"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hero_cta_link">Hero CTA Link</Label>
                <Input
                  id="hero_cta_link"
                  type="url"
                  value={formData.hero_cta_link || ''}
                  onChange={e => handleInputChange('hero_cta_link', e.target.value)}
                  placeholder="https://your-link.com"
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* How It Works Steps (JSON) */}
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
          <CardHeader>
            <CardTitle>How It Works Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="how_it_works_steps">How It Works Steps (JSON)</Label>
              <Textarea
                id="how_it_works_steps"
                className="font-mono"
                rows={4}
                value={formData.how_it_works_steps ? JSON.stringify(formData.how_it_works_steps, null, 2) : ''}
                onChange={e => {
                  try {
                    const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                    handleInputChange('how_it_works_steps', parsed);
                  } catch (error) {
                    // Keep the string value if JSON is invalid
                    console.warn('Invalid JSON for how_it_works_steps:', error);
                  }
                }}
                placeholder='{"step1": "Sign up", "step2": "Shop", "step3": "Receive"}'
              />
              <span className="block text-xs text-muted-foreground">Enter steps as a JSON object.</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Value Props (JSON) */}
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
          <CardHeader>
            <CardTitle>Value Propositions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="value_props">Value Propositions (JSON)</Label>
              <Textarea
                id="value_props"
                className="font-mono"
                rows={3}
                value={formData.value_props ? JSON.stringify(formData.value_props, null, 2) : ''}
                onChange={e => {
                  try {
                    const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                    handleInputChange('value_props', parsed);
                  } catch (error) {
                    // Keep the string value if JSON is invalid
                    console.warn('Invalid JSON for value_props:', error);
                  }
                }}
                placeholder='{"value1": "Fast Shipping", "value2": "Secure Payments", "value3": "Wide Selection"}'
              />
              <span className="block text-xs text-muted-foreground">Enter value props as a JSON object.</span>
            </div>
          </CardContent>
        </Card>

        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          disabled={isUpdating}
        >
          {isUpdating && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          Save Settings
        </Button>
      </form>
    </div>
  );
};

