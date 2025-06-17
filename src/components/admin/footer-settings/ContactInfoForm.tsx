
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ContactInfoFormProps {
  formData: {
    primary_phone: string;
    secondary_phone: string;
    primary_email: string;
    support_email: string;
  };
  handleInputChange: (field: string, value: string) => void;
}

export const ContactInfoForm = ({ formData, handleInputChange }: ContactInfoFormProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="primary_phone">Primary Phone</Label>
          <Input
            id="primary_phone"
            value={formData.primary_phone}
            onChange={(e) => handleInputChange('primary_phone', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="secondary_phone">Secondary Phone</Label>
          <Input
            id="secondary_phone"
            value={formData.secondary_phone}
            onChange={(e) => handleInputChange('secondary_phone', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="primary_email">Primary Email</Label>
          <Input
            id="primary_email"
            type="email"
            value={formData.primary_email}
            onChange={(e) => handleInputChange('primary_email', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="support_email">Support Email</Label>
          <Input
            id="support_email"
            type="email"
            value={formData.support_email}
            onChange={(e) => handleInputChange('support_email', e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

