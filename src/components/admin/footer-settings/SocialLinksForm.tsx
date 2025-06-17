
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SocialLinksFormProps {
  formData: {
    social_twitter: string;
    social_facebook: string;
    social_instagram: string;
    social_linkedin: string;
  };
  handleInputChange: (field: string, value: string) => void;
}

export const SocialLinksForm = ({ formData, handleInputChange }: SocialLinksFormProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Media Links</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="social_twitter">Twitter URL</Label>
          <Input
            id="social_twitter"
            value={formData.social_twitter}
            onChange={(e) => handleInputChange('social_twitter', e.target.value)}
            placeholder="https://twitter.com/yourcompany"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="social_facebook">Facebook URL</Label>
          <Input
            id="social_facebook"
            value={formData.social_facebook}
            onChange={(e) => handleInputChange('social_facebook', e.target.value)}
            placeholder="https://facebook.com/yourcompany"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="social_instagram">Instagram URL</Label>
          <Input
            id="social_instagram"
            value={formData.social_instagram}
            onChange={(e) => handleInputChange('social_instagram', e.target.value)}
            placeholder="https://instagram.com/yourcompany"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="social_linkedin">LinkedIn URL</Label>
          <Input
            id="social_linkedin"
            value={formData.social_linkedin}
            onChange={(e) => handleInputChange('social_linkedin', e.target.value)}
            placeholder="https://linkedin.com/company/yourcompany"
          />
        </div>
      </CardContent>
    </Card>
  );
};

