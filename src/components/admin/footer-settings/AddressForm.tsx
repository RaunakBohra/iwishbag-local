import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AddressFormProps {
  formData: {
    primary_address: string;
    secondary_address: string;
  };
  handleInputChange: (field: string, value: string) => void;
}

export const AddressForm = ({ formData, handleInputChange }: AddressFormProps) => {
  return (
    <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
      <CardHeader>
        <CardTitle className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Address Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="primary_address">Primary Address</Label>
          <Textarea
            id="primary_address"
            value={formData.primary_address}
            onChange={(e) => handleInputChange('primary_address', e.target.value)}
            rows={3}
            className="backdrop-blur-xl bg-white/20 border-white/20 focus:border-primary/50"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="secondary_address">Secondary Address</Label>
          <Textarea
            id="secondary_address"
            value={formData.secondary_address}
            onChange={(e) => handleInputChange('secondary_address', e.target.value)}
            rows={3}
            className="backdrop-blur-xl bg-white/20 border-white/20 focus:border-primary/50"
          />
        </div>
      </CardContent>
    </Card>
  );
};

