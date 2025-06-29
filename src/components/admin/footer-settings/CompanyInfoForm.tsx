import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CompanyInfoFormProps {
  formData: {
    company_name: string;
    company_description: string;
    business_hours: string;
  };
  handleInputChange: (field: string, value: string) => void;
}

export const CompanyInfoForm = ({ formData, handleInputChange }: CompanyInfoFormProps) => {
  return (
    <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
      <CardHeader>
        <CardTitle className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Company Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company_name">Company Name</Label>
          <Input
            id="company_name"
            value={formData.company_name}
            onChange={(e) => handleInputChange('company_name', e.target.value)}
            className="backdrop-blur-xl bg-white/20 border-white/20 focus:border-primary/50"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="company_description">Company Description</Label>
          <Textarea
            id="company_description"
            value={formData.company_description}
            onChange={(e) => handleInputChange('company_description', e.target.value)}
            rows={3}
            className="backdrop-blur-xl bg-white/20 border-white/20 focus:border-primary/50"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="business_hours">Business Hours</Label>
          <Textarea
            id="business_hours"
            value={formData.business_hours}
            onChange={(e) => handleInputChange('business_hours', e.target.value)}
            rows={2}
            className="backdrop-blur-xl bg-white/20 border-white/20 focus:border-primary/50"
          />
        </div>
      </CardContent>
    </Card>
  );
};

