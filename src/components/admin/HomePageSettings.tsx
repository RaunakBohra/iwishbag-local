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

