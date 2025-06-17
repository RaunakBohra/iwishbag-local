
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
    <Card>
      <CardHeader>
        <CardTitle>Office Addresses</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="primary_address">Primary Address</Label>
          <Textarea
            id="primary_address"
            value={formData.primary_address}
            onChange={(e) => handleInputChange('primary_address', e.target.value)}
            rows={2}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="secondary_address">Secondary Address</Label>
          <Textarea
            id="secondary_address"
            value={formData.secondary_address}
            onChange={(e) => handleInputChange('secondary_address', e.target.value)}
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );
};

