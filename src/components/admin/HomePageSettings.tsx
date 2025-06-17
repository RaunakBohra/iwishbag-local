import { useHomePageSettings } from "@/hooks/useHomePageSettings";
import { Button } from "@/components/ui/button";
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
        <h1 className="text-3xl font-bold">Home Page Settings</h1>
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
          <div>
            <label htmlFor="website_logo_url" className="block text-sm font-medium mb-1">Website Logo URL</label>
            <input
              id="website_logo_url"
              type="url"
              className="input input-bordered w-full"
              value={formData.website_logo_url}
              onChange={e => handleInputChange('website_logo_url', e.target.value)}
              placeholder="https://your-logo-url.com/logo.png"
            />
            {formData.website_logo_url && (
              <div className="mt-2">
                <span className="block text-xs text-muted-foreground mb-1">Preview:</span>
                <img src={formData.website_logo_url} alt="Logo Preview" className="h-16 object-contain bg-white border rounded p-2" />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="hero_banner_url" className="block text-sm font-medium mb-1">Hero Banner Image URL</label>
            <input
              id="hero_banner_url"
              type="url"
              className="input input-bordered w-full"
              value={formData.hero_banner_url || ''}
              onChange={e => handleInputChange('hero_banner_url', e.target.value)}
              placeholder="https://your-banner-url.com/banner.jpg"
            />
            {formData.hero_banner_url && (
              <div className="mt-2">
                <span className="block text-xs text-muted-foreground mb-1">Preview:</span>
                <img src={formData.hero_banner_url} alt="Hero Banner Preview" className="h-32 w-full object-cover bg-white border rounded p-2" />
              </div>
            )}
          </div>
          <div>
            <label htmlFor="hero_headline" className="block text-sm font-medium mb-1">Hero Headline</label>
            <input
              id="hero_headline"
              type="text"
              className="input input-bordered w-full"
              value={formData.hero_headline || ''}
              onChange={e => handleInputChange('hero_headline', e.target.value)}
              placeholder="Your main headline here"
            />
            <label htmlFor="hero_subheadline" className="block text-sm font-medium mb-1 mt-4">Hero Subheadline</label>
            <input
              id="hero_subheadline"
              type="text"
              className="input input-bordered w-full"
              value={formData.hero_subheadline || ''}
              onChange={e => handleInputChange('hero_subheadline', e.target.value)}
              placeholder="A supporting subheadline here"
            />
            <label htmlFor="hero_cta_text" className="block text-sm font-medium mb-1 mt-4">Hero CTA Text</label>
            <input
              id="hero_cta_text"
              type="text"
              className="input input-bordered w-full"
              value={formData.hero_cta_text || ''}
              onChange={e => handleInputChange('hero_cta_text', e.target.value)}
              placeholder="Get Started"
            />
            <label htmlFor="hero_cta_link" className="block text-sm font-medium mb-1 mt-4">Hero CTA Link</label>
            <input
              id="hero_cta_link"
              type="url"
              className="input input-bordered w-full"
              value={formData.hero_cta_link || ''}
              onChange={e => handleInputChange('hero_cta_link', e.target.value)}
              placeholder="https://your-link.com"
            />
          </div>
        </div>
        {/* How It Works Steps (JSON) */}
        <div>
          <label htmlFor="how_it_works_steps" className="block text-sm font-medium mb-1">How It Works Steps (JSON)</label>
          <textarea
            id="how_it_works_steps"
            className="input input-bordered w-full font-mono"
            rows={4}
            value={String(formData.how_it_works_steps || '')}
            onChange={e => handleInputChange('how_it_works_steps', e.target.value)}
            placeholder='[{"icon": "🚚", "title": "Step 1", "desc": "Describe step 1"}, ...]'
          />
          <span className="block text-xs text-muted-foreground mt-1">Enter steps as a JSON array.</span>
        </div>
        {/* Value Props (JSON) */}
        <div>
          <label htmlFor="value_props" className="block text-sm font-medium mb-1">Value Propositions (JSON)</label>
          <textarea
            id="value_props"
            className="input input-bordered w-full font-mono"
            rows={3}
            value={String(formData.value_props || '')}
            onChange={e => handleInputChange('value_props', e.target.value)}
            placeholder='[{"icon": "⭐", "title": "Best Prices", "desc": "We guarantee the best prices."}, ...]'
          />
          <span className="block text-xs text-muted-foreground mt-1">Enter value props as a JSON array.</span>
        </div>

        <Button 
          type="submit" 
          className="w-full"
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

