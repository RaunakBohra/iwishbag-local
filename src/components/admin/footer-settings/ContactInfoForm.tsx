import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ContactInfoFormProps {
  formData: {
    contact_email: string;
    contact_phone: string;
    contact_website: string;
  };
  handleInputChange: (field: string, value: string) => void;
}

export const ContactInfoForm = ({ formData, handleInputChange }: ContactInfoFormProps) => {
  return (
    <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
      <CardHeader>
        <CardTitle className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Contact Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="contact_email">Contact Email</Label>
          <Input
            id="contact_email"
            type="email"
            value={formData.contact_email}
            onChange={(e) => handleInputChange('contact_email', e.target.value)}
            className="backdrop-blur-xl bg-white/20 border-white/20 focus:border-primary/50"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="contact_phone">Contact Phone</Label>
          <Input
            id="contact_phone"
            type="tel"
            value={formData.contact_phone}
            onChange={(e) => handleInputChange('contact_phone', e.target.value)}
            className="backdrop-blur-xl bg-white/20 border-white/20 focus:border-primary/50"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="contact_website">Contact Website</Label>
          <Input
            id="contact_website"
            type="url"
            value={formData.contact_website}
            onChange={(e) => handleInputChange('contact_website', e.target.value)}
            className="backdrop-blur-xl bg-white/20 border-white/20 focus:border-primary/50"
          />
        </div>
      </CardContent>
    </Card>
  );
};

