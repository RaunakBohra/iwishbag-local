import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ContactInfoFormProps {
  formData: {
    primary_email: string;
    primary_phone: string;
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
          <Label htmlFor="primary_email">Contact Email</Label>
          <Input
            id="primary_email"
            type="email"
            value={formData.primary_email}
            onChange={(e) => handleInputChange('primary_email', e.target.value)}
            className="backdrop-blur-xl bg-white/20 border-white/20 focus:border-primary/50"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="primary_phone">Contact Phone</Label>
          <Input
            id="primary_phone"
            type="tel"
            value={formData.primary_phone}
            onChange={(e) => handleInputChange('primary_phone', e.target.value)}
            className="backdrop-blur-xl bg-white/20 border-white/20 focus:border-primary/50"
          />
        </div>
      </CardContent>
    </Card>
  );
};

