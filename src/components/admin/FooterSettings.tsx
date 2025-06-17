
import { useFooterSettings } from "@/hooks/useFooterSettings";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { CompanyInfoForm } from "./footer-settings/CompanyInfoForm";
import { ContactInfoForm } from "./footer-settings/ContactInfoForm";
import { AddressForm } from "./footer-settings/AddressForm";
import { SocialLinksForm } from "./footer-settings/SocialLinksForm";

export const FooterSettings = () => {
  const { 
    isLoading,
    formData,
    isUpdating,
    handleInputChange,
    handleSubmit 
  } = useFooterSettings();

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
        <h1 className="text-3xl font-bold">Footer Settings</h1>
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

